<?php
require_once __DIR__ . '/common.php';

$url = $_GET['url'] ?? '';
if (empty($url)) {
    json_response(['error' => 'URL parameter is required'], 400);
}

$oembedUrl = 'https://www.youtube.com/oembed?url=' . urlencode($url) . '&format=json';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $oembedUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_setopt($ch, CURLOPT_USERAGENT, 'Crowd-Q/1.0');

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200 && $response) {
    $data = json_decode($response, true);
    json_response($data);
} else {
    // Fallback if oembed fails or curl is disabled
    json_response([
        'title' => 'YouTube Video',
        'author_name' => 'YouTube Creator',
        'thumbnail_url' => ''
    ]);
}
