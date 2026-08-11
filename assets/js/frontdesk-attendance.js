(() => {
  "use strict";

  const auth = window.RP03Auth;
  const ops = window.RP03Operations;
  if (!auth || !ops) return;
  const session = auth.readSession();
  if (!session || session.role !== auth.ROLES.FRONT_DESK) return;

  const labels = {
    ALL: "كل الجلسات",
    UPCOMING: "قادمة",
    CHECKED_IN: "تم تسجيل الوصول",
    IN_PROGRESS: "قيد الجلسة",
    COMPLETED: "مكتملة",
    LATE: "متأخرة",
    NO_SHOW: "لم يحضر"
  };
  const order = ["UPCOMING", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "LATE", "NO_SHOW"];
  const state = {
    selectedDateKey: ops.todayKey(),
    filter: "ALL",
    selectedId: ops.selectedSessionId()
  };

  const elements = {
    previousDate: document.querySelector("#previous-date"), nextDate: document.querySelector("#next-date"), today: document.querySelector("#today-date"),
    dateLabel: document.querySelector("#selected-date-label"), now: document.querySelector("#attendance-now"), counts: document.querySelector("#attendance-counts"),
    resultCount: document.querySelector("#attendance-result-count"), groups: document.querySelector("#attendance-groups"), empty: document.querySelector("#attendance-empty"),
    detail: document.querySelector("#attendance-detail"), title: document.querySelector("#attendance-detail-title"), subtitle: document.querySelector("#attendance-detail-subtitle"),
    bookingId: document.querySelector("#attendance-booking-id"), detailState: document.querySelector("#attendance-state"), guest: document.querySelector("#attendance-guest"),
    time: document.querySelector("#attendance-time"), service: document.querySelector("#attendance-service"), consultant: document.querySelector("#attendance-consultant"), mode: document.querySelector("#attendance-mode"), room: document.querySelector("#attendance-room"),
    progressCheckin: document.querySelector("#progress-checkin"), progressAttendance: document.querySelector("#progress-attendance"), progressCompletion: document.querySelector("#progress-completion"),
    note: document.querySelector("#final-note"), noteCounter: document.querySelector("#note-counter"), followUps: Array.from(document.querySelectorAll('input[name="follow-up"]')),
    primary: document.querySelector("#attendance-primary-action"), completed: document.querySelector("#mark-completed"), noShow: document.querySelector("#mark-no-show"), actionNote: document.querySelector("#attendance-action-note"), announcer: document.querySelector("#attendance-announcer")
  };

  const badgeClass = (value) => ({ UPCOMING: "info", CHECKED_IN: "success", IN_PROGRESS: "success", COMPLETED: "neutral", LATE: "warning", NO_SHOW: "danger" }[value] || "neutral");
  const announce = (message) => { elements.announcer.textContent = ""; window.setTimeout(() => { elements.announcer.textContent = message; }, 20); };

  const currentSessions = () => ops.attendanceSessions(state.selectedDateKey);
  const selectSession = (id, focus = false) => { state.selectedId = id; ops.selectSession(id); render(); if (focus) elements.detail.focus(); };

  const syncFromBookingQuery = () => {
    const bookingId = new URLSearchParams(window.location.search).get("booking");
    if (!bookingId) return;
    const match = currentSessions().find((item) => item.bookingId === bookingId);
    if (match) { state.selectedId = match.id; ops.selectSession(match.id); }
  };

  const renderCounts = (sessions) => {
    elements.counts.replaceChildren();
    ["ALL", ...order].forEach((filter) => {
      const count = filter === "ALL" ? sessions.length : sessions.filter((item) => item.state === filter).length;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "fd-count-button";
      button.setAttribute("aria-pressed", String(state.filter === filter));
      button.innerHTML = `<strong>${count}</strong><span>${labels[filter]}</span>`;
      button.addEventListener("click", () => { state.filter = filter; render(); });
      elements.counts.append(button);
    });
  };

  const renderGroups = (visible) => {
    elements.groups.replaceChildren();
    const groupedStates = state.filter === "ALL" ? order : [state.filter];
    groupedStates.forEach((status) => {
      const records = visible.filter((item) => item.state === status);
      if (!records.length) return;
      const section = document.createElement("section");
      section.className = "fd-group";
      section.innerHTML = `<header class="fd-group-header"><h3>${labels[status]}</h3><span>${records.length} جلسة</span></header>`;
      const list = document.createElement("ul");
      list.className = "fd-session-list";
      records.forEach((item) => {
        const li = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "fd-session-button";
        button.setAttribute("aria-selected", String(item.id === state.selectedId));
        button.setAttribute("aria-label", `${item.start}، ${item.guest}، ${item.service}، ${labels[item.state]}`);
        button.innerHTML = `<span class="fd-session-time"><strong>${item.start}</strong><small>${item.duration} دقيقة</small></span><span class="fd-session-person"><strong>${item.guest}</strong><small dir="ltr">${item.bookingId}</small></span><span class="fd-session-service"><strong>${item.service}</strong><small>${item.mode} — ${item.room}</small></span><span class="fd-badge ${badgeClass(item.state)}">${labels[item.state]}</span>`;
        button.addEventListener("click", () => selectSession(item.id, false));
        li.append(button); list.append(li);
      });
      section.append(list); elements.groups.append(section);
    });
  };

  const setProgress = (sessionItem) => {
    [elements.progressCheckin, elements.progressAttendance, elements.progressCompletion].forEach((node) => { node.className = "fd-progress-step"; });
    const s = sessionItem?.state;
    if (["CHECKED_IN", "IN_PROGRESS", "COMPLETED"].includes(s)) elements.progressCheckin.classList.add("done");
    if (["IN_PROGRESS", "COMPLETED"].includes(s)) elements.progressAttendance.classList.add("done");
    if (s === "COMPLETED") elements.progressCompletion.classList.add("done");
    if (["UPCOMING", "LATE"].includes(s)) elements.progressCheckin.classList.add("current");
    if (s === "CHECKED_IN") elements.progressAttendance.classList.add("current");
    if (s === "IN_PROGRESS") elements.progressCompletion.classList.add("current");
  };

  const renderDetail = (sessions) => {
    const item = sessions.find((sessionItem) => sessionItem.id === state.selectedId) || null;
    if (!item) {
      elements.title.textContent = "اختر جلسة من القائمة";
      elements.subtitle.textContent = "ستظهر هنا حالة الوصول والحضور وتقدم الجلسة.";
      [elements.bookingId, elements.detailState, elements.guest, elements.time, elements.service, elements.consultant, elements.mode, elements.room].forEach((node) => { node.textContent = "—"; });
      elements.note.value = ""; elements.note.disabled = true; elements.followUps.forEach((input) => { input.disabled = true; });
      elements.primary.disabled = true; elements.completed.disabled = true; elements.noShow.disabled = true; elements.primary.textContent = "اختر جلسة"; elements.actionNote.textContent = "اختر جلسة لمراجعة الإجراء المتاح."; setProgress(null); return;
    }

    elements.title.textContent = item.service;
    elements.subtitle.textContent = `${item.guest} — ${labels[item.state]}`;
    elements.bookingId.textContent = item.bookingId; elements.detailState.textContent = labels[item.state]; elements.guest.textContent = item.guest; elements.time.textContent = `${item.start} — ${item.duration} دقيقة`; elements.service.textContent = item.service; elements.consultant.textContent = item.consultant; elements.mode.textContent = item.mode; elements.room.textContent = item.room;
    elements.note.disabled = false; elements.note.value = item.note || ""; elements.noteCounter.textContent = `${elements.note.value.length} / 300`;
    elements.followUps.forEach((input) => { input.disabled = false; input.checked = input.value === (item.followUpRequired ? "yes" : "no"); });
    setProgress(item);

    elements.completed.disabled = item.state !== "IN_PROGRESS";
    elements.noShow.disabled = !item.noShowEligible;

    if (["UPCOMING", "LATE"].includes(item.state)) {
      elements.primary.textContent = "تسجيل الوصول"; elements.primary.disabled = false;
      elements.actionNote.textContent = item.state === "LATE" ? "الجلسة متأخرة، لكنها لم تبلغ حد الغياب البالغ 15 دقيقة." : "سجّل وصول الضيف عند حضوره.";
    } else if (item.state === "CHECKED_IN") {
      elements.primary.textContent = "بدء الجلسة"; elements.primary.disabled = false; elements.actionNote.textContent = "الانتقال هنا تشغيلي ومحدود؛ تنفيذ الجلسة التفصيلي يبقى في مساحة المستشار.";
    } else if (item.state === "IN_PROGRESS") {
      elements.primary.textContent = "الجلسة قيد التنفيذ"; elements.primary.disabled = true; elements.actionNote.textContent = "يمكن تحديد الجلسة كمكتملة عند انتهاء السياق التشغيلي.";
    } else if (item.state === "COMPLETED") {
      elements.primary.textContent = "الجلسة مكتملة"; elements.primary.disabled = true; elements.actionNote.textContent = "راجع الملاحظة الختامية وحالة المتابعة فقط.";
    } else {
      elements.primary.textContent = "تم تسجيل عدم الحضور"; elements.primary.disabled = true; elements.actionNote.textContent = "لا توجد عقوبة أو رسوم أو أثر مالي معروض ضمن هذا السطح.";
    }

    if (item.noShowEligible) elements.actionNote.textContent = "تجاوز وقت البدء 15 دقيقة دون تسجيل وصول؛ أصبح تحديد «لم يحضر» متاحًا.";
  };

  const render = () => {
    const sessions = currentSessions();
    const visible = state.filter === "ALL" ? sessions : sessions.filter((item) => item.state === state.filter);
    if (!visible.some((item) => item.id === state.selectedId)) {
      state.selectedId = visible[0]?.id || null;
      if (state.selectedId) ops.selectSession(state.selectedId);
    }
    elements.dateLabel.textContent = ops.formatDate(state.selectedDateKey);
    elements.now.textContent = `وقت العرض المحلي: ${String(Math.floor(ops.currentAdenMinutes() / 60)).padStart(2, "0")}:${String(ops.currentAdenMinutes() % 60).padStart(2, "0")}`;
    elements.resultCount.textContent = `${visible.length} جلسة ضمن العرض الحالي`;
    elements.empty.hidden = visible.length !== 0;
    renderCounts(sessions); renderGroups(visible); renderDetail(sessions);
  };

  const selected = () => currentSessions().find((item) => item.id === state.selectedId) || null;

  elements.primary.addEventListener("click", () => {
    const item = selected(); if (!item) return;
    if (["UPCOMING", "LATE"].includes(item.state)) {
      ops.updateAttendance(item.id, { baseState: "CHECKED_IN" }); announce("تم تسجيل وصول الضيف.");
    } else if (item.state === "CHECKED_IN") {
      ops.updateAttendance(item.id, { baseState: "IN_PROGRESS" }); announce("تم نقل الجلسة إلى حالة قيد التنفيذ.");
    }
    render();
  });

  elements.completed.addEventListener("click", () => {
    const item = selected(); if (!item || item.state !== "IN_PROGRESS") return;
    ops.updateAttendance(item.id, { baseState: "COMPLETED" }); render(); announce("تم تحديد الجلسة كمكتملة.");
  });

  elements.noShow.addEventListener("click", () => {
    const item = selected(); if (!item || !item.noShowEligible) return;
    ops.updateAttendance(item.id, { baseState: "NO_SHOW" }); render(); announce("تم تسجيل عدم الحضور بعد تحقق حد 15 دقيقة.");
  });

  elements.note.addEventListener("input", () => {
    elements.noteCounter.textContent = `${elements.note.value.length} / 300`;
    const item = selected(); if (!item) return;
    ops.updateAttendance(item.id, { note: elements.note.value });
  });

  elements.followUps.forEach((input) => input.addEventListener("change", () => {
    if (!input.checked) return;
    const item = selected(); if (!item) return;
    ops.updateAttendance(item.id, { followUpRequired: input.value === "yes" });
    announce(input.value === "yes" ? "تم تعيين المتابعة كمطلوبة." : "تم تعيين المتابعة كغير مطلوبة.");
  }));

  elements.previousDate.addEventListener("click", () => { state.selectedDateKey = ops.moveDateKey(state.selectedDateKey, -1); state.selectedId = null; state.filter = "ALL"; render(); });
  elements.nextDate.addEventListener("click", () => { state.selectedDateKey = ops.moveDateKey(state.selectedDateKey, 1); state.selectedId = null; state.filter = "ALL"; render(); });
  elements.today.addEventListener("click", () => { state.selectedDateKey = ops.todayKey(); state.selectedId = null; state.filter = "ALL"; syncFromBookingQuery(); render(); });

  syncFromBookingQuery();
  render();
  window.setInterval(render, 60000);
})();
