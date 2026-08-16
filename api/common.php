<?php
/**
 * Common helpers and atomic file persistence with flock()
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

define('DATA_DIR', __DIR__ . '/../data');
define('STATE_FILE', DATA_DIR . '/state.json');
define('PLAYLIST_FILE', DATA_DIR . '/playlist.json');
define('DEFAULT_HOST_PASS_HASH', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'); // sha256 for "password"

function json_response($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function get_json_input() {
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function read_json_locked($filepath, $default = []) {
    if (!file_exists($filepath)) {
        return $default;
    }
    $fp = fopen($filepath, 'r');
    if (!$fp) {
        return $default;
    }
    if (flock($fp, LOCK_SH)) {
        $filesize = filesize($filepath);
        $content = $filesize > 0 ? fread($fp, $filesize) : '';
        flock($fp, LOCK_UN);
        fclose($fp);
        $decoded = json_decode($content, true);
        return is_array($decoded) ? $decoded : $default;
    }
    fclose($fp);
    return $default;
}

function write_json_locked($filepath, $data) {
    $dir = dirname($filepath);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    $tempFile = $filepath . '.' . uniqid('tmp_', true);
    $fp = fopen($tempFile, 'w');
    if (!$fp) {
        return false;
    }

    if (flock($fp, LOCK_EX)) {
        $encoded = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        fwrite($fp, $encoded);
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        return rename($tempFile, $filepath);
    }

    fclose($fp);
    @unlink($tempFile);
    return false;
}

function verify_host_auth() {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $token = trim($matches[1]);
        $playlist = read_json_locked(PLAYLIST_FILE);
        $hash = $playlist['settings']['hostPasswordHash'] ?? DEFAULT_HOST_PASS_HASH;
        if ($token === $hash) {
            return true;
        }
    }
    return false;
}
