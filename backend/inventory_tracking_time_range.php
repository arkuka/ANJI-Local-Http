<?php
// backend/inventory_tracking_time_range.php - 独立的时间范围 API 入口

require_once __DIR__ . '/controllers/inventory_tracking_time_range_controller.php';

$controller = new Inventory_Tracking_Time_Range_Controller();
$controller->handleRequest();