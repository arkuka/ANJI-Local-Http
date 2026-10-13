<?php
// backend/controllers/inventory_tracking_query_controller.php

require_once __DIR__ . '/base_query_controller.php';

class Inventory_Tracking_Query_Controller extends Base_Query_Controller {

    public function __construct() {
        // 绑定默认主表名称
        parent::__construct('inventorytrackingexport');
    }

    /**
     * 重写自定义 SELECT 字段 (跨表拉取 receive_name)
     */
    protected function getSelectFields() {
        return "t1.*, t2.receive_name AS Receive_Name";
    }

    /**
     * 重写 LEFT JOIN 逻辑 (按订单号分组去重，规避多条明细导致的数据膨胀)
     */
    protected function getJoinSql() {
        return "LEFT JOIN (
                    SELECT Outbound_Order_No, receive_name 
                    FROM wmsoutbountorderexport 
                    WHERE receive_name IS NOT NULL AND receive_name != ''
                    GROUP BY Outbound_Order_No
                ) t2 ON t1.Order_Number = t2.Outbound_Order_No";
    }
}