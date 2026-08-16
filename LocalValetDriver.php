<?php

use Valet\Drivers\ValetDriver;

/**
 * LocalValetDriver for Laravel Herd & Laravel Valet.
 *
 * This driver tells Herd/Valet:
 * 1. Route any request starting with /api to api/index.php.
 * 2. Serve static assets directly (js, css, images, html).
 * 3. Fallback all other frontend routes to index.html.
 */
class LocalValetDriver extends ValetDriver
{
    /**
     * Determine if the driver serves the request.
     */
    public function serves(string $sitePath, string $siteName, string $uri): bool
    {
        return true;
    }

    /**
     * Determine if the incoming request is for a static file.
     */
    public function isStaticFile(string $sitePath, string $siteName, string $uri): string|false
    {
        // Check in current site path (e.g. root or dist)
        if ($this->isActualFile($staticFilePath = $sitePath . $uri)) {
            return $staticFilePath;
        }

        // Check in dist/ if site is linked at root
        if ($this->isActualFile($distStaticPath = $sitePath . '/dist' . $uri)) {
            return $distStaticPath;
        }

        return false;
    }

    /**
     * Get the fully resolved path to the application's front controller.
     */
    public function frontControllerPath(string $sitePath, string $siteName, string $uri): ?string
    {
        // 1. If request is to /api/*, route directly to api/index.php
        if (str_starts_with($uri, '/api')) {
            // Check api/index.php in sitePath or dist/api/index.php
            if (file_exists($apiPath = $sitePath . '/api/index.php')) {
                return $apiPath;
            }
            if (file_exists($distApiPath = $sitePath . '/dist/api/index.php')) {
                return $distApiPath;
            }
        }

        // 2. If it's a specific PHP file requested directly
        if (str_ends_with($uri, '.php')) {
            if (file_exists($phpPath = $sitePath . $uri)) {
                return $phpPath;
            }
            if (file_exists($distPhpPath = $sitePath . '/dist' . $uri)) {
                return $distPhpPath;
            }
        }

        // 3. SPA Fallback: serve index.html
        if (file_exists($indexPath = $sitePath . '/index.html')) {
            return $indexPath;
        }

        if (file_exists($distIndexPath = $sitePath . '/dist/index.html')) {
            return $distIndexPath;
        }

        return null;
    }
}
