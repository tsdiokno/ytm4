<?php

declare(strict_types=1);

namespace CrowdQ;

class QueueService
{
    private string $stateFile;

    public function __construct(?string $stateFile = null)
    {
        $this->stateFile = $stateFile ?? dirname(__DIR__, 2) . '/state.json';
    }

    /**
     * Read full state object safely with a shared lock.
     *
     * @return array{queue: array, playback: array}
     */
    public function getState(): array
    {
        $defaultState = [
            'queue' => [],
            'playback' => [
                'currentVideoId' => null,
                'isPlaying' => false,
                'elapsedMs' => 0,
                'updatedAt' => 0,
            ],
        ];

        if (!file_exists($this->stateFile)) {
            return $defaultState;
        }

        $fp = fopen($this->stateFile, 'rb');
        if (!$fp) {
            return $defaultState;
        }

        flock($fp, LOCK_SH);
        $content = stream_get_contents($fp);
        flock($fp, LOCK_UN);
        fclose($fp);

        if (!$content) {
            return $defaultState;
        }

        $data = json_decode($content, true);
        if (!is_array($data)) {
            return $defaultState;
        }

        // Support backward-compatibility if file is a raw queue array
        if (array_is_list($data)) {
            return [
                'queue' => $data,
                'playback' => $defaultState['playback'],
            ];
        }

        return [
            'queue' => isset($data['queue']) && is_array($data['queue']) ? array_values($data['queue']) : [],
            'playback' => isset($data['playback']) && is_array($data['playback']) ? array_merge($defaultState['playback'], $data['playback']) : $defaultState['playback'],
        ];
    }

    /**
     * Save state atomically with an exclusive lock.
     *
     * @param array{queue: array, playback: array} $state
     */
    public function saveState(array $state): bool
    {
        $fp = fopen($this->stateFile, 'c+b');
        if (!$fp) {
            return false;
        }

        if (flock($fp, LOCK_EX)) {
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
            fflush($fp);
            flock($fp, LOCK_UN);
            fclose($fp);
            return true;
        }

        fclose($fp);
        return false;
    }

    /**
     * Read only the queue array.
     *
     * @return array<int, array{url: string, title?: ?string, videoId: string, addedAt?: int}>
     */
    public function getQueue(): array
    {
        return $this->getState()['queue'];
    }

    /**
     * Save the entire queue array atomically while preserving playback state.
     *
     * @param array<int, array{url: string, title?: ?string, videoId: string, addedAt?: int}> $queue
     */
    public function saveQueue(array $queue): bool
    {
        $state = $this->getState();
        $state['queue'] = array_values($queue);
        return $this->saveState($state);
    }

    /**
     * Add a song to the queue if not already present.
     *
     * @param array{url: string, title?: ?string, videoId: string} $song
     * @return array{added: bool, message: string, queue: array, state: array}
     */
    public function addSong(array $song): array
    {
        if (empty($song['url']) || empty($song['videoId'])) {
            $state = $this->getState();
            return [
                'added' => false,
                'message' => 'Invalid song data: url and videoId are required.',
                'queue' => $state['queue'],
                'state' => $state,
            ];
        }

        $state = $this->getState();
        $queue = $state['queue'];

        // Check if already in queue
        foreach ($queue as $item) {
            if ($item['url'] === $song['url'] || $item['videoId'] === $song['videoId']) {
                return [
                    'added' => false,
                    'message' => 'Song is already in the queue.',
                    'queue' => $queue,
                    'state' => $state,
                ];
            }
        }

        $itemToAdd = [
            'url' => $song['url'],
            'title' => $song['title'] ?? null,
            'videoId' => $song['videoId'],
            'addedAt' => time(),
        ];

        $queue[] = $itemToAdd;
        $state['queue'] = $queue;
        $this->saveState($state);

        return [
            'added' => true,
            'message' => 'Song added to queue successfully.',
            'queue' => $queue,
            'state' => $state,
        ];
    }

    /**
     * Remove the current playing song (shift) or a specific index.
     *
     * @param int|null $index If null, shifts the first song.
     */
    public function removeSong(?int $index = null): array
    {
        $state = $this->getState();
        $queue = $state['queue'];

        if (empty($queue)) {
            return [
                'removed' => false,
                'message' => 'Queue is already empty.',
                'queue' => [],
                'state' => $state,
            ];
        }

        if ($index === null || $index === 0) {
            $removed = array_shift($queue);
        } else {
            if (!isset($queue[$index])) {
                return [
                    'removed' => false,
                    'message' => 'Invalid queue item index.',
                    'queue' => $queue,
                    'state' => $state,
                ];
            }
            $removed = $queue[$index];
            array_splice($queue, $index, 1);
        }

        $state['queue'] = $queue;
        $this->saveState($state);

        return [
            'removed' => true,
            'item' => $removed,
            'queue' => $queue,
            'state' => $state,
        ];
    }

    /**
     * Clear all songs from the queue.
     */
    public function clearQueue(): array
    {
        $state = $this->getState();
        $state['queue'] = [];
        $this->saveState($state);
        return [
            'cleared' => true,
            'queue' => [],
            'state' => $state,
        ];
    }
}
