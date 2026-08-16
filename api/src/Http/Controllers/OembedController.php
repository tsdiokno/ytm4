<?php
declare(strict_types=1);

namespace CrowdQ\Http\Controllers;

class OembedController
{
    public function fetch(): void
    {
        $id = $_GET['id'] ?? '';
        if (!$id || !preg_match('/^[a-zA-Z0-9_-]{11}$/', (string)$id)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid YouTube Video ID']);
            return;
        }

        $url = 'https://www.youtube.com/oembed?url=' . urlencode('https://www.youtube.com/watch?v=' . $id) . '&format=json';

        $opts = [
            'http' => [
                'method' => 'GET',
                'header' => "User-Agent: Crowd-Q/1.0\r\n",
                'timeout' => 5,
            ]
        ];

        $context = stream_context_create($opts);
        $result = @file_get_contents($url, false, $context);

        if ($result === false) {
            echo json_encode([
                'title' => 'YouTube Video (' . $id . ')',
                'author_name' => 'YouTube Channel',
                'thumbnail_url' => 'https://img.youtube.com/vi/' . $id . '/hqdefault.jpg',
            ]);
            return;
        }

        header('Content-Type: application/json; charset=utf-8');
        echo $result;
    }
}
