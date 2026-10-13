<?php
// backend/inventory_tracking_query.php - 独立的数据查询 API 入口

require_once __DIR__ . '/controllers/inventory_tracking_query_controller.php';

$controller = new Inventory_Tracking_Query_Controller();
$controller->handleRequest();