<?php
// backend/controllers/base_time_range_controller.php

require_once __DIR__ . '/../config.php';

abstract class Base_Time_Range_Controller {
    protected $pdo;
    protected $tableName;
    protected $timeColumn;

    public function __construct($tableName, $timeColumn = 'Operation_Time') {
        $this->pdo = getPDOConnection();
        $this->tableName = preg_replace('/[^a-zA-Z0-9_]/', '', $tableName);
        $this->timeColumn = preg_replace('/[^a-zA-Z0-9_]/', '', $timeColumn);
    }

    public function handleRequest() {
        header('Content-Type: application/json; charset=utf-8');

        try {
            $sql = "SELECT MIN(`{$this->timeColumn}`) as min_time, MAX(`{$this->timeColumn}`) as max_time 
                    FROM `{$this->tableName}` 
                    WHERE `{$this->timeColumn}` IS NOT NULL AND `{$this->timeColumn}` != ''";
                    
            $stmt = $this->pdo->query($sql);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                'status' => 'success',
                'min_time' => $result['min_time'] ?? null,
                'max_time' => $result['max_time'] ?? null
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