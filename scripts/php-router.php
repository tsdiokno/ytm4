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

// Route API endpoints
$routes = [
    '/api/sync'   => __DIR__ . '/../api/sync.php',
    '/api/state'  => __DIR__ . '/../api/state.php',
    '/api/queue'  => __DIR__ . '/../api/queue.php',
    '/api/skip'   => __DIR__ . '/../api/skip.php',
    '/api/auth'   => __DIR__ . '/../api/auth.php',
    '/api/oembed' => __DIR__ . '/../api/oembed.php',
];

if (isset($routes[$uri])) {
    require $routes[$uri];
    exit;
}

// Prefix matching for queries like /api/oembed?url=...
foreach ($routes as $route => $file) {
    if (strpos($uri, $route) === 0) {
        require $file;
        exit;
    }
}

// Fallback for API
if (strpos($uri, '/api/') === 0) {
    header('Content-Type: application/json');
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint not found', 'path' => $uri]);
    exit;
}

// Let static files or 404 handle everything else
return false;
