(() => {
  "use strict";

  const STORAGE_KEY = "rp03.admin.operations.v1";

  const seedState = () => ({
    version: 1,
    services: [
      {
        id: "svc-problem-diagnosis",
        title: "جلسة تشخيص مشكلة تقنية",
        description: "تحديد المشكلة بدقة، وفهم أسبابها المحتملة، ومناقشة خيارات عملية لمعالجتها.",
        category: "تشخيص وحل المشكلات",
        duration: "60–90 دقيقة",
        modes: ["حضوري", "عن بُعد"],
        preparationRequired: true,
        preparationSummary: "تجهيز وصف مختصر للمشكلة وأي معلومات تقنية أساسية متاحة.",
        active: true,
        origin: "accepted-catalog-reference"
      },
      {
        id: "svc-technical-review",
        title: "جلسة مراجعة وتقييم تقني",
        description: "مراجعة الوضع التقني الحالي، وتحديد نقاط القوة والفجوات، وترتيب أولويات التحسين.",
        category: "مراجعة وتقييم",
        duration: "60–90 دقيقة",
        modes: ["حضوري", "عن بُعد"],
        preparationRequired: true,
        preparationSummary: "مستندات أو معلومات مرتبطة بالنظام أو الحل محل المراجعة.",
        active: true,
        origin: "accepted-catalog-reference"
      },
      {
        id: "svc-planning-execution",
        title: "جلسة تخطيط وتنفيذ",
        description: "تحويل الهدف التقني إلى خطة واضحة، مع ترتيب الخطوات والأولويات وخيارات التنفيذ.",
        category: "تخطيط وقرارات",
        duration: "90–120 دقيقة",
        modes: ["حضوري", "عن بُعد"],
        preparationRequired: true,
        preparationSummary: "ملخص الهدف الحالي والقيود أو الخيارات المعروفة قبل الجلسة.",
        active: true,
        origin: "accepted-catalog-reference"
      },
      {
        id: "svc-options-review",
        title: "جلسة تقييم خيارات قبل قرار تقني",
        description: "مقارنة البدائل المطروحة قبل قرار مهم، وتوضيح المفاضلات والعوامل المؤثرة في الاختيار.",
        category: "تخطيط وقرارات",
        duration: "60–90 دقيقة",
        modes: ["عن بُعد"],
        preparationRequired: true,
        preparationSummary: "تجهيز البدائل أو الأسئلة التي تحتاج إلى مقارنة قبل القرار.",
        active: true,
        origin: "accepted-catalog-reference"
      },
      {
        id: "svc-existing-solution-review",
        title: "مراجعة حل أو تنفيذ قائم",
        description: "مراجعة حل منفذ أو قيد التنفيذ، والتحقق من اتجاهه، واقتراح التحسينات ذات الأولوية.",
        category: "مراجعة وتقييم",
        duration: "60–90 دقيقة",
        modes: ["حضوري", "عن بُعد"],
        preparationRequired: true,
        preparationSummary: "ملخص للحل القائم والمواد المتاحة لفهم حالته الحالية.",
        active: true,
        origin: "accepted-catalog-reference"
      },
      {
        id: "svc-needs-discovery",
        title: "جلسة تحديد الاحتياج التقني",
        description: "توضيح الاحتياج التقني وتحويله إلى متطلبات أولية واضحة تساعد على اختيار الخطوة التالية.",
        category: "تحديد الاحتياج",
        duration: "60–90 دقيقة",
        modes: ["حضوري", "عن بُعد"],
        preparationRequired: false,
        preparationSummary: "لا يتطلب تحضيرًا خاصًا؛ يكفي وصف الهدف أو التحدي الحالي.",
        active: true,
        origin: "accepted-catalog-reference"
      }
    ],
    providers: [
      {
        id: "prv-001",
        name: "أحمد السعدي",
        role: "مستشار تقني أول",
        specialties: ["البنية التقنية", "الأمن السيبراني", "تحليل الأنظمة"],
        experience: "8 سنوات",
        modes: ["حضوري", "عن بُعد"],
        active: true,
        notes: "سجل وصفي اصطناعي لإظهار القدرات المهنية فقط؛ لا يعبّر عن جدول أو توفر حي."
      },
      {
        id: "prv-002",
        name: "سارة الجبري",
        role: "مستشارة تقنية",
        specialties: ["تخطيط تقني", "تحليل الأنظمة"],
        experience: "6 سنوات",
        modes: ["عن بُعد"],
        active: true,
        notes: "القدرات الوصفية مستقلة عن الإسناد والحجوزات."
      },
      {
        id: "prv-003",
        name: "محمد العريقي",
        role: "مستشار تقني أول",
        specialties: ["السحابة", "DevOps"],
        experience: "10 سنوات",
        modes: ["حضوري", "عن بُعد"],
        active: true,
        notes: "لا تمثل حالة السجل أي تعهّد بتوفر زمني."
      },
      {
        id: "prv-004",
        name: "نورا الشامي",
        role: "مستشارة تقنية",
        specialties: ["تطوير التطبيقات", "الجودة"],
        experience: "4 سنوات",
        modes: ["حضوري"],
        active: true,
        notes: "معلومات اصطناعية محلية لاستخدام الواجهة فقط."
      },
      {
        id: "prv-005",
        name: "فهد المالكي",
        role: "مستشار تقني",
        specialties: ["الشبكات"],
        experience: "5 سنوات",
        modes: ["عن بُعد"],
        active: false,
        notes: "تعطيل السجل محلي ولا يغيّر أي جلسة أو إسناد قائم."
      }
    ],
    resources: [
      {
        id: "res-room-01",
        name: "غرفة الاستشارة 1",
        type: "غرفة استشارة",
        capacity: 4,
        characteristics: ["شاشة عرض", "اتصال مرئي"],
        active: true,
        notes: "بيانات وصفية فقط؛ الحجز والإشغال التشغيليان يبقيان في سطح جدول الموارد التشغيلي."
      },
      {
        id: "res-room-02",
        name: "غرفة الاستشارة 2",
        type: "غرفة استشارة",
        capacity: 6,
        characteristics: ["شاشة عرض", "سبورة"],
        active: true,
        notes: "لا يتيح هذا السطح حجز الغرفة أو إعادة إسنادها."
      },
      {
        id: "res-room-03",
        name: "غرفة اجتماعات صغيرة",
        type: "غرفة اجتماعات",
        capacity: 8,
        characteristics: ["شاشة عرض", "اجتماع هجين"],
        active: true,
        notes: "سجل تعريفي اصطناعي محلي."
      },
      {
        id: "res-kit-01",
        name: "حزمة اتصال مرئي (أ)",
        type: "مورد تقني",
        capacity: 1,
        characteristics: ["كاميرا", "ميكروفون", "سماعة"],
        active: true,
        notes: "لا تمثل الحالة توفرًا تشغيليًا في وقت محدد."
      },
      {
        id: "res-room-04",
        name: "غرفة مراجعة داخلية",
        type: "غرفة داخلية",
        capacity: 5,
        characteristics: ["شاشة عرض"],
        active: false,
        notes: "تعطيل السجل الوصفي لا يغيّر سجلات الإشغال التشغيلية."
      }
    ],
    availabilityRules: [
      {
        id: "rule-center-hours",
        title: "ساعات العمل القياسية",
        scopeType: "CENTER",
        scopeLabel: "جميع الخدمات",
        days: "الأحد–الخميس",
        startTime: "09:00",
        endTime: "17:00",
        active: true,
        notes: "قاعدة محلية اصطناعية لعرض مفهوم التوفر؛ لا تعدّل الحجوزات أو الجداول التشغيلية."
      },
      {
        id: "rule-remote-review",
        title: "نافذة الاستشارات عن بُعد",
        scopeType: "SERVICE",
        scopeLabel: "جلسة مراجعة وتقييم تقني",
        days: "الأحد–الأربعاء",
        startTime: "10:00",
        endTime: "16:00",
        active: true,
        notes: "قاعدة خاصة بخدمة اصطناعية ضمن هذا النموذج المحلي."
      },
      {
        id: "rule-provider-ahmed",
        title: "قاعدة محلية لسجل أحمد السعدي",
        scopeType: "PROVIDER",
        scopeLabel: "أحمد السعدي",
        days: "الاثنين–الخميس",
        startTime: "11:00",
        endTime: "16:00",
        active: true,
        notes: "هذه ليست جدول المستشار ولا إسنادًا لحجوزات."
      },
      {
        id: "rule-room-02",
        title: "ساعات استخدام غرفة الاستشارة 2",
        scopeType: "RESOURCE",
        scopeLabel: "غرفة الاستشارة 2",
        days: "الأحد–الخميس",
        startTime: "09:00",
        endTime: "15:00",
        active: false,
        notes: "لا تمثل إشغال الغرفة الفعلي، ولا تحجز موردًا."
      }
    ],
    exceptions: [
      {
        id: "exc-maint-01",
        type: "MAINTENANCE",
        title: "صيانة غرفة الاستشارة 2",
        scopeType: "RESOURCE",
        scopeLabel: "غرفة الاستشارة 2",
        startDate: "2026-08-14",
        endDate: "2026-08-14",
        startTime: "10:00",
        endTime: "13:00",
        state: "SCHEDULED",
        notes: "حجب معلوماتي محلي لمراجعة الأثر فقط."
      },
      {
        id: "exc-leave-01",
        type: "PROVIDER_LEAVE",
        title: "غياب مخطط — أحمد السعدي",
        scopeType: "PROVIDER",
        scopeLabel: "أحمد السعدي",
        startDate: "2026-08-17",
        endDate: "2026-08-18",
        startTime: "09:00",
        endTime: "17:00",
        state: "PENDING_REVIEW",
        notes: "السجل لا يرسل إشعارًا ولا يعيد إسناد أي حجز."
      },
      {
        id: "exc-hours-01",
        type: "MODIFIED_HOURS",
        title: "ساعات معدّلة لفترة صباحية",
        scopeType: "CENTER",
        scopeLabel: "جميع الخدمات",
        startDate: "2026-08-20",
        endDate: "2026-08-20",
        startTime: "09:00",
        endTime: "12:00",
        state: "ACTIVE",
        notes: "معاينة محلية فقط؛ لا تغيّر حجوزات العملاء أو سجلات إدارة الحجوزات."
      },
      {
        id: "exc-internal-01",
        type: "INTERNAL_BLOCK",
        title: "حجب داخلي لاجتماع الفريق",
        scopeType: "CENTER",
        scopeLabel: "جميع الخدمات",
        startDate: "2026-08-21",
        endDate: "2026-08-21",
        startTime: "13:00",
        endTime: "14:00",
        state: "ENDED",
        notes: "سجل سابق اصطناعي للعرض."
      }
    ]
  });

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const asString = (value, fallback = "") => typeof value === "string" ? value : fallback;
  const asBoolean = (value, fallback = false) => typeof value === "boolean" ? value : fallback;
  const asStringList = (value, allowed = null) => Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && (!allowed || allowed.has(item))).slice(0, 50)
    : [];
  const validTime = (value) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const validDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const SESSION_MODES = new Set(["حضوري", "عن بُعد"]);
  const SCOPE_TYPES = new Set(["CENTER", "SERVICE", "PROVIDER", "RESOURCE"]);
  const EXCEPTION_TYPES = new Set(["CLOSURE", "MAINTENANCE", "PROVIDER_LEAVE", "MODIFIED_HOURS", "INTERNAL_BLOCK"]);
  const EXCEPTION_STATES = new Set(["ACTIVE", "SCHEDULED", "PENDING_REVIEW", "ENDED"]);

  const normalizeCollection = (value, normalizer, fallback) => {
    if (!Array.isArray(value)) return clone(fallback);
    return value.map(normalizer).filter(Boolean);
  };

  const normalizeService = (item) => {
    if (!item || typeof item !== "object") return null;
    const id = asString(item.id).trim();
    const title = asString(item.title).trim();
    const description = asString(item.description).trim();
    const category = asString(item.category).trim();
    const duration = asString(item.duration).trim();
    if (!id || !title || !description || !category || !duration) return null;
    return {
      id,
      title,
      description,
      category,
      duration,
      modes: asStringList(item.modes, SESSION_MODES),
      preparationRequired: asBoolean(item.preparationRequired),
      preparationSummary: asString(item.preparationSummary),
      active: asBoolean(item.active),
      origin: asString(item.origin, "synthetic-admin-local")
    };
  };

  const normalizeProvider = (item) => {
    if (!item || typeof item !== "object") return null;
    const id = asString(item.id).trim();
    const name = asString(item.name).trim();
    const role = asString(item.role).trim();
    if (!id || !name || !role) return null;
    return {
      id,
      name,
      role,
      specialties: asStringList(item.specialties),
      experience: asString(item.experience),
      modes: asStringList(item.modes, SESSION_MODES),
      active: asBoolean(item.active),
      notes: asString(item.notes)
    };
  };

  const normalizeResource = (item) => {
    if (!item || typeof item !== "object") return null;
    const id = asString(item.id).trim();
    const name = asString(item.name).trim();
    const type = asString(item.type).trim();
    const capacity = Number(item.capacity);
    if (!id || !name || !type || !Number.isFinite(capacity) || capacity < 1) return null;
    return {
      id,
      name,
      type,
      capacity,
      characteristics: asStringList(item.characteristics),
      active: asBoolean(item.active),
      notes: asString(item.notes)
    };
  };

  const normalizeRule = (item) => {
    if (!item || typeof item !== "object") return null;
    const id = asString(item.id).trim();
    const title = asString(item.title).trim();
    const scopeLabel = asString(item.scopeLabel).trim();
    const days = asString(item.days).trim();
    if (!id || !title || !SCOPE_TYPES.has(item.scopeType) || !scopeLabel || !days || !validTime(item.startTime) || !validTime(item.endTime)) return null;
    return {
      id,
      title,
      scopeType: item.scopeType,
      scopeLabel,
      days,
      startTime: item.startTime,
      endTime: item.endTime,
      active: asBoolean(item.active),
      notes: asString(item.notes)
    };
  };

  const normalizeException = (item) => {
    if (!item || typeof item !== "object") return null;
    const id = asString(item.id).trim();
    const title = asString(item.title).trim();
    const scopeLabel = asString(item.scopeLabel).trim();
    if (
      !id || !title || !EXCEPTION_TYPES.has(item.type) || !SCOPE_TYPES.has(item.scopeType) || !scopeLabel ||
      !validDate(item.startDate) || !validDate(item.endDate) || !validTime(item.startTime) || !validTime(item.endTime) ||
      !EXCEPTION_STATES.has(item.state)
    ) return null;
    return {
      id,
      type: item.type,
      title,
      scopeType: item.scopeType,
      scopeLabel,
      startDate: item.startDate,
      endDate: item.endDate,
      startTime: item.startTime,
      endTime: item.endTime,
      state: item.state,
      notes: asString(item.notes)
    };
  };

  const normalizeState = (value) => {
    const fallback = seedState();
    if (!value || typeof value !== "object") return fallback;
    return {
      version: 1,
      services: normalizeCollection(value.services, normalizeService, fallback.services),
      providers: normalizeCollection(value.providers, normalizeProvider, fallback.providers),
      resources: normalizeCollection(value.resources, normalizeResource, fallback.resources),
      availabilityRules: normalizeCollection(value.availabilityRules, normalizeRule, fallback.availabilityRules),
      exceptions: normalizeCollection(value.exceptions, normalizeException, fallback.exceptions)
    };
  };

  const load = () => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = seedState();
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return clone(initial);
      }
      return clone(normalizeState(JSON.parse(raw)));
    } catch {
      return seedState();
    }
  };

  const save = (state) => {
    const normalized = normalizeState(state);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // Admin fixtures remain usable even when sessionStorage is inaccessible.
    }
    return clone(normalized);
  };

  const mutate = (mutator) => {
    const state = load();
    mutator(state);
    return save(state);
  };

  const makeId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  const upsert = (collectionName, record, prefix) => mutate((state) => {
    const collection = state[collectionName];
    const index = collection.findIndex((item) => item.id === record.id);
    const next = clone(record);
    if (index === -1) {
      next.id = record.id || makeId(prefix);
      collection.unshift(next);
    } else {
      collection[index] = next;
    }
  });

  const datesOverlap = (aStart, aEnd, bStart, bEnd) => aStart <= bEnd && bStart <= aEnd;
  const timesOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

  const overlappingExceptions = (candidate, ignoreId = null) => load().exceptions.filter((item) => {
    if (item.id === ignoreId || item.state === "ENDED") return false;
    if (candidate.scopeType !== item.scopeType || candidate.scopeLabel !== item.scopeLabel) return false;
    if (!datesOverlap(candidate.startDate, candidate.endDate, item.startDate, item.endDate)) return false;
    return timesOverlap(candidate.startTime, candidate.endTime, item.startTime, item.endTime);
  });

  const impactPreview = (exceptionRecord) => {
    if (!exceptionRecord) return [];
    const impacts = [];
    if (exceptionRecord.scopeType === "CENTER") {
      impacts.push("قد تتقاطع الفترة مع عدة خدمات اصطناعية ضمن النطاق العام.");
    } else if (exceptionRecord.scopeType === "PROVIDER") {
      impacts.push(`يتقاطع النطاق الوصفي مع سجل المستشار: ${exceptionRecord.scopeLabel}.`);
    } else if (exceptionRecord.scopeType === "RESOURCE") {
      impacts.push(`يتقاطع النطاق الوصفي مع المورد: ${exceptionRecord.scopeLabel}.`);
    } else if (exceptionRecord.scopeType === "SERVICE") {
      impacts.push(`يتقاطع النطاق مع الخدمة الاصطناعية: ${exceptionRecord.scopeLabel}.`);
    }
    impacts.push(`الفترة المحلية: ${exceptionRecord.startDate} من ${exceptionRecord.startTime} إلى ${exceptionRecord.endDate} ${exceptionRecord.endTime}.`);
    impacts.push("قد يتطلب الأثر مراجعة تشغيلية، لكنه لا يغيّر الحجوزات أو الجداول أو الإسناد تلقائيًا.");
    return impacts;
  };

  window.RP03AdminState = Object.freeze({
    STORAGE_KEY,
    load,
    save,
    reset: () => save(seedState()),
    upsertService: (record) => upsert("services", record, "svc-local"),
    upsertProvider: (record) => upsert("providers", record, "prv-local"),
    upsertResource: (record) => upsert("resources", record, "res-local"),
    upsertRule: (record) => upsert("availabilityRules", record, "rule-local"),
    upsertException: (record) => upsert("exceptions", record, "exc-local"),
    overlappingExceptions,
    impactPreview
  });
})();
