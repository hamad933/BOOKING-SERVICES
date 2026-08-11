(() => {
  "use strict";

  const auth = window.RP03Auth;
  if (!auth) return;

  const session = auth.readSession();
  const allowedRoles = [auth.ROLES.CONSULTANT, auth.ROLES.ADMIN];
  if (!session || !allowedRoles.includes(session.role)) return;

  const TIMEZONE = "Asia/Aden";
  const STORAGE_KEY = "rp03.s07.resource.schedule.v1";
  const DAY_MS = 86400000;
  const START_MINUTE = 8 * 60;
  const END_MINUTE = 18 * 60;
  const TOTAL_MINUTES = END_MINUTE - START_MINUTE;

  const elements = {
    dateLabel: document.querySelector("#selected-date-label"),
    dateSubLabel: document.querySelector("#selected-date-sub-label"),
    previousDate: document.querySelector("#previous-date"),
    nextDate: document.querySelector("#next-date"),
    today: document.querySelector("#today-date"),
    nowBadge: document.querySelector("#now-badge"),
    timeRuler: document.querySelector("#time-ruler"),
    timelineGrid: document.querySelector("#timeline-grid"),
    currentLine: document.querySelector("#current-time-line"),
    currentTimeLabel: document.querySelector("#current-time-label"),
    currentContext: document.querySelector("#timeline-current-context"),
    rows: document.querySelector("#resource-rows"),
    empty: document.querySelector("#timeline-empty"),
    timelineScroll: document.querySelector("#timeline-scroll"),
    detailPanel: document.querySelector("#detail-panel"),
    detailKicker: document.querySelector("#detail-kicker"),
    detailTitle: document.querySelector("#detail-title"),
    detailSubtitle: document.querySelector("#detail-subtitle"),
    detailStatus: document.querySelector("#detail-status"),
    detailResource: document.querySelector("#detail-resource"),
    detailTime: document.querySelector("#detail-time"),
    detailBookingId: document.querySelector("#detail-booking-id"),
    detailService: document.querySelector("#detail-service"),
    detailConsultant: document.querySelector("#detail-consultant"),
    detailMode: document.querySelector("#detail-mode"),
    detailCapacity: document.querySelector("#detail-capacity"),
    detailOccupancy: document.querySelector("#detail-occupancy"),
    detailNote: document.querySelector("#detail-note"),
    detailToggle: document.querySelector("#detail-context-toggle"),
    detailExtra: document.querySelector("#detail-extra"),
    attentionCount: document.querySelector("#attention-count"),
    attentionList: document.querySelector("#attention-list"),
    attentionEmpty: document.querySelector("#attention-empty"),
    announcer: document.querySelector("#resource-announcer")
  };

  const resources = [
    { id: "room-1", name: "غرفة 1", capacity: "6 أشخاص", type: "غرفة استشارة" },
    { id: "room-2", name: "غرفة 2", capacity: "6 أشخاص", type: "غرفة استشارة" },
    { id: "room-3", name: "غرفة 3", capacity: "8 أشخاص", type: "غرفة استشارة" },
    { id: "meeting-room", name: "قاعة الاجتماعات", capacity: "12 شخصًا", type: "قاعة متعددة الاستخدام" },
    { id: "remote-studio", name: "استوديو الجلسات عن بُعد", capacity: "مورد تقني", type: "مساحة تقنية" }
  ];

  const baseBlocks = [
    {
      id: "room-1-prep",
      resourceId: "room-1",
      start: "08:00",
      end: "09:00",
      state: "PREPARATION",
      title: "تهيئة الغرفة",
      note: "تجهيز الشاشة والمواد قبل أول جلسة حضورية."
    },
    {
      id: "room-1-0900",
      resourceId: "room-1",
      start: "09:00",
      end: "10:30",
      state: "BOOKED",
      title: "جلسة استشارية تقنية",
      bookingId: "BK-2026-0194",
      service: "جلسة استشارية تقنية",
      consultant: "د. محمد العتيبي",
      mode: "حضوري",
      note: "جلسة اصطناعية مرتبطة بغرفة 1 للعرض التشغيلي فقط."
    },
    {
      id: "room-1-1330",
      resourceId: "room-1",
      start: "13:30",
      end: "15:00",
      state: "BOOKED",
      title: "جلسة مراجعة تقنية",
      bookingId: "BK-2026-0211",
      service: "مراجعة وتقييم تقني",
      consultant: "أ. سارة القحطاني",
      mode: "حضوري",
      note: "المواد المرجعية مكتملة ضمن بيانات العرض الاصطناعية."
    },
    {
      id: "room-1-block",
      resourceId: "room-1",
      start: "16:00",
      end: "18:00",
      state: "BLOCKED",
      title: "تنظيف وتجهيز",
      note: "فترة محظورة اصطناعيًا وغير متاحة للاستخدام خلال هذا النطاق."
    },
    {
      id: "room-2-0800",
      resourceId: "room-2",
      start: "08:00",
      end: "09:00",
      state: "BOOKED",
      title: "جلسة بدء المشروع",
      bookingId: "BK-2026-0187",
      service: "جلسة بدء مشروع تقني",
      consultant: "أ. علي الشمري",
      mode: "حضوري",
      note: "سياق اصطناعي لعرض إشغال الغرفة."
    },
    {
      id: "room-2-1215",
      resourceId: "room-2",
      start: "12:15",
      end: "13:15",
      state: "BOOKED",
      title: "استشارة حل مشكلة تقنية",
      bookingId: "BK-2026-0208",
      service: "حل مشكلة تقنية",
      consultant: "أ. نواف الحربي",
      mode: "حضوري",
      note: "لا يترتب على العرض أي سلطة تخصيص أو نقل."
    },
    {
      id: "room-3-0915",
      resourceId: "room-3",
      start: "09:15",
      end: "10:15",
      state: "BOOKED",
      title: "جلسة تقييم أولي",
      bookingId: "BK-2026-0198",
      service: "تقييم تقني أولي",
      consultant: "أ. خالد المطيري",
      mode: "حضوري",
      note: "بيانات الجلسة اصطناعية بالكامل."
    },
    {
      id: "room-3-block",
      resourceId: "room-3",
      start: "12:30",
      end: "14:30",
      state: "BLOCKED",
      title: "محظور داخليًا",
      note: "فترة محظورة في بيانات العرض الاصطناعية ولا تمثل سياسة موارد نهائية."
    },
    {
      id: "room-3-1545",
      resourceId: "room-3",
      start: "15:45",
      end: "16:15",
      state: "BOOKED",
      title: "مراجعة وتصميم الحلول",
      bookingId: "BK-2026-0220",
      service: "مراجعة وتصميم الحلول",
      consultant: "أ. ريم الجهني",
      mode: "حضوري",
      note: "جلسة قصيرة اصطناعية ضمن خط الزمن اليومي."
    },
    {
      id: "meeting-prep",
      resourceId: "meeting-room",
      start: "11:00",
      end: "12:30",
      state: "PREPARATION",
      title: "تجهيز القاعة",
      note: "تهيئة العرض والمقاعد قبل ورشة التدريب."
    },
    {
      id: "meeting-1300",
      resourceId: "meeting-room",
      start: "13:00",
      end: "17:00",
      state: "BOOKED",
      title: "ورشة تدريبية للمؤسسات",
      bookingId: "BK-2026-0216",
      service: "ورشة تدريبية تقنية",
      consultant: "فريق التدريب",
      mode: "حضوري",
      note: "حجز اصطناعي طويل لإظهار إشغال القاعة."
    },
    {
      id: "studio-1000",
      resourceId: "remote-studio",
      start: "10:00",
      end: "11:00",
      state: "BOOKED",
      title: "جلسة استشارية عن بُعد",
      bookingId: "BK-2026-0201",
      service: "استشارة تقنية عن بُعد",
      consultant: "أ. هدى الشريف",
      mode: "عن بُعد",
      note: "استخدام اصطناعي لمورد تقني مخصص للجلسات عن بُعد."
    }
  ];

  const state = {
    selectedDateKey: null,
    selectedResourceId: "room-1",
    selectedBlockId: "room-1-0900",
    detailExpanded: false
  };

  const adenParts = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date);

    return Object.fromEntries(parts.map((part) => [part.type, part.value]));
  };

  const dateKeyFromParts = (parts) => `${parts.year}-${parts.month}-${parts.day}`;
  const initialNowParts = adenParts();
  const todayKey = dateKeyFromParts(initialNowParts);

  const dateFromKey = (key) => {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  };

  const keyFromDate = (date) => [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");

  const moveDateKey = (key, days) => keyFromDate(new Date(dateFromKey(key).getTime() + (days * DAY_MS)));

  const formatFullDate = (key) => new Intl.DateTimeFormat("ar-YE-u-nu-latn", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(dateFromKey(key));

  const formatCompactDate = (key) => new Intl.DateTimeFormat("ar-YE-u-nu-latn", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(dateFromKey(key));

  const minutesFromTime = (value) => {
    const [hour, minute] = value.split(":").map(Number);
    return (hour * 60) + minute;
  };

  const currentAdenParts = () => adenParts();
  const currentAdenMinutes = () => {
    const parts = currentAdenParts();
    return (Number(parts.hour) * 60) + Number(parts.minute);
  };

  const statusPresentation = (status) => ({
    AVAILABLE: { label: "متاح", className: "status-available" },
    BOOKED: { label: "محجوز", className: "status-booked" },
    BLOCKED: { label: "محظور", className: "status-blocked" },
    PREPARATION: { label: "تجهيز", className: "status-preparation" },
    ENDING_SOON: { label: "ينتهي قريبًا", className: "status-ending-soon" }
  }[status]);

  const restoreState = () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return;
      if (typeof saved.selectedDateKey === "string") state.selectedDateKey = saved.selectedDateKey;
      if (typeof saved.selectedResourceId === "string") state.selectedResourceId = saved.selectedResourceId;
      if (typeof saved.selectedBlockId === "string") state.selectedBlockId = saved.selectedBlockId;
      state.detailExpanded = Boolean(saved.detailExpanded);
    } catch {
      // The deterministic fixture works without browser storage.
    }
  };

  const saveState = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Session continuity is optional for this local-only surface.
    }
  };

  const fixtureBlocksForDate = (dateKey) => {
    const offset = Math.round((dateFromKey(dateKey) - dateFromKey(todayKey)) / DAY_MS);
    if (Math.abs(offset) > 14 || offset === 4 || offset === -5) return [];
    return baseBlocks.map((block) => ({ ...block }));
  };

  const effectiveState = (block, dateKey) => {
    if (block.state !== "BOOKED" || dateKey !== todayKey) return block.state;
    const now = currentAdenMinutes();
    const start = minutesFromTime(block.start);
    const end = minutesFromTime(block.end);
    if (now >= start && now < end && (end - now) <= 30) return "ENDING_SOON";
    return "BOOKED";
  };

  const resourceFor = (id) => resources.find((resource) => resource.id === id) || null;

  const selectedBlock = (blocks) => blocks.find((block) => block.id === state.selectedBlockId) || null;

  const currentOrNextBlock = (blocks, resourceId) => {
    const resourceBlocks = blocks
      .filter((block) => block.resourceId === resourceId)
      .sort((a, b) => minutesFromTime(a.start) - minutesFromTime(b.start));

    if (!resourceBlocks.length) return null;
    if (state.selectedDateKey !== todayKey) return resourceBlocks[0];

    const now = currentAdenMinutes();
    const current = resourceBlocks.find((block) => {
      const start = minutesFromTime(block.start);
      const end = minutesFromTime(block.end);
      return now >= start && now < end;
    });
    if (current) return current;
    return resourceBlocks.find((block) => minutesFromTime(block.start) > now) || null;
  };

  const currentStateForResource = (blocks, resourceId) => {
    if (state.selectedDateKey !== todayKey) return { label: "سياق اليوم المختار", status: null };

    const now = currentAdenMinutes();
    if (now < START_MINUTE || now > END_MINUTE) {
      return { label: "خارج نطاق الجدول الآن", status: null };
    }

    const active = blocks.find((block) => {
      if (block.resourceId !== resourceId) return false;
      const start = minutesFromTime(block.start);
      const end = minutesFromTime(block.end);
      return now >= start && now < end;
    });

    if (!active) return { label: "متاح الآن", status: "AVAILABLE" };
    const status = effectiveState(active, state.selectedDateKey);
    return { label: `${statusPresentation(status).label} الآن`, status };
  };

  const announce = (message) => {
    elements.announcer.textContent = "";
    window.setTimeout(() => {
      elements.announcer.textContent = message;
    }, 20);
  };

  const renderTimeRuler = () => {
    elements.timeRuler.replaceChildren();
    for (let hour = 8; hour < 18; hour += 1) {
      const tick = document.createElement("span");
      tick.className = "time-tick";
      tick.textContent = `${String(hour).padStart(2, "0")}:00`;
      elements.timeRuler.append(tick);
    }
  };

  const renderCurrentTime = () => {
    const liveParts = currentAdenParts();
    const now = (Number(liveParts.hour) * 60) + Number(liveParts.minute);
    const timeText = `${String(liveParts.hour).padStart(2, "0")}:${String(liveParts.minute).padStart(2, "0")}`;
    elements.nowBadge.textContent = `الآن ${timeText}`;

    if (state.selectedDateKey !== todayKey) {
      elements.currentLine.hidden = true;
      elements.currentContext.textContent = "مؤشر الوقت الحالي يظهر فقط عند عرض اليوم الحالي.";
      return;
    }

    if (now < START_MINUTE) {
      elements.currentLine.hidden = true;
      elements.currentContext.textContent = `الوقت الحالي ${timeText} — قبل بداية نطاق الجدول الظاهر 08:00–18:00.`;
      return;
    }

    if (now > END_MINUTE) {
      elements.currentLine.hidden = true;
      elements.currentContext.textContent = `الوقت الحالي ${timeText} — بعد نهاية نطاق الجدول الظاهر 08:00–18:00.`;
      return;
    }

    elements.currentTimeLabel.textContent = timeText;
    elements.currentLine.hidden = false;
    elements.currentContext.textContent = `الخط الأحمر يحدد الوقت الحالي ${timeText} حسب Asia/Aden.`;
  };

  const positionCurrentTimeLine = () => {
    if (elements.currentLine.hidden || !elements.timelineGrid) return;
    const firstTrack = elements.rows.querySelector(".resource-track");
    if (!firstTrack) {
      elements.currentLine.hidden = true;
      return;
    }

    const now = currentAdenMinutes();
    const fraction = Math.min(1, Math.max(0, (now - START_MINUTE) / TOTAL_MINUTES));
    const gridRect = elements.timelineGrid.getBoundingClientRect();
    const trackRect = firstTrack.getBoundingClientRect();
    const left = (trackRect.left - gridRect.left) + (trackRect.width * fraction);
    elements.currentLine.style.left = `${left}px`;
  };

  const renderDate = () => {
    elements.dateLabel.textContent = formatFullDate(state.selectedDateKey);
    elements.dateSubLabel.textContent = state.selectedDateKey === todayKey
      ? "اليوم — بيانات تشغيلية اصطناعية"
      : `${formatCompactDate(state.selectedDateKey)} — بيانات تشغيلية اصطناعية`;
    elements.today.disabled = state.selectedDateKey === todayKey;
  };

  const blockPosition = (block) => {
    const start = Math.max(START_MINUTE, minutesFromTime(block.start));
    const end = Math.min(END_MINUTE, minutesFromTime(block.end));
    const left = ((start - START_MINUTE) / TOTAL_MINUTES) * 100;
    const width = ((end - start) / TOTAL_MINUTES) * 100;
    return { left, width };
  };

  const selectResource = (resourceId, focusDetail = false) => {
    state.selectedResourceId = resourceId;
    const blocks = fixtureBlocksForDate(state.selectedDateKey);
    const next = currentOrNextBlock(blocks, resourceId);
    state.selectedBlockId = next?.id || null;
    saveState();
    render();
    announce(`تم تحديد ${resourceFor(resourceId)?.name || "المورد"}.`);
    if (focusDetail) elements.detailPanel.focus();
  };

  const selectBlock = (blockId, resourceId, focusDetail = false) => {
    state.selectedResourceId = resourceId;
    state.selectedBlockId = blockId;
    saveState();
    render();
    const block = fixtureBlocksForDate(state.selectedDateKey).find((item) => item.id === blockId);
    announce(block ? `تم تحديد ${block.title} في ${resourceFor(resourceId)?.name || "المورد"}.` : "تم تحديث الاختيار.");
    if (focusDetail) elements.detailPanel.focus();
  };

  const renderRows = (blocks) => {
    elements.rows.replaceChildren();
    elements.empty.hidden = blocks.length !== 0;

    if (!blocks.length) return;

    resources.forEach((resource) => {
      const row = document.createElement("div");
      row.className = "resource-row";
      row.dataset.resourceId = resource.id;

      const label = document.createElement("button");
      label.type = "button";
      label.className = "resource-label";
      label.setAttribute("aria-pressed", String(state.selectedResourceId === resource.id));
      const currentResourceState = currentStateForResource(blocks, resource.id);
      label.setAttribute("aria-label", `${resource.name}، ${resource.type}، ${resource.capacity}، ${currentResourceState.label}`);

      const name = document.createElement("strong");
      name.textContent = resource.name;
      const type = document.createElement("span");
      type.textContent = resource.type;
      const capacity = document.createElement("span");
      capacity.textContent = `السعة: ${resource.capacity}`;
      const currentState = document.createElement("span");
      currentState.className = `resource-current-state${currentResourceState.status ? ` resource-current-${currentResourceState.status.toLowerCase().replaceAll("_", "-")}` : ""}`;
      currentState.textContent = currentResourceState.label;
      const selected = document.createElement("small");
      selected.textContent = "المورد المحدد";
      label.append(name, type, capacity, currentState, selected);
      label.addEventListener("click", () => selectResource(resource.id, true));

      const track = document.createElement("div");
      track.className = "resource-track";
      track.setAttribute("aria-label", `خط زمن ${resource.name}`);

      const resourceBlocks = blocks
        .filter((block) => block.resourceId === resource.id)
        .sort((a, b) => minutesFromTime(a.start) - minutesFromTime(b.start));
      const currentNext = currentOrNextBlock(blocks, resource.id);

      resourceBlocks.forEach((block) => {
        const presentation = statusPresentation(effectiveState(block, state.selectedDateKey));
        const position = blockPosition(block);
        const button = document.createElement("button");
        button.type = "button";
        button.className = `schedule-block block-${effectiveState(block, state.selectedDateKey).toLowerCase().replaceAll("_", "-")}`;
        button.style.left = `${position.left}%`;
        button.style.width = `${position.width}%`;
        button.setAttribute("aria-pressed", String(state.selectedBlockId === block.id));
        button.setAttribute(
          "aria-label",
          `${block.title}، ${resource.name}، من ${block.start} إلى ${block.end}، الحالة ${presentation.label}${block.bookingId ? `، رقم الحجز ${block.bookingId}` : ""}`
        );

        if (currentNext?.id === block.id && state.selectedResourceId === resource.id) {
          const note = document.createElement("span");
          note.className = "block-current-note";
          const now = currentAdenMinutes();
          const start = minutesFromTime(block.start);
          const end = minutesFromTime(block.end);
          note.textContent = state.selectedDateKey === todayKey && now >= start && now < end ? "الاستخدام الحالي" : "الاستخدام التالي";
          button.append(note);
        }

        const title = document.createElement("strong");
        title.textContent = block.title;
        const time = document.createElement("span");
        time.dir = "ltr";
        time.textContent = `${block.start} – ${block.end}`;
        const status = document.createElement("small");
        status.textContent = presentation.label;
        button.append(title, time, status);
        button.addEventListener("click", () => selectBlock(block.id, resource.id, true));
        track.append(button);
      });

      row.append(label, track);
      elements.rows.append(row);
    });
  };

  const renderDetail = (blocks) => {
    const block = selectedBlock(blocks);
    const resource = resourceFor(state.selectedResourceId);

    if (!resource) {
      elements.detailTitle.textContent = "اختر موردًا أو جلسة";
      return;
    }

    if (!block) {
      const presentation = statusPresentation("AVAILABLE");
      elements.detailKicker.textContent = "سياق المورد المحدد";
      elements.detailTitle.textContent = resource.name;
      elements.detailSubtitle.textContent = "لا توجد كتلة إشغال محددة لهذا المورد في اليوم المختار.";
      elements.detailStatus.className = `detail-status ${presentation.className}`;
      elements.detailStatus.textContent = presentation.label;
      elements.detailResource.textContent = resource.name;
      elements.detailTime.textContent = "—";
      elements.detailBookingId.textContent = "—";
      elements.detailService.textContent = "—";
      elements.detailConsultant.textContent = "—";
      elements.detailMode.textContent = "—";
      elements.detailCapacity.textContent = resource.capacity;
      elements.detailOccupancy.textContent = presentation.label;
      elements.detailNote.textContent = "المورد معروض كسياق فقط ولا ينشئ هذا السطح حجزًا أو تخصيصًا.";
      return;
    }

    const status = effectiveState(block, state.selectedDateKey);
    const presentation = statusPresentation(status);
    elements.detailKicker.textContent = block.bookingId ? "سياق الجلسة المحددة" : "سياق الاستخدام المحدد";
    elements.detailTitle.textContent = block.title;
    elements.detailSubtitle.textContent = block.bookingId
      ? `سياق عرض مرتبط بالحجز الاصطناعي ${block.bookingId}.`
      : "سياق تشغيل مورد من دون حجز جلسة مرتبط.";
    elements.detailStatus.className = `detail-status ${presentation.className}`;
    elements.detailStatus.textContent = presentation.label;
    elements.detailResource.textContent = resource.name;
    elements.detailTime.textContent = `${block.start} – ${block.end}`;
    elements.detailBookingId.textContent = block.bookingId || "غير مرتبط";
    elements.detailService.textContent = block.service || "لا توجد جلسة مرتبطة";
    elements.detailConsultant.textContent = block.consultant || "غير منطبق";
    elements.detailMode.textContent = block.mode || "غير منطبق";
    elements.detailCapacity.textContent = resource.capacity;
    elements.detailOccupancy.textContent = presentation.label;
    elements.detailNote.textContent = block.note;
  };

  const renderAttention = (blocks) => {
    elements.attentionList.replaceChildren();
    const notes = [];

    const now = currentAdenMinutes();
    if (state.selectedDateKey === todayKey) {
      const endingSoon = blocks.filter((block) => effectiveState(block, todayKey) === "ENDING_SOON");
      endingSoon.forEach((block) => {
        notes.push({
          level: "warning",
          title: `${resourceFor(block.resourceId)?.name || "مورد"} — ينتهي قريبًا`,
          text: `${block.title} ينتهي عند ${block.end}. راجع السياق التشغيلي من دون تنفيذ أي إعادة تخصيص من هذا السطح.`
        });
      });

      if (!endingSoon.length) {
        notes.push({
          level: "info",
          title: "لا يوجد استخدام ينتهي خلال 30 دقيقة الآن",
          text: (() => {
            const parts = currentAdenParts();
            return `الوقت الحالي ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")} حسب Asia/Aden.`;
          })()
        });
      }
    }

    const preparation = blocks.find((block) => block.resourceId === "meeting-room" && block.state === "PREPARATION");
    if (preparation) {
      notes.push({
        level: "warning",
        title: "قاعة الاجتماعات — تجهيز قبل الورشة",
        text: `فترة التجهيز ${preparation.start}–${preparation.end} تسبق ورشة تبدأ عند 13:00.`
      });
    }

    const blocked = blocks.find((block) => block.resourceId === "room-3" && block.state === "BLOCKED");
    if (blocked) {
      notes.push({
        level: "info",
        title: "غرفة 3 — فترة محظورة",
        text: `الفترة ${blocked.start}–${blocked.end} معروضة كمحظورة في بيانات العرض الاصطناعية ولا تمثل سياسة موارد نهائية.`
      });
    }

    elements.attentionCount.textContent = notes.length ? `${notes.length} ملاحظات` : "لا توجد ملاحظات";
    elements.attentionEmpty.hidden = notes.length !== 0;

    notes.forEach((note) => {
      const item = document.createElement("li");
      item.className = `attention-item attention-${note.level}`;
      const title = document.createElement("strong");
      title.textContent = note.title;
      const copy = document.createElement("p");
      copy.textContent = note.text;
      item.append(title, copy);
      elements.attentionList.append(item);
    });
  };

  const ensureSelection = (blocks) => {
    const hasResource = resources.some((resource) => resource.id === state.selectedResourceId);
    if (!hasResource) state.selectedResourceId = resources[0].id;

    if (!blocks.length) {
      state.selectedBlockId = null;
      return;
    }

    const candidate = blocks.find((block) => block.id === state.selectedBlockId && block.resourceId === state.selectedResourceId);
    if (candidate) return;

    const next = currentOrNextBlock(blocks, state.selectedResourceId);
    state.selectedBlockId = next?.id || blocks.find((block) => block.resourceId === state.selectedResourceId)?.id || null;
  };

  const render = () => {
    renderDate();
    renderCurrentTime();
    const blocks = fixtureBlocksForDate(state.selectedDateKey);
    ensureSelection(blocks);
    renderRows(blocks);
    positionCurrentTimeLine();
    renderDetail(blocks);
    renderAttention(blocks);
    elements.detailExtra.hidden = !state.detailExpanded;
    elements.detailToggle.setAttribute("aria-expanded", String(state.detailExpanded));
    elements.detailToggle.textContent = state.detailExpanded ? "إخفاء تفاصيل السياق" : "عرض تفاصيل السياق";
    saveState();
  };

  const changeDate = (offset) => {
    state.selectedDateKey = moveDateKey(state.selectedDateKey, offset);
    state.selectedBlockId = null;
    state.detailExpanded = false;
    render();
    announce(`تم عرض ${formatFullDate(state.selectedDateKey)}.`);
  };

  restoreState();
  if (!state.selectedDateKey) state.selectedDateKey = todayKey;
  if (Math.abs((dateFromKey(state.selectedDateKey) - dateFromKey(todayKey)) / DAY_MS) > 30) {
    state.selectedDateKey = todayKey;
  }

  renderTimeRuler();

  elements.previousDate?.addEventListener("click", () => changeDate(-1));
  elements.nextDate?.addEventListener("click", () => changeDate(1));
  elements.today?.addEventListener("click", () => {
    state.selectedDateKey = todayKey;
    state.selectedResourceId = "room-1";
    state.selectedBlockId = "room-1-0900";
    state.detailExpanded = false;
    render();
    announce("تمت العودة إلى جدول اليوم الحالي.");
  });

  elements.detailToggle?.addEventListener("click", () => {
    state.detailExpanded = !state.detailExpanded;
    elements.detailExtra.hidden = !state.detailExpanded;
    elements.detailToggle.setAttribute("aria-expanded", String(state.detailExpanded));
    elements.detailToggle.textContent = state.detailExpanded ? "إخفاء تفاصيل السياق" : "عرض تفاصيل السياق";
    saveState();
    announce(state.detailExpanded ? "تم إظهار تفاصيل السياق الإضافية." : "تم إخفاء تفاصيل السياق الإضافية.");
  });

  window.addEventListener("resize", () => positionCurrentTimeLine());
  window.setInterval(() => render(), 60000);

  render();
})();
