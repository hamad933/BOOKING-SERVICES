<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$requestTarget = $_SERVER['REQUEST_URI'] ?? '/';
$rawPath = parse_url($requestTarget, PHP_URL_PATH);

if (!is_string($rawPath)) {
    rp03_error(400, 'invalid_request', 'The request path is invalid.');
}

$path = rawurldecode($rawPath);
if ($path === '' || $path[0] !== '/' || str_contains($path, "\0") || str_contains($path, '\\')) {
    rp03_error(400, 'invalid_request', 'The request path is invalid.');
}

if (preg_match('#(?:^|/)\.\.?(/|$)#', $path) === 1) {
    rp03_error(400, 'invalid_request', 'The request path is invalid.');
}

if ($path === '/api/health' || $path === '/api/services' || str_starts_with($path, '/api/services/')) {
    if ($method !== 'GET') {
        rp03_error(405, 'method_not_allowed', 'Only GET is supported for this endpoint.', ['Allow' => 'GET']);
    }

    try {
        $pdo = Rp03Database::connect();

        if ($path === '/api/health') {
            $pdo->query('SELECT COUNT(*) FROM schema_migrations')->fetchColumn();
            rp03_json(200, ['status' => 'ok']);
        }

        $repository = new Rp03ServiceRepository($pdo);

        if ($path === '/api/services') {
            rp03_json(200, ['services' => $repository->allActive()]);
        }

        $slug = substr($path, strlen('/api/services/'));
        if ($slug === '' || str_contains($slug, '/')) {
            rp03_error(404, 'not_found', 'Resource not found.');
        }

        $service = $repository->findActiveBySlug($slug);
        if ($service === null) {
            rp03_error(404, 'not_found', 'Resource not found.');
        }

        rp03_json(200, ['service' => $service]);
    } catch (Throwable) {
        if ($path === '/api/health') {
            rp03_error(503, 'service_unavailable', 'The service is unavailable.');
        }
        rp03_error(500, 'internal_error', 'The request could not be completed.');
    }
}

if (str_starts_with($path, '/api/')) {
    rp03_error(404, 'not_found', 'Resource not found.');
}

if (!in_array($method, ['GET', 'HEAD'], true)) {
    rp03_error(405, 'method_not_allowed', 'Only GET and HEAD are supported.', ['Allow' => 'GET, HEAD']);
}

$root = dirname(__DIR__);
$blockedPrefixes = ['/.', '/server/', '/database/', '/tests/'];
foreach ($blockedPrefixes as $prefix) {
    if (str_starts_with($path, $prefix)) {
        rp03_error(404, 'not_found', 'Resource not found.');
    }
}

$relative = ltrim($path, '/');
if ($relative === '') {
    $relative = 'index.html';
} elseif (str_ends_with($path, '/')) {
    $relative .= 'index.html';
} elseif (is_dir($root . '/' . $relative)) {
    $relative .= '/index.html';
}

$candidate = realpath($root . '/' . $relative);
$rootReal = realpath($root);
if ($candidate === false || $rootReal === false || !is_file($candidate)) {
    rp03_error(404, 'not_found', 'Resource not found.');
}

$rootPrefix = rtrim($rootReal, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
if (!str_starts_with($candidate, $rootPrefix)) {
    rp03_error(404, 'not_found', 'Resource not found.');
}

$extension = strtolower(pathinfo($candidate, PATHINFO_EXTENSION));
$contentTypes = [
    'html' => 'text/html; charset=utf-8',
    'css' => 'text/css; charset=utf-8',
    'js' => 'text/javascript; charset=utf-8',
    'svg' => 'image/svg+xml',
    'png' => 'image/png',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'webp' => 'image/webp',
    'ico' => 'image/x-icon',
];

if (!isset($contentTypes[$extension])) {
    rp03_error(404, 'not_found', 'Resource not found.');
}

header('Content-Type: ' . $contentTypes[$extension]);
header('X-Content-Type-Options: nosniff');
if ($method === 'GET') {
    readfile($candidate);
}
exit;
