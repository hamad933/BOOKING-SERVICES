<?php

declare(strict_types=1);

final class Rp03Migrator
{
    public function __construct(
        private PDO $pdo,
        private string $migrationDirectory
    ) {
    }

    /** @return array{applied:int, skipped:int} */
    public function run(): array
    {
        $this->ensureHistoryTable();
        $files = glob(rtrim($this->migrationDirectory, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . '*.sql');
        if ($files === false) {
            throw new RuntimeException('Could not read migration directory.');
        }

        sort($files, SORT_STRING);
        $applied = 0;
        $skipped = 0;

        foreach ($files as $file) {
            $filename = basename($file);
            if (preg_match('/^(\d{3})_[A-Za-z0-9_-]+\.sql$/', $filename, $matches) !== 1) {
                throw new RuntimeException('Invalid migration filename: ' . $filename);
            }

            $version = (int) $matches[1];
            $sql = file_get_contents($file);
            if ($sql === false || trim($sql) === '') {
                throw new RuntimeException('Migration is unreadable or empty: ' . $filename);
            }

            $checksum = hash('sha256', $sql);
            $existing = $this->historyFor($version);
            if ($existing !== null) {
                if ($existing['filename'] !== $filename || $existing['checksum_sha256'] !== $checksum) {
                    throw new RuntimeException('Accepted migration content changed: ' . $filename);
                }
                $skipped++;
                continue;
            }

            $this->pdo->beginTransaction();
            try {
                $this->pdo->exec($sql);
                $statement = $this->pdo->prepare(
                    'INSERT INTO schema_migrations (version, filename, checksum_sha256) VALUES (:version, :filename, :checksum)'
                );
                $statement->execute([
                    'version' => $version,
                    'filename' => $filename,
                    'checksum' => $checksum,
                ]);
                $this->pdo->commit();
                $applied++;
            } catch (Throwable $error) {
                if ($this->pdo->inTransaction()) {
                    $this->pdo->rollBack();
                }
                throw $error;
            }
        }

        return ['applied' => $applied, 'skipped' => $skipped];
    }

    private function ensureHistoryTable(): void
    {
        $this->pdo->exec(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                filename TEXT NOT NULL UNIQUE,
                checksum_sha256 TEXT NOT NULL,
                applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            )"
        );
    }

    /** @return array{filename:string, checksum_sha256:string}|null */
    private function historyFor(int $version): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT filename, checksum_sha256 FROM schema_migrations WHERE version = :version'
        );
        $statement->execute(['version' => $version]);
        $row = $statement->fetch();

        return $row === false ? null : $row;
    }
}
