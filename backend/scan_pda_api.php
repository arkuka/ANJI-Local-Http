<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';

$action = '';
if (isset($_GET['action'])) {
    $action =$_GET['action'];
} else if (isset($_POST['action'])) {
    $action =$_POST['action'];
}

try {
    if (!function_exists('getPDOConnection')) {
        throw new Exception("getPDOConnection() function not found in config.php");
    }
    
    $pdo = getPDOConnection();

    if ($action === 'save') {$inputJson = file_get_contents('php://input');
        $input = json_decode($inputJson, true);
        if (!is_array($input)) {
            $input =$_POST;
        }

        $palletId = '';
        if (isset($input['PalletID'])) {
            $palletId = trim($input['PalletID']);
        }

        $trackingNum = '';
        if (isset($input['TrackingNum'])) {
            $trackingNum = trim($input['TrackingNum']);
        }

        $loadingListNum = '';
        if (isset($input['LoadingListNum'])) {
            $loadingListNum = trim($input['LoadingListNum']);
        }

        $userName = '';
        if (isset($input['UserName'])) {
            $userName = trim($input['UserName']);
        }

        // 分开拆成两个单独判断，彻底避免使用逻辑或运算符
        if ($palletId === '') {
            echo json_encode(array('status' => 'error', 'message' => 'Pallet ID is required'), JSON_UNESCAPED_UNICODE);
            exit;
        }
        if ($trackingNum === '') {
            echo json_encode(array('status' => 'error', 'message' => 'Tracking Num is required'), JSON_UNESCAPED_UNICODE);
            exit;
        }

        $sql = "INSERT INTO `trackingnumrecord` (`PalletID`, `TrackingNum`, `LoadingListNum`, `UserName`) VALUES (:palletId, :trackingNum, :loadingListNum, :userName)";
        
        $stmt =$pdo->prepare($sql);$stmt->execute(array(
            ':palletId'       => $palletId,
            ':trackingNum'    => $trackingNum,
            ':loadingListNum' => $loadingListNum,
            ':userName'       => $userName
        ));

        echo json_encode(array(
            'status' => 'success', 
            'message' => 'Record saved successfully',
            'data' => array(
                'PalletID' => $palletId,
                'TrackingNum' => $trackingNum,
                'TimeStamp' => date('Y-m-d H:i:s')
            )
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'export') {
        $start = isset($_GET['start']) ? $_GET['start'] : '';$end   = isset($_GET['end']) ?$_GET['end'] : '';

        $where = array();$params = array();

        if ($start !== '') {$where[] = "`TimeStamp` >= :start";
            $params[':start'] =$start . ' 00:00:00';
        }
        if ($end !== '') {$where[] = "`TimeStamp` <= :end";
            $params[':end'] =$end . ' 23:59:59';
        }

        $whereSql = '';
        if (count($where) > 0) {
            $whereSql = 'WHERE ' . implode(' AND ', $where);
        }

        $sql = "SELECT `PalletID`, `TrackingNum`, `LoadingListNum`, `TimeStamp`, `UserName` FROM `trackingnumrecord` " . $whereSql . " ORDER BY `TimeStamp` DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows =$stmt->fetchAll(PDO::FETCH_ASSOC);

        $filename = "Tracking_Record_" . date('Ymd_His') . ".csv";
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');

        $output = fopen('php://output', 'w');
        # fputs($output, "\EF\xBB\xBF");
        fputcsv($output, [
        'Pallet ID',
        'Tracking Num',
        'Loading List',
        'UserName',
        'TimeStamp'
        ]);

        foreach ($rows as$row) {
            fputcsv($output, array($row['PalletID'],
                $row['TrackingNum'],$row['LoadingListNum'],
                $row['TimeStamp'],$row['UserName']
            ));
        }
        fclose($output);
        exit;
    }

    echo json_encode(array('status' => 'error', 'message' => 'Invalid action'), JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array(
        'status' => 'error', 
        'message' => $e->getMessage()
    ), JSON_UNESCAPED_UNICODE);
}