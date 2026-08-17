<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/server/bootstrap.php';

try {
    $pdo = Rp03Database::connect();
    $pdo->beginTransaction();

    $serviceStatement = $pdo->prepare(
        'INSERT OR IGNORE INTO services
            (stable_id, slug, title_ar, description_ar, category, supports_in_person, supports_remote, preparation_context_ar, is_active)
         VALUES
            (:stable_id, :slug, :title_ar, :description_ar, :category, :in_person, :remote, :preparation, 1)'
    );

    $services = [
        ['svc-diagnostic', 'technical-problem-diagnosis', 'جلسة تشخيص مشكلة تقنية', 'تحديد المشكلة بدقة، وفهم أسبابها المحتملة، ومناقشة خيارات عملية لمعالجتها.', 'problem', 1, 1, 'تجهيزات أساسية مطلوبة'],
        ['svc-review', 'technical-review', 'جلسة مراجعة وتقييم تقني', 'مراجعة الوضع التقني الحالي، وتحديد نقاط القوة والفجوات، وترتيب أولويات التحسين.', 'review', 1, 1, 'مستندات أو معلومات مطلوبة'],
        ['svc-planning', 'planning-and-implementation', 'جلسة تخطيط وتنفيذ', 'تحويل الهدف التقني إلى خطة واضحة، مع ترتيب الخطوات والأولويات وخيارات التنفيذ.', 'planning', 1, 1, 'مستندات أو معلومات مطلوبة'],
        ['svc-decision', 'technical-decision-options', 'جلسة تقييم خيارات قبل قرار تقني', 'مقارنة البدائل المطروحة قبل قرار مهم، وتوضيح المفاضلات والعوامل المؤثرة في الاختيار.', 'planning', 0, 1, 'ملخص الخيارات المطروحة'],
        ['svc-existing-review', 'existing-solution-review', 'مراجعة حل أو تنفيذ قائم', 'مراجعة حل منفذ أو قيد التنفيذ، والتحقق من اتجاهه، واقتراح التحسينات ذات الأولوية.', 'review', 1, 1, 'تفاصيل الحل أو التنفيذ الحالي'],
        ['svc-discovery', 'technical-needs-discovery', 'جلسة تحديد الاحتياج التقني', 'توضيح الاحتياج التقني وتحويله إلى متطلبات أولية واضحة تساعدك على اختيار الخطوة التالية.', 'discovery', 1, 1, 'وصف موجز للاحتياج الحالي'],
    ];

    foreach ($services as [$stableId, $slug, $title, $description, $category, $inPerson, $remote, $preparation]) {
        $serviceStatement->execute([
            'stable_id' => $stableId,
            'slug' => $slug,
            'title_ar' => $title,
            'description_ar' => $description,
            'category' => $category,
            'in_person' => $inPerson,
            'remote' => $remote,
            'preparation' => $preparation,
        ]);
    }

    $providerStatement = $pdo->prepare(
        'INSERT OR IGNORE INTO providers (stable_id, name_ar, bio_ar, is_active)
         VALUES (:stable_id, :name_ar, :bio_ar, 1)'
    );
    $providerStatement->execute([
        'stable_id' => 'provider-demo-001',
        'name_ar' => 'مستشار تقني تجريبي',
        'bio_ar' => 'سجل اصطناعي مخصص للتحقق المحلي فقط.',
    ]);

    $resourceStatement = $pdo->prepare(
        'INSERT OR IGNORE INTO resources (stable_id, name_ar, resource_type, description_ar, is_active)
         VALUES (:stable_id, :name_ar, :resource_type, :description_ar, 1)'
    );
    $resourceStatement->execute([
        'stable_id' => 'resource-demo-room-001',
        'name_ar' => 'غرفة استشارة تجريبية',
        'resource_type' => 'consultation-room',
        'description_ar' => 'مورد اصطناعي مخصص للتحقق المحلي فقط.',
    ]);

    $capabilityStatement = $pdo->prepare(
        'INSERT OR IGNORE INTO provider_capabilities (provider_id, service_id, capability_note_ar)
         SELECT p.id, s.id, :note
         FROM providers p, services s
         WHERE p.stable_id = :provider_stable_id AND s.slug = :service_slug'
    );
    $capabilityStatement->execute([
        'note' => 'قدرة تجريبية لا تمثل تعيينًا أو جدولًا أو توافرًا.',
        'provider_stable_id' => 'provider-demo-001',
        'service_slug' => 'technical-review',
    ]);

    $pdo->commit();
    fwrite(STDOUT, "Synthetic development seed complete.\n");
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, "Seed failed: " . $error->getMessage() . PHP_EOL);
    exit(1);
}
