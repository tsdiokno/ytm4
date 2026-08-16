<?php
declare(strict_types=1);

namespace CrowdQ\Http\Controllers;

use CrowdQ\Storage\JsonRepository;

class SyncController
{
    public function __construct(private JsonRepository $repo) {}

    public function handle(): void
    {
        $state = $this->repo->getState();
        $playlist = $this->repo->getPlaylist();

        $queueUids = array_map(fn($t) => $t->uid, $playlist->queue);
        $queueSig = implode(',', $queueUids);
        $etag = md5($state->version . '-' . $state->updatedAt . '-' . $queueSig);

        header('ETag: "' . $etag . '"');
        header('Cache-Control: private, no-cache, no-transform');

        if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH'], '"') === $etag) {
            http_response_code(304);
            exit;
        }

        echo json_encode([
            'state' => $state->jsonSerialize(),
            'playlist' => $playlist->jsonSerialize(),
            'timestamp' => time(),
        ], JSON_UNESCAPED_SLASHES);
    }
}
