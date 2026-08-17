<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/server/bootstrap.php';
require __DIR__ . '/Migrator.php';

try {
    $migrator = new Rp03Migrator(Rp03Database::connect(), __DIR__ . '/migrations');
    $result = $migrator->run();
    fwrite(STDOUT, sprintf("Migrations complete: %d applied, %d skipped.\n", $result['applied'], $result['skipped']));
} catch (Throwable $error) {
    fwrite(STDERR, "Migration failed: " . $error->getMessage() . PHP_EOL);
    exit(1);
}
