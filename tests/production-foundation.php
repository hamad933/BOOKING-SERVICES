<?php

declare(strict_types=1);

require dirname(__DIR__) . '/server/bootstrap.php';
require dirname(__DIR__) . '/database/Migrator.php';

function rp03_test(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

/** @return array{status:int, body:string, headers:array<int, string>} */
function rp03_http(string $url, string $method = 'GET'): array
{
    $context = stream_context_create([
        'http' => [
            'method' => $method,
            'ignore_errors' => true,
            'timeout' => 3,
        ],
    ]);
    $body = file_get_contents($url, false, $context);
    $headers = $http_response_header ?? [];
    $status = 0;
    if (isset($headers[0]) && preg_match('/\s(\d{3})\s/', $headers[0], $matches) === 1) {
        $status = (int) $matches[1];
    }

    return [
        'status' => $status,
        'body' => $body === false ? '' : $body,
        'headers' => $headers,
    ];
}

function rp03_free_port(): int
{
    $socket = stream_socket_server('tcp://127.0.0.1:0', $errorNumber, $errorMessage);
    if ($socket === false) {
        throw new RuntimeException('Could not allocate a local test port: ' . $errorMessage);
    }
    $name = stream_socket_get_name($socket, false);
    fclose($socket);
    if (!is_string($name) || preg_match('/:(\d+)$/', $name, $matches) !== 1) {
        throw new RuntimeException('Could not determine local test port.');
    }

    return (int) $matches[1];
}

if (!extension_loaded('pdo_sqlite')) {
    fwrite(STDERR, "FAIL: PDO_SQLITE extension is unavailable.\n");
    exit(1);
}

$tempDirectory = sys_get_temp_dir() . '/rp03-w01-' . bin2hex(random_bytes(6));
if (!mkdir($tempDirectory, 0700, true) && !is_dir($tempDirectory)) {
    fwrite(STDERR, "FAIL: Could not create temporary directory.\n");
    exit(1);
}

$databasePath = $tempDirectory . '/integration.sqlite';
putenv('RP03_DB_PATH=' . $databasePath);

$serverProcess = null;

try {
    $pdo = Rp03Database::connect();
    rp03_test((int) $pdo->query('PRAGMA foreign_keys')->fetchColumn() === 1, 'Foreign keys are not enabled.');
    rp03_test((int) $pdo->query('PRAGMA busy_timeout')->fetchColumn() >= 5000, 'Busy timeout is not configured.');

    $migrator = new Rp03Migrator($pdo, dirname(__DIR__) . '/database/migrations');
    $firstRun = $migrator->run();
    rp03_test($firstRun === ['applied' => 1, 'skipped' => 0], 'Empty-database migration did not apply exactly once.');

    $historyBefore = $pdo->query('SELECT COUNT(*) FROM schema_migrations')->fetchColumn();
    $secondRun = $migrator->run();
    $historyAfter = $pdo->query('SELECT COUNT(*) FROM schema_migrations')->fetchColumn();
    rp03_test($secondRun === ['applied' => 0, 'skipped' => 1], 'Migration rerun was not safely skipped.');
    rp03_test($historyBefore === $historyAfter && (int) $historyAfter === 1, 'Migration history changed unexpectedly on rerun.');

    $seedCommand = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg(dirname(__DIR__) . '/database/seed.php');
    exec($seedCommand, $seedOutput, $seedStatus);
    rp03_test($seedStatus === 0, 'Synthetic seed failed.');

    $serviceCount = (int) $pdo->query('SELECT COUNT(*) FROM services')->fetchColumn();
    rp03_test($serviceCount === 6, 'Synthetic service seed count is incorrect.');

    $repository = new Rp03ServiceRepository($pdo);
    $services = $repository->allActive();
    rp03_test(count($services) === 6, 'Real SQLite service read did not return seeded services.');
    $single = $repository->findActiveBySlug('technical-review');
    rp03_test($single !== null && $single['slug'] === 'technical-review', 'Parameterized single-service lookup failed.');

    $hostile = "technical-review' OR 1=1 --";
    rp03_test($repository->findActiveBySlug($hostile) === null, 'Hostile lookup changed SQL semantics.');
    rp03_test((int) $pdo->query('SELECT COUNT(*) FROM services')->fetchColumn() === 6, 'Hostile lookup changed durable data.');

    try {
        $pdo->exec("INSERT INTO provider_capabilities (provider_id, service_id) VALUES (999999, 999999)");
        throw new RuntimeException('Foreign-key violation was accepted.');
    } catch (PDOException) {
        // Expected: actual SQLite foreign-key enforcement.
    }

    $auditInsert = $pdo->prepare(
        'INSERT INTO audit_events (event_id, actor_reference, entity_type, entity_id, action, metadata_json, correlation_id)
         VALUES (:event_id, NULL, :entity_type, :entity_id, :action, :metadata_json, :correlation_id)'
    );
    $auditInsert->execute([
        'event_id' => 'test-event-001',
        'entity_type' => 'service',
        'entity_id' => 'svc-review',
        'action' => 'test.append_only',
        'metadata_json' => '{"synthetic":true}',
        'correlation_id' => 'test-correlation-001',
    ]);
    try {
        $pdo->exec("UPDATE audit_events SET action = 'changed' WHERE event_id = 'test-event-001'");
        throw new RuntimeException('Append-only audit update was accepted.');
    } catch (PDOException) {
        // Expected.
    }
    try {
        $pdo->exec("DELETE FROM audit_events WHERE event_id = 'test-event-001'");
        throw new RuntimeException('Append-only audit delete was accepted.');
    } catch (PDOException) {
        // Expected.
    }

    $port = rp03_free_port();
    $command = sprintf(
        '%s -S 127.0.0.1:%d %s',
        escapeshellarg(PHP_BINARY),
        $port,
        escapeshellarg(dirname(__DIR__) . '/server/router.php')
    );
    $descriptorSpec = [
        0 => ['pipe', 'r'],
        1 => ['file', $tempDirectory . '/server.out.log', 'a'],
        2 => ['file', $tempDirectory . '/server.err.log', 'a'],
    ];
    $serverProcess = proc_open($command, $descriptorSpec, $pipes, dirname(__DIR__), ['RP03_DB_PATH' => $databasePath]);
    rp03_test(is_resource($serverProcess), 'Could not start local PHP server.');
    if (isset($pipes[0]) && is_resource($pipes[0])) {
        fclose($pipes[0]);
    }

    $baseUrl = 'http://127.0.0.1:' . $port;
    $ready = false;
    for ($attempt = 0; $attempt < 30; $attempt++) {
        usleep(100000);
        $probe = rp03_http($baseUrl . '/api/health');
        if ($probe['status'] === 200) {
            $ready = true;
            break;
        }
    }
    rp03_test($ready, 'Local PHP server did not become ready.');

    $health = rp03_http($baseUrl . '/api/health');
    rp03_test($health['status'] === 200, '/api/health did not return 200.');
    rp03_test(json_decode($health['body'], true, 512, JSON_THROW_ON_ERROR)['status'] === 'ok', '/api/health JSON is invalid.');

    $serviceList = rp03_http($baseUrl . '/api/services');
    $servicePayload = json_decode($serviceList['body'], true, 512, JSON_THROW_ON_ERROR);
    rp03_test($serviceList['status'] === 200 && count($servicePayload['services'] ?? []) === 6, '/api/services did not return valid seeded JSON.');

    $serviceRead = rp03_http($baseUrl . '/api/services/technical-review');
    $serviceReadPayload = json_decode($serviceRead['body'], true, 512, JSON_THROW_ON_ERROR);
    rp03_test($serviceRead['status'] === 200 && ($serviceReadPayload['service']['slug'] ?? null) === 'technical-review', 'Single-service API read failed.');

    $hostileRead = rp03_http($baseUrl . '/api/services/' . rawurlencode($hostile));
    rp03_test($hostileRead['status'] === 404, 'Hostile API lookup did not produce truthful 404.');

    $unknown = rp03_http($baseUrl . '/api/unknown');
    rp03_test($unknown['status'] === 404, 'Unknown API route did not return 404.');

    $unsupported = rp03_http($baseUrl . '/api/services', 'POST');
    rp03_test($unsupported['status'] === 405, 'Unsupported API method did not return 405.');

    $traversal = rp03_http($baseUrl . '/server/router.php');
    rp03_test($traversal['status'] === 404, 'Server implementation path was exposed.');
    $migrationHttp = rp03_http($baseUrl . '/database/migrate.php');
    rp03_test($migrationHttp['status'] === 404, 'Migration runner was reachable over HTTP.');

    fwrite(STDOUT, "PASS: RP03 Production Foundation W01 integration validation.\n");
} catch (Throwable $error) {
    fwrite(STDERR, 'FAIL: ' . $error->getMessage() . PHP_EOL);
    exit(1);
} finally {
    if (is_resource($serverProcess)) {
        proc_terminate($serverProcess);
        proc_close($serverProcess);
    }

    foreach (glob($tempDirectory . '/*') ?: [] as $path) {
        @unlink($path);
    }
    @rmdir($tempDirectory);
}
