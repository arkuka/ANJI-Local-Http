<?php
// backend/controllers/base_query_controller.php

require_once __DIR__ . '/../config.php';

abstract class Base_Query_Controller {
    protected $pdo;
    protected $tableName;
    protected $page;
    protected $pageSize;
    protected $offset;
    protected $sortField;
    protected $sortOrder;
    protected $filters;
    protected $isExport = false;
    protected $existingColumns = [];

    public function __construct($defaultTable = '') {
        $this->pdo = getPDOConnection();
        $inputJson = json_decode(file_get_contents('php://input'), true) ?? [];

        // 1. 解析表名与安全过滤
        $rawTable = $_GET['table'] ?? ($inputJson['table'] ?? $defaultTable);
        $this->tableName = preg_replace('/[^a-zA-Z0-9_]/', '', $rawTable);

        // 2. 解析分页
        $this->page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : (isset($inputJson['page']) ? max(1, (int)$inputJson['page']) : 1);
        $rawPageSize = $_GET['pageSize'] ?? ($_GET['page_size'] ?? ($inputJson['pageSize'] ?? ($inputJson['page_size'] ?? 100)));
        $this->pageSize = min(1000, max(1, (int)$rawPageSize));
        $this->offset = ($this->page - 1) * $this->pageSize;

        // 3. 解析排序
        $this->sortField = $_GET['sortField'] ?? ($_GET['sort_field'] ?? ($inputJson['sortField'] ?? ($inputJson['sort_field'] ?? 'id')));
        $rawSortOrder = strtoupper($_GET['sortOrder'] ?? ($_GET['sort_order'] ?? ($inputJson['sortOrder'] ?? ($inputJson['sort_order'] ?? 'ASC'))));
        $this->sortOrder = $rawSortOrder === 'DESC' ? 'DESC' : 'ASC';

        // 4. 解析筛选条件
        $filtersRaw = $_GET['filters'] ?? ($inputJson['filters'] ?? []);
        $this->filters = is_string($filtersRaw) ? json_decode($filtersRaw, true) : $filtersRaw;

        // 5. 导出模式：不分页，返回所有符合当前筛选条件的数据
        $rawExport = $_GET['export'] ?? ($inputJson['export'] ?? false);
        $this->isExport = filter_var($rawExport, FILTER_VALIDATE_BOOLEAN) || $rawExport === '1';

        // 6. 初始化获取主表结构
        if (!empty($this->tableName)) {
            $colStmt = $this->pdo->query("DESCRIBE `{$this->tableName}`");
            $this->existingColumns = $colStmt->fetchAll(PDO::FETCH_COLUMN);
        }
    }

    /**
     * 构建 WHERE 条件子句及参数映射
     */
    protected function buildWhereClause() {
        $whereClauses = [];
        $safeParams = [];

        if (is_array($this->filters)) {
            foreach ($this->filters as $field => $value) {
                // 处理时间区间开始
                if (str_ends_with($field, '_start')) {
                    $baseField = substr($field, 0, -6);
                    if (in_array($baseField, $this->existingColumns) && !empty($value)) {
                        $whereClauses[] = "t1.`{$baseField}` >= :{$field}";
                        $safeParams[$field] = $value;
                    }
                    continue;
                }
                // 处理时间区间结束
                if (str_ends_with($field, '_end')) {
                    $baseField = substr($field, 0, -4);
                    if (in_array($baseField, $this->existingColumns) && !empty($value)) {
                        $whereClauses[] = "t1.`{$baseField}` <= :{$field}";
                        $safeParams[$field] = $value;
                    }
                    continue;
                }

                if (!in_array($field, $this->existingColumns)) continue;

                $valStr = trim((string)$value);
                if ($valStr !== '') {
                    $valStr = str_replace('*', '%', $valStr);
                    if (strpos($valStr, '%') === false) {
                        $valStr = '%' . $valStr . '%';
                    }
                    $whereClauses[] = "t1.`{$field}` LIKE :{$field}";
                    $safeParams[$field] = $valStr;
                }
            }
        }

        $whereSql = count($whereClauses) > 0 ? ' WHERE ' . implode(' AND ', $whereClauses) : '';
        return [$whereSql, $safeParams];
    }

    /**
     * 子类可复写：自定义从句 (如 LEFT JOIN 等)
     */
    protected function getJoinSql() {
        return "";
    }

    /**
     * 子类可复写：自定义 SELECT 列
     */
    protected function getSelectFields() {
        return "t1.*";
    }

    /**
     * 执行查询的核心入口方法
     */
    public function handleRequest() {
        header('Content-Type: application/json; charset=utf-8');

        try {
            list($whereSql, $safeParams) = $this->buildWhereClause();
            $joinSql = $this->getJoinSql();
            $selectFields = $this->getSelectFields();

            // 校验排序字段 (加别名 t1 防止多表同名歧义)
            $safeSortField = in_array($this->sortField, $this->existingColumns) ? "t1.`{$this->sortField}`" : "t1.`{$this->existingColumns[0]}`";

            // 1. 统计总数
            $countSql = "SELECT COUNT(*) FROM `{$this->tableName}` t1 {$joinSql} {$whereSql}";
            $countStmt = $this->pdo->prepare($countSql);
            $countStmt->execute($safeParams);
            $totalRecords = (int)$countStmt->fetchColumn();

            // 2. 查询明细数据
            if ($this->isExport) {
                // Export mode intentionally omits LIMIT/OFFSET so every matching row is returned.
                $dataSql = "SELECT {$selectFields} FROM `{$this->tableName}` t1 {$joinSql} {$whereSql} ORDER BY {$safeSortField} {$this->sortOrder}";
            } else {
                $dataSql = "SELECT {$selectFields} FROM `{$this->tableName}` t1 {$joinSql} {$whereSql} ORDER BY {$safeSortField} {$this->sortOrder} LIMIT {$this->pageSize} OFFSET {$this->offset}";
            }
            $dataStmt = $this->pdo->prepare($dataSql);
            $dataStmt->execute($safeParams);
            $data = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            // 3. 返回响应
            echo json_encode([
                'status' => 'success',
                'total' => $totalRecords,
                'page' => $this->page,
                'pageSize' => $this->pageSize,
                'sortField' => $this->sortField,
                'sortOrder' => $this->sortOrder,
                'totalPages' => ceil($totalRecords / $this->pageSize),
                'export' => $this->isExport,
                'data' => $data
            ], JSON_UNESCAPED_UNICODE);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
        }
    }
}