(() => {
  "use strict";

  const auth = window.RP03Auth;
  const ops = window.RP03Operations;
  if (!auth || !ops) return;
  const session = auth.readSession();
  if (!session || session.role !== auth.ROLES.FRONT_DESK) return;

  const elements = {
    search: document.querySelector("#booking-search"),
    bookingFilter: document.querySelector("#booking-state-filter"),
    preparationFilter: document.querySelector("#preparation-state-filter"),
    proofFilter: document.querySelector("#proof-state-filter"),
    reset: document.querySelector("#booking-reset"),
    body: document.querySelector("#booking-table-body"),
    tableWrap: document.querySelector("#booking-table-wrap"),
    empty: document.querySelector("#booking-empty"),
    count: document.querySelector("#booking-result-count"),
    dateBadge: document.querySelector("#bookings-date-badge"),
    detail: document.querySelector("#booking-detail"),
    detailTitle: document.querySelector("#booking-detail-title"),
    detailSubtitle: document.querySelector("#booking-detail-subtitle"),
    detailId: document.querySelector("#detail-booking-id"),
    detailBookingState: document.querySelector("#detail-booking-state"),
    detailGuest: document.querySelector("#detail-guest"),
    detailContact: document.querySelector("#detail-contact"),
    detailService: document.querySelector("#detail-service"),
    detailDateTime: document.querySelector("#detail-date-time"),
    detailConsultant: document.querySelector("#detail-consultant"),
    detailRoom: document.querySelector("#detail-room"),
    preparationSelect: document.querySelector("#detail-preparation-select"),
    proofSelect: document.querySelector("#detail-proof-select"),
    openAttendance: document.querySelector("#open-attendance"),
    actionNote: document.querySelector("#booking-action-note"),
    announcer: document.querySelector("#booking-announcer")
  };

  const labels = {
    booking: { CONFIRMED: "مؤكد", PENDING_REVIEW: "بانتظار المراجعة", CANCELLED: "ملغى" },
    preparation: { READY: "جاهز", PENDING_REVIEW: "بانتظار المراجعة", FOLLOW_UP_REQUIRED: "يتطلب متابعة", NOT_REQUIRED: "غير مطلوب" },
    proof: { PENDING: "قيد المراجعة", VERIFIED: "تمت المراجعة", FOLLOW_UP_REQUIRED: "يتطلب متابعة" }
  };

  const badgeClass = (state) => {
    if (["CONFIRMED", "READY", "VERIFIED"].includes(state)) return "success";
    if (["PENDING_REVIEW", "PENDING"].includes(state)) return "warning";
    if (state === "FOLLOW_UP_REQUIRED") return "danger";
    return "neutral";
  };

  const state = { selectedId: ops.selectedBookingId() };

  const announce = (message) => {
    elements.announcer.textContent = "";
    window.setTimeout(() => { elements.announcer.textContent = message; }, 20);
  };

  const normalized = (value) => String(value || "").trim().toLocaleLowerCase("ar");

  const filteredBookings = () => {
    const query = normalized(elements.search.value);
    return ops.bookings().filter((booking) => {
      const matchesSearch = !query || [booking.id, booking.guest, booking.email, booking.contact]
        .some((value) => normalized(value).includes(query));
      return matchesSearch &&
        (elements.bookingFilter.value === "ALL" || booking.bookingState === elements.bookingFilter.value) &&
        (elements.preparationFilter.value === "ALL" || booking.preparationState === elements.preparationFilter.value) &&
        (elements.proofFilter.value === "ALL" || booking.proofState === elements.proofFilter.value);
    });
  };

  const createBadge = (label, state) => {
    const node = document.createElement("span");
    node.className = `fd-badge ${badgeClass(state)}`;
    node.textContent = label;
    return node;
  };

  const selectBooking = (id, focus = false) => {
    state.selectedId = id;
    ops.selectBooking(id);
    render();
    if (focus) elements.detail.focus();
  };

  const renderRows = (records) => {
    elements.body.replaceChildren();
    records.forEach((booking) => {
      const row = document.createElement("tr");
      row.tabIndex = 0;
      row.setAttribute("aria-selected", String(booking.id === state.selectedId));
      row.setAttribute("aria-label", `${booking.id}، ${booking.guest}، ${booking.service}، ${labels.booking[booking.bookingState]}`);

      const idCell = document.createElement("td");
      const id = document.createElement("span");
      id.className = "fd-id";
      id.textContent = booking.id;
      idCell.append(id);
      if (booking.source === "s05-local") {
        const source = document.createElement("div");
        source.className = "fd-local-source";
        source.textContent = "حجز S05 محلي حديث";
        idCell.append(source);
      }

      const guestCell = document.createElement("td");
      const guest = document.createElement("span");
      guest.className = "fd-person";
      const guestName = document.createElement("strong");
      guestName.textContent = booking.guest;
      const guestContact = document.createElement("small");
      guestContact.dir = "ltr";
      guestContact.textContent = booking.email || booking.contact || "—";
      guest.append(guestName, guestContact);
      guestCell.append(guest);

      const serviceCell = document.createElement("td");
      const service = document.createElement("span");
      service.className = "fd-service";
      service.textContent = booking.service;
      const mode = document.createElement("div");
      mode.className = "fd-table-subtle";
      mode.textContent = booking.mode;
      serviceCell.append(service, mode);

      const dateCell = document.createElement("td");
      const time = document.createElement("span");
      time.className = "fd-time";
      const timeValue = document.createElement("strong");
      timeValue.dir = "ltr";
      timeValue.textContent = booking.start;
      const dateValue = document.createElement("small");
      dateValue.textContent = ops.formatDate(booking.dateKey, { compact: true });
      time.append(timeValue, dateValue);
      dateCell.append(time);

      const bookingStateCell = document.createElement("td");
      bookingStateCell.append(createBadge(labels.booking[booking.bookingState], booking.bookingState));
      const preparationCell = document.createElement("td");
      preparationCell.append(createBadge(labels.preparation[booking.preparationState], booking.preparationState));
      const proofCell = document.createElement("td");
      proofCell.append(createBadge(labels.proof[booking.proofState], booking.proofState));

      row.append(idCell, guestCell, serviceCell, dateCell, bookingStateCell, preparationCell, proofCell);
      row.addEventListener("click", () => selectBooking(booking.id, false));
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectBooking(booking.id, true);
        }
      });
      elements.body.append(row);
    });
  };

  const renderDetail = (allRecords) => {
    const booking = allRecords.find((item) => item.id === state.selectedId) || null;
    if (!booking) {
      elements.detailTitle.textContent = "اختر حجزًا من القائمة";
      elements.detailSubtitle.textContent = "ستظهر هنا معلومات الضيف والجلسة وسياق التحضير وربط الضيف.";
      [elements.detailId, elements.detailBookingState, elements.detailGuest, elements.detailContact, elements.detailService, elements.detailDateTime, elements.detailConsultant, elements.detailRoom]
        .forEach((node) => { node.textContent = "—"; });
      elements.preparationSelect.disabled = true;
      elements.proofSelect.disabled = true;
      elements.openAttendance.disabled = true;
      elements.actionNote.textContent = "اختر حجزًا صالحًا للمتابعة.";
      return;
    }

    elements.detailTitle.textContent = booking.guest;
    elements.detailSubtitle.textContent = `${booking.service} — ${booking.mode}`;
    elements.detailId.textContent = booking.id;
    elements.detailBookingState.textContent = labels.booking[booing.bookingState];
    elements.detailGuest.textContent = booking.guest;
    elements.detailContact.textContent = booking.contact || booking.email || "غير متاح";
    elements.detailService.textContent = booking.service;
    elements.detailDateTime.textContent = `${ops.formatDate(booking.dateKey)} — ${booking.start}`;
    elements.detailConsultant.textContent = booking.consultant;
    elements.detailRoom.textContent = booking.room;
    elements.preparationSelect.disabled = false;
    elements.proofSelect.disabled = false;
    elements.preparationSelect.value = booking.preparationState;
    elements.proofSelect.value = booking.proofState;
    elements.openAttendance.disabled = booking.bookingState === "CANCELLED";
    elements.actionNote.textContent = booking.bookingState === "CANCELLED"
      ? "الحجز ملغى؛ لا يوجد انتقال إلى الحضور من هذا السجل."
      : "يفتح سياق الحضور المطابق دون تغيير مقدم الخدمة أو المورد.";
  };

  const render = () => {
    const allRecords = ops.bookings();
    const visible = filteredBookings();

    if (!visible.some((item) => item.id === state.selectedId)) {
      state.selectedId = visible[0]?.id || null;
      if (state.selectedId) ops.selectBooking(state.selectedId);
    }

    elements.dateBadge.textContent = `اليوم: ${ops.formatDate(ops.todayKey())}`;
    elements.count.innerHTML = `عرض <strong>${visible.length}</strong> م؆ ${allRecords.length} حجوزات`;
    elements.tableWrap.hidden = visible.length === 0;
    elements.empty.hidden = visible.length !== 0;
    renderRows(visible);
    renderDetail(allRecords);
  };

  [elements.search, elements.bookingFilter, elements.preparationFilter, elements.proofFilter].forEach((control) => {
    control.addEventListener(control === elements.search ? "input" : "change", render);
  });

  elements.reset.addEventListener("click", () => {
    elements.search.value = "";
    elements.bookingFilter.value = "ALL";
    elements.preparationFilter.value = "ALL";
    elements.proofFilter.value = "ALL";
    render();
    elements.search.focus();
    announce("تمت إنعادة ضبط البحح والفلاتر.");
  });

  elements.preparationSelect.addEventListener("change", () => {
    if (!state.selectedId) return;
    ops.updateBooking(state.selectedId, { preparationState: elements.preparationSelect.value });
    render();
    announce(bتم تحديث حالة التحضير إلى ${labels.preparation[elements.preparationSelect.value]}.`);
  });

  elements.proofSelect.addEventListener("change", () => {
    if (!state.selectedId) return;
    ops.updateBooking(state.selectedId, { proofState: elements.proofSelect.value });
    render();
    announce(`تم تحدية حالة ربط الضيف إلى ${labels.proof[elements.proofSelect.value]}.`);
  });

  elements.openAttendance.addEventListener("click", () => {
    const booking = ops.bookings().find((item) => item.id === state.selectedId);
    if (!booking || booking.bookingState === "CANCELLED") return;
    window.location.assign(`/operations/attendance/?booking=${encodeURIComponent(booking.id)}`);
  });

  render();
})();
