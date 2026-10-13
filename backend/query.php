<?php
// backend/query.php

require_once __DIR__ . '/controllers/base_query_controller.php';
require_once __DIR__ . '/controllers/inventory_tracking_query_controller.php';

$inputJson = json_decode(file_get_contents('php://input'), true) ?? [];
$table = $_GET['table'] ?? ($inputJson['table'] ?? 'inventorytrackingexport');

switch ($table) {
    case 'inventorytrackingexport':
        $controller = new Inventory_Tracking_Query_Controller();
        break;
        
    default:
        // 若没有匹配的专属子类，退回到通用单表查询（匿名子类实现）
        $controller = new class($table) extends Base_Query_Controller {};
        break;
}

$controller->handleRequest();