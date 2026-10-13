<?php
// backend/controllers/inventory_tracking_time_range_controller.php

require_once __DIR__ . '/base_time_range_controller.php';

class Inventory_Tracking_Time_Range_Controller extends Base_Time_Range_Controller {

    public function __construct() {
        parent::__construct('inventorytrackingexport', 'Operation_Time');
    }
}