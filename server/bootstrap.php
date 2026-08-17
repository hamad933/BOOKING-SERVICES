<?php

declare(strict_types=1);

final class Rp03Config
{
    public static function databasePath(): string
    {
        $configured = getenv('RP03_DB_PATH');
        $path = $configured === false || trim($configured) === ''
            ? dirname(__DIR__) . '/database/rp03.local.sqlite'
            : trim($configured);

        if (str_contains($path, "\0") || str_starts_with($path, 'file:')) {
            throw new RuntimeException('RP03_DB_PATH is invalid.');
        }

        if (str_starts_with($path, '\\\\') || str_starts_with($path, '//')) {
            throw new RuntimeException('Network-hosted SQLite paths are not supported.');
        }

        if (is_dir($path)) {
            throw new RuntimeException('RP03_DB_PATH must point to a SQLite file, not a directory.');
        }

        $parent = dirname($path);
        if (!is_dir($parent) || !is_writable($parent)) {
            throw new RuntimeException('RP03_DB_PATH parent directory must exist and be writable.');
        }

        return $path;
    }
}

final class Rp03Database
{
    public static function connect(): PDO
    {
        if (!extension_loaded('pdo_sqlite')) {
            throw new RuntimeException('PDO_SQLITE is required.');
        }

        $pdo = new PDO('sqlite:' . Rp03Config::databasePath(), null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);

        $pdo->exec('PRAGMA foreign_keys = ON');
        $pdo->exec('PRAGMA busy_timeout = 5000');

        return $pdo;
    }
}

final class Rp03ServiceRepository
{
    public function __construct(private PDO $pdo)
    {
    }

    /** @return array<int, array<string, mixed>> */
    public function allActive(): array
    {
        $statement = $this->pdo->prepare(
            'SELECT stable_id, slug, title_ar, description_ar, category, supports_in_person, supports_remote, preparation_context_ar
             FROM services
             WHERE is_active = :active
             ORDER BY title_ar ASC, id ASC'
        );
        $statement->execute(['active' => 1]);

        return array_map([$this, 'mapService'], $statement->fetchAll());
    }

    /** @return array<string, mixed>|null */
    public function findActiveBySlug(string $slug): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT stable_id, slug, title_ar, description_ar, category, supports_in_person, supports_remote, preparation_context_ar
             FROM services
             WHERE slug = :slug AND is_active = :active
             LIMIT 1'
        );
        $statement->execute([
            'slug' => $slug,
            'active' => 1,
        ]);

        $row = $statement->fetch();
        return $row === false ? null : $this->mapService($row);
    }

    /** @param array<string, mixed> $row
     *  @return array<string, mixed>
     */
    private function mapService(array $row): array
    {
        $modes = [];
        if ((int) $row['supports_in_person'] === 1) {
            $modes[] = 'in-person';
        }
        if ((int) $row['supports_remote'] === 1) {
            $modes[] = 'remote';
        }

        return [
            'id' => $row['stable_id'],
            'slug' => $row['slug'],
            'title_ar' => $row['title_ar'],
            'description_ar' => $row['description_ar'],
            'category' => $row['category'],
            'session_modes' => $modes,
            'preparation_context_ar' => $row['preparation_context_ar'],
        ];
    }
}

/** @param array<string, mixed> $payload */
function rp03_json(int $status, array $payload, array $headers = []): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    foreach ($headers as $name => $value) {
        header($name . ': ' . $value);
    }

    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}

function rp03_error(int $status, string $code, string $message, array $headers = []): never
{
    rp03_json($status, [
        'error' => [
            'code' => $code,
            'message' => $message,
        ],
    ], $headers);
}
