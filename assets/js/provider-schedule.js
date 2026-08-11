(() => {
  "use strict";

  const auth = window.RP03Auth;
  if (!auth) return;

  const session = auth.readSession();
  if (!session || session.role !== auth.ROLES.CONSULTANT) {
    return;
  }

  const TIMEZONE = "Asia/Aden";
  const STORAGE_KEY = "rp03.s06.schedule.v1";
  const DAY_MS = 86400000;

  const elements = {
    dateLabel: document.querySelector("#selected-date-label"),
    dateSubLabel: document.querySelector("#selected-date-sub-label"),
    previousDate: document.querySelector("#previous-date"),
    nextDate: document.querySelector("#next-date"),
    today: document.querySelector("#today-date"),
    agenda: document.querySelector("#agenda-list"),
    agendaCount: document.querySelector("#agenda-count"),
    agendaEmpty: document.querySelector("#agenda-empty"),
    sessionPanel: document.querySelector("#session-panel"),
    detailKicker: document.querySelector("#detail-kicker"),
    nextWindow: document.querySelector("#next-window"),
    detailService: document.querySelector("#detail-service"),
    detailCustomer: document.querySelector("#detail-customer"),
    detailDate: document.querySelector("#detail-date"),
    detailTime: document.querySelector("#detail-time"),
    detailMode: document.querySelector("#detail-mode"),
    detailContext: document.querySelector("#detail-context"),
    detailStatus: document.querySelector("#detail-status"),
    preparationProgress: document.querySelector("#preparation-progress"),
    preparationBar: document.querySelector("#preparation-bar-value"),
    preparationList: document.querySelector("#preparation-list"),
    attention: document.querySelector("#attention-section"),
    attentionTitle: document.querySelector("#attention-title"),
    attentionText: document.querySelector("#attention-text"),
    primaryAction: document.querySelector("#session-primary-action"),
    actionNote: document.querySelector("#session-action-note"),
    openNote: document.querySelector("#session-open-note"),
    announcer: document.querySelector("#provider-announcer")
  };

  const preparationLabels = [
    "استلام معلومات العميل الأساسية",
    "استلام المواد والمرفقات ذات الصلة",
    "مراجعة المتطلبات ونطاق النقاش",
    "تجهيز خطة النقاش"
  ];

  const baseSessions = [
    {
      id: "review-0900",
      start: "09:00",
      duration: 60,
      service: "جلسة مراجعة وتقييم تقني",
      customer: "محمود ع.",
      mode: "in-person",
      room: "غرفة 2",
      preparation: [true, true, true, false]
    },
    {
      id: "architecture-1030",
      start: "10:30",
      duration: 60,
      service: "جلسة استشارية للبنية التقنية",
      customer: "ليان س.",
      mode: "remote",
      room: "عن بُعد",
      preparation: [true, true, true, true]
    },
    {
      id: "security-1300",
      start: "13:00",
      duration: 90,
      service: "جلسة تقييم أمني للتطبيقات",
      customer: "عميل مؤسسي — ممثل العميل",
      mode: "in-person",
      room: "غرفة 1",
      preparation: [true, true, true, true]
    },
    {
      id: "roadmap-1530",
      start: "15:30",
      duration: 60,
      service: "جلسة تخطيط الطريق التقني",
      customer: "سارة م.",
      mode: "remote",
      room: "عن بُعد",
      preparation: [true, false, true, false]
    },
    {
      id: "system-review-1700",
      start: "17:00",
      duration: 60,
      service: "جلسة مراجعة معمارية للنظام",
      customer: "ياسر ن.",
      mode: "remote",
      room: "عن بُعد",
      preparation: [true, true, false, false]
    }
  ];

  const state = {
    selectedDateKey: null,
    selectedSessionId: null,
    preparationOverrides: {},
    openedSessions: new Set()
  };

  const adenDateParts = (date = new Date()) => {
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
  const todayParts = adenDateParts();
  const todayKey = dateKeyFromParts(todayParts);

  const dateFromKey = (key) => {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  };

  const keyFromDate = (date) => [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");

  const validDateKey = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = dateFromKey(value);
    return Number.isFinite(parsed.getTime()) && keyFromDate(parsed) === value;
  };

  const moveDateKey = (key, days) => {
    const date = dateFromKey(key);
    return keyFromDate(new Date(date.getTime() + (days * DAY_MS)));
  };

  const compareDateKeys = (a, b) => a.localeCompare(b);

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
    month: "short"
  }).format(dateFromKey(key));

  const minutesFromTime = (value) => {
    const [hour, minute] = value.split(":").map(Number);
    return (hour * 60) + minute;
  };

  const formatDuration = (minutes) => `${minutes} دقيقة`;

  const currentAdenMinutes = () => (Number(todayParts.hour) * 60) + Number(todayParts.minute);

  const preparationKey = (dateKey, sessionId) => `${dateKey}|${sessionId}`;
  const openedKey = (dateKey, sessionId) => `${dateKey}|${sessionId}`;

  const restoreState = () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) return;

      if (validDateKey(saved.selectedDateKey)) {
        state.selectedDateKey = saved.selectedDateKey;
      }
      if (typeof saved.selectedSessionId === "string" && baseSessions.some((item) => item.id === saved.selectedSessionId)) {
        state.selectedSessionId = saved.selectedSessionId;
      }
      if (saved.preparationOverrides && typeof saved.preparationOverrides === "object" && !Array.isArray(saved.preparationOverrides)) {
        state.preparationOverrides = Object.fromEntries(Object.entries(saved.preparationOverrides).flatMap(([key, value]) => {
          const [dateKey, sessionId] = key.split("|");
          if (!validDateKey(dateKey) || !baseSessions.some((item) => item.id === sessionId) || !Array.isArray(value)) return [];
          return [[key, value.map(Boolean).slice(0, preparationLabels.length)]];
        }));
      }
      if (Array.isArray(saved.openedSessions)) {
        state.openedSessions = new Set(saved.openedSessions.filter((item) => {
          if (typeof item !== "string") return false;
          const [dateKey, sessionId] = item.split("|");
          return validDateKey(dateKey) && baseSessions.some((sessionItem) => sessionItem.id === sessionId);
        }));
      }
    } catch {
      // The schedule remains deterministic without browser storage.
    }
  };

  const saveState = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        selectedDateKey: state.selectedDateKey,
        selectedSessionId: state.selectedSessionId,
        preparationOverrides: state.preparationOverrides,
        openedSessions: Array.from(state.openedSessions)
      }));
    } catch {
      // Browser storage is optional for current-session continuity only.
    }
  };

  const fixtureSessionsForDate = (dateKey) => {
    const dayOffset = Math.round((dateFromKey(dateKey) - dateFromKey(todayKey)) / DAY_MS);

    if (Math.abs(dayOffset) > 14) return [];

    return baseSessions.map((sessionItem) => {
      const key = preparationKey(dateKey, sessionItem.id);
      const overridden = state.preparationOverrides[key];
      const preparation = Array.isArray(overridden)
        ? overridden.map(Boolean).slice(0, preparationLabels.length)
        : [...sessionItem.preparation];

      while (preparation.length < preparationLabels.length) preparation.push(false);

      return {
        ...sessionItem,
        preparation,
      };
    });
  };

  const statusForSession = (sessionItem, dateKey) => {
    const dateComparison = compareDateKeys(dateKey, todayKey);
    const start = minutesFromTime(sessionItem.start);
    const end = start + sessionItem.duration;
    const now = currentAdenMinutes();
    const completedPreparation = sessionItem.preparation.filter(Boolean).length;

    if (dateComparison < 0) return "COMPLETED";
    if (dateComparison > 0) {
      return completedPreparation === preparationLabels.length ? "READY" :
        completedPreparation <= 2 ? "ATTENTION_REQUIRED" : "UPCOMING";
    }

    if (now >= end) return "COMPLETED";
    if (now >= start && now < end) return "IN_PROGRESS";
    if (completedPreparation === preparationLabels.length) return "READY";
    if (completedPreparation <= 2) return "ATTENTION_REQUIRED";
    return "UPCOMING";
  };

  const statusPresentation = (status) => ({
    COMPLETED: { label: "مكتملة", className: "status-completed" },
    READY: { label: "جاهزة", className: "status-ready" },
    UPCOMING: { label: "قادمة", className: "status-upcoming" },
    IN_PROGRESS: { label: "قيد التنفيذ", className: "status-in-progress" },
    ATTENTION_REQUIRED: { label: "التحضير مطلوب", className: "status-attention" }
  }[status]);

  const currentOrNextSession = (sessions) => {
    if (!sessions.length) return null;

    const dateComparison = compareDateKeys(state.selectedDateKey, todayKey);
    if (dateComparison < 0) return sessions.at(-1);
    if (dateComparison > 0) return sessions[0];

    const now = currentAdenMinutes();
    const current = sessions.find((sessionItem) => {
      const start = minutesFromTime(sessionItem.start);
      return now >= start && now < (start + sessionItem.duration);
    });
    if (current) return current;

    return sessions.find((sessionItem) => minutesFromTime(sessionItem.start) > now) || sessions.at(-1);
  };

  const currentNextLabel = (sessionItem, sessions) => {
    const currentNext = currentOrNextSession(sessions);
    if (!currentNext || currentNext.id !== sessionItem.id) return null;

    const status = statusForSession(sessionItem, state.selectedDateKey);
    if (status === "IN_PROGRESS") return "الجلسة الحالية";
    if (compareDateKeys(state.selectedDateKey, todayKey) < 0) return "آخر جلسة في اليوم";
    return "الجلسة التالية";
  };

  const modeLabel = (mode) => mode === "in-person" ? "حضوري" : "عن بُعد";

  const nextWindowText = (sessionItem, status) => {
    if (status === "IN_PROGRESS") return "تجري الآن";
    if (compareDateKeys(state.selectedDateKey, todayKey) !== 0) return formatCompactDate(state.selectedDateKey);

    const difference = minutesFromTime(sessionItem.start) - currentAdenMinutes();
    if (difference > 0 && difference <= 60) return `بعد ${difference} دقيقة`;
    if (difference > 60) return `اليوم عند ${sessionItem.start}`;
    return sessionItem.start;
  };

  const announce = (message) => {
    elements.announcer.textContent = "";
    window.setTimeout(() => {
      elements.announcer.textContent = message;
    }, 20);
  };

  const selectSession = (sessionId, focusDetail = false) => {
    state.selectedSessionId = sessionId;
    saveState();
    render();
    if (focusDetail) {
      elements.sessionPanel.focus();
    }
  };

  const renderAgenda = (sessions) => {
    elements.agenda.replaceChildren();
    elements.agendaCount.textContent = `${sessions.length} جلسات مجدولة`;
    elements.agendaEmpty.hidden = sessions.length !== 0;

    if (!sessions.length) return;

    const currentNext = currentOrNextSession(sessions);

    sessions.forEach((sessionItem) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      const status = statusForSession(sessionItem, state.selectedDateKey);
      const presentation = statusPresentation(status);

      button.type = "button";
      button.className = "agenda-item";
      button.setAttribute("aria-selected", String(sessionItem.id === state.selectedSessionId));
      button.setAttribute(
        "aria-label",
        `${sessionItem.start}، ${sessionItem.service}، ${sessionItem.customer}، ${modeLabel(sessionItem.mode)}، ${presentation.label}`
      );

      const currentLabel = currentNext?.id === sessionItem.id ? currentNextLabel(sessionItem, sessions) : null;
      if (currentLabel) {
        const note = document.createElement("span");
        note.className = "current-next-note";
        note.textContent = currentLabel;
        button.append(note);
      }

      const time = document.createElement("span");
      time.className = "agenda-time";
      const timeValue = document.createElement("strong");
      timeValue.dir = "ltr";
      timeValue.textContent = sessionItem.start;
      const durationValue = document.createElement("small");
      durationValue.textContent = formatDuration(sessionItem.duration);
      time.append(timeValue, durationValue);

      const service = document.createElement("span");
      service.className = "agenda-service";
      const serviceName = document.createElement("strong");
      serviceName.textContent = sessionItem.service;
      const customerName = document.createElement("span");
      customerName.textContent = sessionItem.customer;
      service.append(serviceName, customerName);

      const mode = document.createElement("span");
      mode.className = "agenda-mode";
      const context = sessionItem.mode === "in-person" ? sessionItem.room : "جلسة عن بُعد";
      const modeName = document.createElement("strong");
      modeName.textContent = modeLabel(sessionItem.mode);
      const contextName = document.createElement("span");
      contextName.textContent = context;
      mode.append(modeName, contextName);

      const statusNode = document.createElement("span");
      statusNode.className = "agenda-status";
      const badge = document.createElement("span");
      badge.className = `status-badge ${presentation.className}`;
      badge.textContent = presentation.label;
      statusNode.append(badge);

      button.append(time, service, mode, statusNode);
      button.addEventListener("click", () => selectSession(sessionItem.id, true));
      item.append(button);
      elements.agenda.append(item);
    });
  };

  const renderPreparation = (sessionItem) => {
    elements.preparationList.replaceChildren();
    const completed = sessionItem.preparation.filter(Boolean).length;
    const total = preparationLabels.length;

    elements.preparationProgress.textContent = `${completed} من ${total} مكتملة`;
    elements.preparationBar.style.width = `${(completed / total) * 100}%`;

    preparationLabels.forEach((label, index) => {
      const item = document.createElement("li");
      item.className = "preparation-item";
      const wrapper = document.createElement("label");
      const checkbox = document.createElement("input");
      const copy = document.createElement("span");

      checkbox.type = "checkbox";
      checkbox.checked = Boolean(sessionItem.preparation[index]);
      checkbox.dataset.preparationIndex = String(index);
      checkbox.setAttribute("aria-label", label);
      copy.textContent = label;

      checkbox.addEventListener("change", () => {
        const key = preparationKey(state.selectedDateKey, sessionItem.id);
        const next = [...sessionItem.preparation];
        next[index] = checkbox.checked;
        state.preparationOverrides[key] = next;
        saveState();
        announce(checkbox.checked ? `اكتمل: ${label}` : `أعيد فتح بند التحضير: ${label}`);
        render();
      });

      wrapper.append(checkbox, copy);
      item.append(wrapper);
      elements.preparationList.append(item);
    });
  };

  const renderAttention = (sessionItem) => {
    const missing = sessionItem.preparation
      .map((complete, index) => complete ? null : preparationLabels[index])
      .filter(Boolean);

    if (missing.length) {
      elements.attention.dataset.tone = "attention";
      elements.attentionTitle.textContent = "يحتاج انتباهك";
      elements.attentionText.textContent = missing.length === 1
        ? `بند التحضير المتبقي: ${missing[0]}.`
        : `يوجد ${missing.length} من بنود التحضير غير مكتملة. ابدأ بأقرب بند مطلوب قبل الجلسة.`;
    } else {
      elements.attention.dataset.tone = "clear";
      elements.attentionTitle.textContent = "التحضير جاهز";
      elements.attentionText.textContent = "اكتملت عناصر التحضير الأساسية لهذه الجلسة، ولا توجد عناصر تحضير معلّقة في هذا السطح.";
    }
  };

  const renderPrimaryAction = (sessionItem, status) => {
    const completed = sessionItem.preparation.filter(Boolean).length;
    const allReady = completed === preparationLabels.length;
    const isOpened = state.openedSessions.has(openedKey(state.selectedDateKey, sessionItem.id));

    elements.openNote.hidden = !isOpened;
    elements.primaryAction.disabled = false;

    if (!allReady) {
      elements.primaryAction.textContent = "مراجعة التحضير";
      elements.actionNote.textContent = "أكمل عناصر التحضير المطلوبة قبل فتح سياق الجلسة.";
      elements.primaryAction.onclick = () => {
        const unchecked = elements.preparationList.querySelector('input[type="checkbox"]:not(:checked)');
        unchecked?.focus();
        announce("انتقلت إلى أول بند تحضير غير مكتمل.");
      };
      return;
    }

    if (status === "COMPLETED") {
      elements.primaryAction.textContent = "مراجعة التحضير";
      elements.actionNote.textContent = "الجلسة مكتملة؛ يمكنك مراجعة حالة التحضير المسجلة محليًا.";
      elements.primaryAction.onclick = () => {
        elements.preparationList.querySelector("input")?.focus();
        announce("تم فتح قائمة التحضير للمراجعة.");
      };
      return;
    }

    if (isOpened) {
      elements.primaryAction.textContent = "الجلسة مفتوحة";
      elements.primaryAction.disabled = true;
      elements.actionNote.textContent = "تم فتح سياق الجلسة ويمكنك متابعة تفاصيلها من هذه المساحة.";
      elements.primaryAction.onclick = null;
      return;
    }

    elements.primaryAction.textContent = "فتح الجلسة";
    elements.actionNote.textContent = status === "IN_PROGRESS"
      ? "الجلسة ضمن وقتها الحالي وحالة التحضير مكتملة."
      : "حالة التحضير مكتملة ويمكنك فتح سياق الجلسة للمراجعة.";
    elements.primaryAction.onclick = () => {
      state.openedSessions.add(openedKey(state.selectedDateKey, sessionItem.id));
      saveState();
      announce(`تم فتح سياق ${sessionItem.service}.`);
      render();
      elements.openNote.focus();
    };
  };

  const renderDetail = (sessions) => {
    const selected = sessions.find((sessionItem) => sessionItem.id === state.selectedSessionId) || currentOrNextSession(sessions);
    if (!selected) {
      elements.sessionPanel.hidden = true;
      return;
    }

    elements.sessionPanel.hidden = false;
    state.selectedSessionId = selected.id;

    const status = statusForSession(selected, state.selectedDateKey);
    const presentation = statusPresentation(status);
    const currentNext = currentOrNextSession(sessions);
    const currentLabel = currentNext?.id === selected.id ? currentNextLabel(selected, sessions) : "الجلسة المحددة";

    elements.detailKicker.textContent = currentLabel || "الجلسة المحددة";
    elements.nextWindow.textContent = nextWindowText(selected, status);
    elements.detailService.textContent = selected.service;
    elements.detailCustomer.textContent = selected.customer;
    elements.detailDate.textContent = formatFullDate(state.selectedDateKey);
    const startTime = document.createElement("span");
    startTime.dir = "ltr";
    startTime.textContent = selected.start;
    const duration = document.createElement("span");
    duration.textContent = formatDuration(selected.duration);
    elements.detailTime.replaceChildren(startTime, document.createTextNode(" — "), duration);
    elements.detailMode.textContent = modeLabel(selected.mode);
    elements.detailContext.textContent = selected.mode === "in-person" ? selected.room : "جلسة عن بُعد";
    elements.detailStatus.textContent = presentation.label;
    elements.detailStatus.className = `status-badge ${presentation.className}`;

    renderPreparation(selected);
    renderAttention(selected);
    renderPrimaryAction(selected, status);
  };

  const renderDate = () => {
    elements.dateLabel.textContent = formatFullDate(state.selectedDateKey);
    elements.dateSubLabel.textContent = compareDateKeys(state.selectedDateKey, todayKey) === 0
      ? `اليوم — ${TIMEZONE}`
      : TIMEZONE;
  };

  const ensureSelectedSession = (sessions) => {
    const exists = sessions.some((sessionItem) => sessionItem.id === state.selectedSessionId);
    if (exists) return;
    state.selectedSessionId = currentOrNextSession(sessions)?.id || null;
  };

  const render = () => {
    renderDate();
    const sessions = fixtureSessionsForDate(state.selectedDateKey);
    ensureSelectedSession(sessions);
    renderAgenda(sessions);
    renderDetail(sessions);
    saveState();
  };

  const changeDate = (days) => {
    state.selectedDateKey = moveDateKey(state.selectedDateKey, days);
    state.selectedSessionId = null;
    render();
    announce(`تم عرض جدول ${formatFullDate(state.selectedDateKey)}.`);
  };

  elements.previousDate.addEventListener("click", () => changeDate(-1));
  elements.nextDate.addEventListener("click", () => changeDate(1));
  elements.today.addEventListener("click", () => {
    state.selectedDateKey = todayKey;
    state.selectedSessionId = null;
    render();
    announce("تمت العودة إلى جدول اليوم.");
  });

  restoreState();
  state.selectedDateKey = state.selectedDateKey || todayKey;
  render();
})();
