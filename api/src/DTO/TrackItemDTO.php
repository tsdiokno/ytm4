<?php
declare(strict_types=1);

namespace CrowdQ\DTO;

use JsonSerializable;

final class TrackItemDTO implements JsonSerializable
{
    public function __construct(
        public readonly string $uid,
        public readonly string $id,
        public readonly string $title,
        public readonly string $artist,
        public readonly int $duration,
        public readonly ?string $thumbnail = null,
        public readonly string $addedBy = 'Guest',
        public readonly int $addedAt = 0,
        public readonly ?string $url = null
    ) {}

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        $id = (string)($data['id'] ?? '');
        $authorOrArtist = (string)($data['author'] ?? $data['artist'] ?? 'YouTube');
        $url = (string)($data['url'] ?? ($id !== '' ? "https://www.youtube.com/watch?v={$id}" : ''));

        return new self(
            uid: (string)($data['uid'] ?? uniqid('t_', true)),
            id: $id,
            title: (string)($data['title'] ?? 'Unknown Track'),
            artist: $authorOrArtist,
            duration: (int)($data['duration'] ?? 0),
            thumbnail: isset($data['thumbnail']) ? (string)$data['thumbnail'] : null,
            addedBy: (string)($data['addedBy'] ?? 'Guest'),
            addedAt: (int)($data['addedAt'] ?? time()),
            url: $url
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return [
            'uid' => $this->uid,
            'id' => $this->id,
            'url' => $this->url ?? "https://www.youtube.com/watch?v={$this->id}",
            'title' => $this->title,
            'artist' => $this->artist,
            'author' => $this->artist,
            'duration' => $this->duration,
            'thumbnail' => $this->thumbnail,
            'addedBy' => $this->addedBy,
            'addedAt' => $this->addedAt,
        ];
    }
}
