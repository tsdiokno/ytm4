<?php
declare(strict_types=1);

namespace CrowdQ\Storage;

use CrowdQ\DTO\PlaybackStateDTO;
use CrowdQ\DTO\PlaylistDTO;

class JsonRepository
{
    private string $dataDir;
    private string $stateFile;
    private string $playlistFile;

    public function __construct(?string $dataDir = null)
    {
        $this->dataDir = $dataDir ?? dirname(__DIR__, 2) . '/data';
        if (!is_dir($this->dataDir)) {
            @mkdir($this->dataDir, 0777, true);
        }
        $this->stateFile = $this->dataDir . '/state.json';
        $this->playlistFile = $this->dataDir . '/playlist.json';
    }

    public function getState(): PlaybackStateDTO
    {
        $raw = $this->readJsonLocked($this->stateFile, [
            'version' => 1,
            'status' => 'idle',
            'currentTrack' => null,
            'currentTime' => 0.0,
            'updatedAt' => time(),
        ]);
        return PlaybackStateDTO::fromArray($raw);
    }

    public function saveState(PlaybackStateDTO|array $state): bool
    {
        $data = $state instanceof PlaybackStateDTO ? $state->jsonSerialize() : $state;
        return $this->writeJsonLocked($this->stateFile, $data);
    }

    public function getPlaylist(): PlaylistDTO
    {
        $raw = $this->readJsonLocked($this->playlistFile, [
            'queue' => [],
            'history' => [],
            'settings' => [
                'roomName' => 'Crowd-Q Room',
                'isPasswordProtected' => false,
                'maxQueueLength' => 50,
                'maxUserSongsInQueue' => 3,
            ],
        ]);
        return PlaylistDTO::fromArray($raw);
    }

    public function savePlaylist(PlaylistDTO|array $playlist): bool
    {
        $data = $playlist instanceof PlaylistDTO ? $playlist->jsonSerialize() : $playlist;
        return $this->writeJsonLocked($this->playlistFile, $data);
    }

    /**
     * @param array<string, mixed> $default
     * @return array<string, mixed>
     */
    public function readJsonLocked(string $filePath, array $default = []): array
    {
        if (!file_exists($filePath)) {
            $this->writeJsonLocked($filePath, $default);
            return $default;
        }

        $fp = @fopen($filePath, 'r');
        if (!$fp) {
            return $default;
        }

        if (flock($fp, LOCK_SH)) {
            $contents = stream_get_contents($fp);
            flock($fp, LOCK_UN);
            fclose($fp);
            if ($contents === false || trim($contents) === '') {
                return $default;
            }
            $data = json_decode($contents, true);
            return is_array($data) ? $data : $default;
        }

        fclose($fp);
        return $default;
    }

    /**
     * @param array<string, mixed> $data
     */
    public function writeJsonLocked(string $filePath, array $data): bool
    {
        $dir = dirname($filePath);
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }

        $fp = @fopen($filePath, 'c+');
        if (!$fp) {
            return false;
        }

        if (flock($fp, LOCK_EX)) {
            ftruncate($fp, 0);
            rewind($fp);
            $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            fwrite($fp, $json !== false ? $json : '{}');
            fflush($fp);
            flock($fp, LOCK_UN);
            fclose($fp);
            return true;
        }

        fclose($fp);
        return false;
    }
}
