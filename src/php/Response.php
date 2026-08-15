<?php

declare(strict_types=1);

namespace CrowdQ;

class Response
{
    /**
     * Send a JSON success response.
     */
    public static function json(mixed $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');

        echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * Send a standardized success payload.
     */
    public static function success(mixed $data = null, string $message = 'Success'): void
    {
        self::json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ]);
    }

    /**
     * Send a standardized error payload.
     */
    public static function error(string $message, int $statusCode = 400, mixed $details = null): void
    {
        self::json([
            'success' => false,
            'error' => $message,
            'details' => $details,
        ], $statusCode);
    }
}
