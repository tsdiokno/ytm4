<?php
declare(strict_types=1);

namespace CrowdQ\Http;

class Router
{
    /** @var array<string, array<string, callable>> */
    private array $routes = [];

    public function get(string $path, callable $handler): void
    {
        $this->routes['GET'][$path] = $handler;
    }

    public function post(string $path, callable $handler): void
    {
        $this->routes['POST'][$path] = $handler;
    }

    public function delete(string $path, callable $handler): void
    {
        $this->routes['DELETE'][$path] = $handler;
    }

    public function patch(string $path, callable $handler): void
    {
        $this->routes['PATCH'][$path] = $handler;
    }

    public function dispatch(): void
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $rawUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';

        // Normalize URI: strip trailing slash and normalize .php
        $normalizedUri = rtrim($rawUri, '/');
        if ($normalizedUri === '') {
            $normalizedUri = '/';
        }
        $normalizedUri = preg_replace('/\.php$/', '', $normalizedUri) ?? $normalizedUri;

        // If app is served inside a Herd subpath / folder (e.g. /my-project/api/sync), extract from /api
        $apiPos = strpos($normalizedUri, '/api');
        if ($apiPos !== false) {
            $normalizedUri = substr($normalizedUri, $apiPos);
        }

        if ($method === 'OPTIONS') {
            http_response_code(204);
            exit;
        }

        if (isset($this->routes[$method][$normalizedUri])) {
            call_user_func($this->routes[$method][$normalizedUri]);
            return;
        }

        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found', 'path' => $normalizedUri, 'method' => $method]);
    }
}
