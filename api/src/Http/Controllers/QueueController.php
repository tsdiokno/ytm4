<?php
declare(strict_types=1);

namespace CrowdQ\Http\Controllers;

use CrowdQ\DTO\PlaybackStateDTO;
use CrowdQ\DTO\TrackItemDTO;
use CrowdQ\Storage\JsonRepository;

class QueueController
{
    public function __construct(private JsonRepository $repo) {}

    public function add(): void
    {
        $input = json_decode(file_get_contents('php://input') ?: '{}', true);
        if (!is_array($input)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid track data']);
            return;
        }

        // Support both direct track payload { id, title, ... } and nested { track: { id, title, ... } }
        $rawTrack = isset($input['track']) && is_array($input['track']) ? $input['track'] : $input;
        if (empty($rawTrack['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid track data: missing video id']);
            return;
        }

        $trackItem = TrackItemDTO::fromArray($rawTrack);

        $playlist = $this->repo->getPlaylist();
        $queue = $playlist->queue;

        // Check max queue length
        $maxQueue = (int)($playlist->settings['maxQueueLength'] ?? 50);
        if (count($queue) >= $maxQueue) {
            http_response_code(400);
            echo json_encode(['error' => 'Queue is full (maximum ' . $maxQueue . ' tracks)']);
            return;
        }

        // Prevent duplicate consecutive additions of the exact same video ID
        if (!empty($queue)) {
            $lastTrack = end($queue);
            if ($lastTrack->id === $trackItem->id) {
                http_response_code(400);
                echo json_encode(['error' => 'This track is already at the end of the queue']);
                return;
            }
        }

        $queue[] = $trackItem;

        $newPlaylist = new \CrowdQ\DTO\PlaylistDTO(
            queue: $queue,
            history: $playlist->history,
            settings: $playlist->settings
        );
        $this->repo->savePlaylist($newPlaylist);

        echo json_encode([
            'success' => true,
            'track' => $trackItem->jsonSerialize(),
        ]);
    }

    public function remove(): void
    {
        $input = json_decode(file_get_contents('php://input') ?: '{}', true);
        $uid = $input['uid'] ?? $_GET['uid'] ?? null;

        if (!$uid) {
            http_response_code(400);
            echo json_encode(['error' => 'Track UID is required']);
            return;
        }

        $playlist = $this->repo->getPlaylist();
        $queue = array_values(array_filter($playlist->queue, fn($t) => $t->uid !== $uid));

        $newPlaylist = new \CrowdQ\DTO\PlaylistDTO(
            queue: $queue,
            history: $playlist->history,
            settings: $playlist->settings
        );
        $this->repo->savePlaylist($newPlaylist);

        echo json_encode(['success' => true]);
    }

    public function reorder(): void
    {
        $input = json_decode(file_get_contents('php://input') ?: '{}', true);
        if (!is_array($input) || !isset($input['queue']) || !is_array($input['queue'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid queue array']);
            return;
        }

        $reorderedQueue = [];
        foreach ($input['queue'] as $item) {
            if (is_array($item)) {
                $reorderedQueue[] = TrackItemDTO::fromArray($item);
            }
        }

        $playlist = $this->repo->getPlaylist();
        $newPlaylist = new \CrowdQ\DTO\PlaylistDTO(
            queue: $reorderedQueue,
            history: $playlist->history,
            settings: $playlist->settings
        );
        $this->repo->savePlaylist($newPlaylist);

        echo json_encode(['success' => true]);
    }

    public function skip(): void
    {
        $playlist = $this->repo->getPlaylist();
        $state = $this->repo->getState();

        $queue = $playlist->queue;
        $history = $playlist->history;

        // Archive current track to history if present
        if ($state->currentTrack !== null) {
            array_unshift($history, $state->currentTrack);
            if (count($history) > 30) {
                $history = array_slice($history, 0, 30);
            }
        }

        $nextTrack = array_shift($queue);
        $now = time();

        if ($nextTrack !== null) {
            $newState = new PlaybackStateDTO(
                version: $state->version + 1,
                status: 'playing',
                currentTrack: $nextTrack,
                currentTime: 0.0,
                updatedAt: $now
            );
        } else {
            $newState = new PlaybackStateDTO(
                version: $state->version + 1,
                status: 'idle',
                currentTrack: null,
                currentTime: 0.0,
                updatedAt: $now
            );
        }

        $newPlaylist = new \CrowdQ\DTO\PlaylistDTO(
            queue: $queue,
            history: $history,
            settings: $playlist->settings
        );

        $this->repo->savePlaylist($newPlaylist);
        $this->repo->saveState($newState);

        echo json_encode([
            'success' => true,
            'state' => $newState->jsonSerialize(),
            'playlist' => $newPlaylist->jsonSerialize(),
        ]);
    }
}
