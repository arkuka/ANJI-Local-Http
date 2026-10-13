<?php
// api/config.php - 全局数据库及系统配置文件

if (!function_exists('getPDOConnection')) {
    function getPDOConnection(): PDO {
        static $pdo = null;
        if ($pdo === null) {
            $config = [
                'db' => [
                    'host'     => 'localhost',
                    'dbname'   => 'anji',
                    'charset'  => 'utf8mb4',
                    'username' => 'root',
                    'password' => '',
                    'options'  => [
                        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES   => false,
                    ]
                ]
            ];
            $db = $config['db'];
            $dsn = "mysql:host={$db['host']};dbname={$db['dbname']};charset={$db['charset']}";
            $pdo = new PDO($dsn, $db['username'], $db['password'], $db['options']);
        }
        return $pdo;
    }
}