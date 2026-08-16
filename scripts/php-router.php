<?php
/**
 * PHP Development Server Router for Crowd-Q (Path 2)
 * Usage: php -S 127.0.0.1:8000 scripts/php-router.php
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Serve existing static files directly if present
if ($uri !== '/' && file_exists(__DIR__ . '/../' . $uri)) {
    return false;
}

// Route API endpoints to Front Controller
if (strpos($uri, '/api') === 0) {
    require __DIR__ . '/../api/index.php';
    exit;
}

// Let static files or 404 handle everything else
return false;
