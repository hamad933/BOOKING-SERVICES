(() => {
  "use strict";

  const flow = document.querySelector("#booking-flow");
  const summary = document.querySelector("#booking-summary");

  if (!flow || !summary) {
    return;
  }

  const TIMEZONE = "Asia/Aden";
  const HORIZON_DAYS = 45;
  const PAGE_SIZE = 7;
  const STORAGE_KEY = "rp03.s05.booking.v1";
  const TIMES = ["09:00", "10:30", "14:00", "15:30", "17:00", "18:30"];

  const dateStrip = document.querySelector("#date-strip");
  const previousDatesButton = document.querySelector("#date-prev");
  const nextDatesButton = document.querySelector("#date-next");
  const timeGrid = document.querySelector("#time-grid");
  const emptyAvailability = document.querySelector("#empty-availability");
  const staleWarning = document.querySelector("#stale-warning");
  const fullNameInput = document.querySelector("#full-name");
  const contactKindSelect = document.querySelector("#contact-kind");
  const contactValueInput = document.querySelector("#contact-value");
  const contactValueLabel = document.querySelector("#contact-value-label");
  const confirmButton = document.querySelector("#confirm-booking");
  const summaryMode = document.querySelector("#summary-mode");
  const summaryDate = document.querySelector("#summary-date");
  const summaryTime = document.querySelector("#summary-time");
  const summaryContact = document.querySelector("#summary-contact");
  const summaryValidation = document.querySelector("#summary-validation");
  const confirmationPanel = document.querySelector("#confirmation-panel");
  const confirmationDetails = document.querySelector("#confirmation-details");
  const localReference = document.querySelector("#local-reference");
  const editBookingButton = document.querySelector("#edit-booking");
  const modeInputs = Array.from(document.querySelectorAll('input[name="session-mode"]'));

  const errors = {
    mode: document.querySelector("#mode-error"),
    date: document.querySelector("#date-error"),
    time: document.querySelector("#time-error"),
    name: document.querySelector("#full-name-error"),
    contact: document.querySelector("#contact-value-error")
  };

  const state = {
    mode: "remote",
    selectedDate: null,
    selectedTime: null,
    pageStart: 0,
    staleSlots: new Set(),
    previewUnavailableDate: null,
    confirmed: false,
    reference: ""
  };

  const adenToday = () => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());

    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return new Date(Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day)
    ));
  };

  const today = adenToday();

  const addDays = (date, days) => {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  };

  const toDateKey = (date) => [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");

  const dateFromKey = (key) => {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  };

  const offsetForKey = (key) => Math.round((dateFromKey(key) - today) / 86400000);

  const dayStatus = (offset) => {
    const date = addDays(today, offset);
    const isFriday = date.getUTCDay() === 5;
    const fixtureClosed = [3, 10, 24, 38].includes(offset);

    return isFriday || fixtureClosed ? "unavailable" : "available";
  };

  const formatShortDate = (date) => new Intl.DateTimeFormat("ar-YE-u-nu-latn", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(date);

  const formatSummaryDate = (date) => new Intl.DateTimeFormat("ar-YE-u-nu-latn", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);

  const weekdayLabel = (date) => new Intl.DateTimeFormat("ar-YE-u-nu-latn", {
    timeZone: "UTC",
    weekday: "short"
  }).format(date);

  const dayMonthLabel = (date) => new Intl.DateTimeFormat("ar-YE-u-nu-latn", {
    timeZone: "UTC",
    day: "numeric",
    month: "short"
  }).format(date);

  const slotKey = (dateKey, time) => `${state.mode}|${dateKey}|${time}`;

  const baseSlotAvailability = (dateKey, time, index) => {
    const offset = offsetForKey(dateKey);
    const modeSeed = state.mode === "remote" ? 1 : 2;
    return ((offset + index + modeSeed) % 4) !== 0;
  };

  const staleCandidateForDate = (dateKey) => {
    const offset = offsetForKey(dateKey);
    const modeSeed = state.mode === "remote" ? 2 : 4;
    const preferredIndex = (offset + modeSeed) % TIMES.length;

    for (let step = 0; step < TIMES.length; step += 1) {
      const index = (preferredIndex + step) % TIMES.length;
      const time = TIMES[index];
      if (baseSlotAvailability(dateKey, time, index)) {
        return time;
      }
    }

    return null;
  };

  const isSlotAvailable = (dateKey, time, index) =>
    baseSlotAvailability(dateKey, time, index) &&
    !state.staleSlots.has(slotKey(dateKey, time));

  const clearError = (name) => {
    const node = errors[name];
    if (!node) return;
    node.hidden = true;
    node.textContent = "";
  };

  const setError = (name, message) => {
    const node = errors[name];
    if (!node) return;
    node.textContent = message;
    node.hidden = false;
  };

  const clearSummaryValidation = () => {
    summaryValidation.hidden = true;
    summaryValidation.textContent = "";
  };

  const currentModeLabel = () => state.mode === "in-person" ? "حضوري" : "عن بُعد";

  const selectedDateObject = () => state.selectedDate ? dateFromKey(state.selectedDate) : null;

  const saveState = () => {
    const payload = {
      mode: state.mode,
      selectedDate: state.selectedDate,
      selectedTime: state.selectedTime,
      pageStart: state.pageStart,
      staleSlots: Array.from(state.staleSlots),
      fullName: fullNameInput.value,
      contactKind: contactKindSelect.value,
      contactValue: contactValueInput.value,
      confirmed: state.confirmed,
      reference: state.reference
    };

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // The flow remains fully usable when browser session storage is unavailable.
    }
  };

  const restoreState = () => {
    let saved = null;

    try {
      saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      saved = null;
    }

    if (!saved || typeof saved !== "object") {
      return;
    }

    if (saved.mode === "remote" || saved.mode === "in-person") {
      state.mode = saved.mode;
    }

    if (typeof saved.selectedDate === "string") {
      const offset = offsetForKey(saved.selectedDate);
      if (offset >= 0 && offset < HORIZON_DAYS && dayStatus(offset) === "available") {
        state.selectedDate = saved.selectedDate;
      }
    }

    if (typeof saved.pageStart === "number") {
      const maxPageStart = Math.floor((HORIZON_DAYS - 1) / PAGE_SIZE) * PAGE_SIZE;
      state.pageStart = Math.max(0, Math.min(
        Math.floor(saved.pageStart / PAGE_SIZE) * PAGE_SIZE,
        maxPageStart
      ));
    }

    if (Array.isArray(saved.staleSlots)) {
      state.staleSlots = new Set(saved.staleSlots.filter((item) => typeof item === "string"));
    }

    if (typeof saved.selectedTime === "string" && TIMES.includes(saved.selectedTime) && state.selectedDate) {
      const index = TIMES.indexOf(saved.selectedTime);
      if (isSlotAvailable(state.selectedDate, saved.selectedTime, index)) {
        state.selectedTime = saved.selectedTime;
      }
    }

    fullNameInput.value = typeof saved.fullName === "string" ? saved.fullName : "";
    contactKindSelect.value = saved.contactKind === "phone" ? "phone" : "email";
    contactValueInput.value = typeof saved.contactValue === "string" ? saved.contactValue : "";
    state.confirmed = Boolean(saved.confirmed);
    state.reference = typeof saved.reference === "string" ? saved.reference : "";
  };

  const chooseInitialDateAndTime = () => {
    if (!state.selectedDate) {
      const firstAvailableOffset = Array.from({ length: HORIZON_DAYS }, (_, index) => index)
        .find((offset) => dayStatus(offset) === "available");

      if (typeof firstAvailableOffset === "number") {
        state.selectedDate = toDateKey(addDays(today, firstAvailableOffset));
        state.pageStart = Math.floor(firstAvailableOffset / PAGE_SIZE) * PAGE_SIZE;
      }
    }

    if (!state.selectedTime && state.selectedDate) {
      const staleCandidate = staleCandidateForDate(state.selectedDate);
      const firstSafeSlot = TIMES.find((time, index) =>
        isSlotAvailable(state.selectedDate, time, index) && time !== staleCandidate
      );

      const firstAvailable = TIMES.find((time, index) =>
        isSlotAvailable(state.selectedDate, time, index)
      );

      state.selectedTime = firstSafeSlot || firstAvailable || null;
    }
  };

  const renderModes = () => {
    modeInputs.forEach((input) => {
      input.checked = input.value === state.mode;
    });
    summaryMode.textContent = currentModeLabel();
  };

  const handleUnavailableDate = (offset) => {
    state.previewUnavailableDate = toDateKey(addDays(today, offset));
    state.selectedDate = null;
    state.selectedTime = null;
    clearError("date");
    clearError("time");
    staleWarning.hidden = true;
    renderDates();
    renderTimes();
    updateSummary();
    saveState();
  };

  const selectDate = (offset) => {
    if (offset < 0 || offset >= HORIZON_DAYS) {
      return;
    }

    if (dayStatus(offset) === "unavailable") {
      handleUnavailableDate(offset);
      return;
    }

    state.previewUnavailableDate = null;
    state.selectedDate = toDateKey(addDays(today, offset));
    state.selectedTime = null;
    staleWarning.hidden = true;
    clearError("date");
    clearError("time");

    const staleCandidate = staleCandidateForDate(state.selectedDate);
    state.selectedTime =
      TIMES.find((time, index) =>
        isSlotAvailable(state.selectedDate, time, index) && time !== staleCandidate
      ) ||
      TIMES.find((time, index) => isSlotAvailable(state.selectedDate, time, index)) ||
      null;

    renderDates();
    renderTimes();
    updateSummary();
    saveState();
  };

  const renderDates = () => {
    dateStrip.replaceChildren();

    const end = Math.min(state.pageStart + PAGE_SIZE, HORIZON_DAYS);

    for (let offset = state.pageStart; offset < end; offset += 1) {
      const date = addDays(today, offset);
      const key = toDateKey(date);
      const status = dayStatus(offset);
      const button = document.createElement("button");

      button.type = "button";
      button.className = "date-option";
      button.dataset.dateOffset = String(offset);
      button.dataset.dateKey = key;
      button.setAttribute("aria-pressed", String(state.selectedDate === key));
      button.setAttribute("aria-disabled", String(status === "unavailable"));
      button.setAttribute(
        "aria-label",
        `${formatShortDate(date)} — ${status === "available" ? "متاح للحجز" : "لا توجد مواعيد متاحة"}`
      );

      const weekday = document.createElement("span");
      weekday.className = "date-weekday";
      weekday.textContent = weekdayLabel(date);

      const day = document.createElement("span");
      day.className = "date-day";
      day.textContent = dayMonthLabel(date);

      const statusLabel = document.createElement("span");
      statusLabel.className = "date-status";
      statusLabel.textContent = status === "available" ? "متاح" : "لا توجد مواعيد";

      button.append(weekday, day, statusLabel);
      button.addEventListener("click", () => selectDate(offset));
      dateStrip.append(button);
    }

    previousDatesButton.disabled = state.pageStart === 0;
    nextDatesButton.disabled = state.pageStart + PAGE_SIZE >= HORIZON_DAYS;
  };

  const renderTimes = () => {
    timeGrid.replaceChildren();

    const noBookableDate = !state.selectedDate;
    const previewingUnavailable = Boolean(state.previewUnavailableDate);

    if (noBookableDate) {
      timeGrid.hidden = true;
      emptyAvailability.hidden = false;

      if (previewingUnavailable) {
        const previewDate = formatSummaryDate(dateFromKey(state.previewUnavailableDate));
        emptyAvailability.querySelector("strong").textContent = "لا توجد أوقات متاحة في هذا اليوم.";
        emptyAvailability.querySelector("p").textContent = `${previewDate} — اختر تاريخًا آخر ضمن نطاق الحجز.`;
      } else {
        emptyAvailability.querySelector("strong").textContent = "اختر تاريخًا لعرض الأوقات.";
        emptyAvailability.querySelector("p").textContent = "ستظهر الأوقات المتاحة بعد تحديد يوم صالح للحجز.";
      }
      return;
    }

    timeGrid.hidden = false;
    emptyAvailability.hidden = true;

    const staleCandidate = staleCandidateForDate(state.selectedDate);

    TIMES.forEach((time, index) => {
      const available = isSlotAvailable(state.selectedDate, time, index);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "time-option";
      button.dataset.time = time;
      button.dataset.staleCandidate = String(available && time === staleCandidate);
      button.disabled = !available;
      button.setAttribute("aria-pressed", String(state.selectedTime === time));
      button.setAttribute(
        "aria-label",
        `${time} — ${available ? (state.selectedTime === time ? "مختار" : "متاح") : "غير متاح"}`
      );

      const timeLabel = document.createElement("strong");
      timeLabel.textContent = time;
      const statusLabel = document.createElement("small");
      statusLabel.textContent = available
        ? (state.selectedTime === time ? "مختار" : "متاح")
        : "غير متاح";

      button.append(timeLabel, statusLabel);

      if (available) {
        button.addEventListener("click", () => {
          state.selectedTime = time;
          staleWarning.hidden = true;
          clearError("time");
          clearSummaryValidation();
          renderTimes();
          updateSummary();
          saveState();
        });
      }

      timeGrid.append(button);
    });
  };

  const updateContactFieldMode = () => {
    const phoneMode = contactKindSelect.value === "phone";

    contactValueLabel.textContent = phoneMode ? "رقم الهاتف" : "البريد الإلكتروني";
    contactValueInput.type = phoneMode ? "tel" : "email";
    contactValueInput.inputMode = phoneMode ? "tel" : "email";
    contactValueInput.autocomplete = phoneMode ? "tel" : "email";
    contactValueInput.placeholder = phoneMode ? "+967 7XX XXX XXX" : "name@example.com";
    contactValueInput.dir = "ltr";

    clearError("contact");
  };

  const updateSummary = () => {
    const date = selectedDateObject();

    summaryMode.textContent = currentModeLabel();
    summaryDate.textContent = date ? formatSummaryDate(date) : "لم يتم الاختيار";
    summaryTime.textContent = state.selectedTime || "لم يتم الاختيار";

    const name = fullNameInput.value.trim();
    const contact = contactValueInput.value.trim();

    if (name && contact) {
      summaryContact.textContent = `${name} — ${contact}`;
      summaryContact.dir = "auto";
    } else if (name) {
      summaryContact.textContent = `${name} — أضف وسيلة التواصل`;
      summaryContact.dir = "auto";
    } else {
      summaryContact.textContent = "أكمل الاسم ووسيلة التواصل.";
      summaryContact.removeAttribute("dir");
    }
  };

  const validateName = () => {
    const value = fullNameInput.value.trim();

    if (value.length < 3) {
      fullNameInput.setAttribute("aria-invalid", "true");
      setError("name", "أدخل الاسم الكامل بوضوح.");
      return false;
    }

    fullNameInput.removeAttribute("aria-invalid");
    clearError("name");
    return true;
  };

  const validateContact = () => {
    const value = contactValueInput.value.trim();
    const phoneMode = contactKindSelect.value === "phone";
    let valid = false;

    if (phoneMode) {
      const digits = value.replace(/\D/g, "");
      valid = digits.length >= 7 && digits.length <= 15;
    } else {
      valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    if (!valid) {
      contactValueInput.setAttribute("aria-invalid", "true");
      setError(
        "contact",
        phoneMode ? "أدخل رقم هاتف صالحًا للتواصل." : "أدخل بريدًا إلكترونيًا صالحًا للتواصل."
      );
      return false;
    }

    contactValueInput.removeAttribute("aria-invalid");
    clearError("contact");
    return true;
  };

  const validateSelection = () => {
    let valid = true;
    const modeSelected = modeInputs.some((input) => input.checked);

    if (!modeSelected) {
      setError("mode", "اختر طريقة الجلسة.");
      valid = false;
    } else {
      clearError("mode");
    }

    if (!state.selectedDate) {
      setError("date", "اختر تاريخًا متاحًا للحجز.");
      valid = false;
    } else {
      const offset = offsetForKey(state.selectedDate);
      if (offset < 0 || offset >= HORIZON_DAYS || dayStatus(offset) !== "available") {
        setError("date", "اختر تاريخًا صالحًا ضمن نطاق الحجز البالغ 45 يومًا.");
        valid = false;
      } else {
        clearError("date");
      }
    }

    if (!state.selectedTime || !state.selectedDate) {
      setError("time", "اختر وقتًا متاحًا.");
      valid = false;
    } else {
      const index = TIMES.indexOf(state.selectedTime);
      if (index < 0 || !isSlotAvailable(state.selectedDate, state.selectedTime, index)) {
        setError("time", "اختر وقتًا ما يزال متاحًا.");
        valid = false;
      } else {
        clearError("time");
      }
    }

    return valid;
  };

  const triggerStaleSlotIfNeeded = () => {
    if (!state.selectedDate || !state.selectedTime) {
      return false;
    }

    const candidate = staleCandidateForDate(state.selectedDate);
    if (state.selectedTime !== candidate) {
      return false;
    }

    state.staleSlots.add(slotKey(state.selectedDate, state.selectedTime));
    state.selectedTime = null;
    staleWarning.hidden = false;
    setError("time", "اختر وقتًا متاحًا آخر بعد تحديث التوفر.");
    summaryValidation.textContent = "تعذر تأكيد هذا الوقت لأنه لم يعد متاحًا. اختر وقتًا آخر.";
    summaryValidation.hidden = false;

    renderTimes();
    updateSummary();
    saveState();
    staleWarning.focus();
    return true;
  };

  const makeReference = () => {
    const now = new Date();
    const stamp = [
      now.getUTCFullYear(),
      String(now.getUTCMonth() + 1).padStart(2, "0"),
      String(now.getUTCDate()).padStart(2, "0"),
      String(now.getUTCHours()).padStart(2, "0"),
      String(now.getUTCMinutes()).padStart(2, "0")
    ].join("");
    return `LOCAL-RP03-${stamp}`;
  };

  const renderConfirmation = () => {
    if (!state.selectedDate || !state.selectedTime) {
      return;
    }

    const date = formatSummaryDate(dateFromKey(state.selectedDate));
    const name = fullNameInput.value.trim();
    const contact = contactValueInput.value.trim();

    confirmationDetails.replaceChildren();

    [
      ["الخدمة", "جلسة مراجعة وتقييم تقني"],
      ["طريقة الجلسة", currentModeLabel()],
      ["التاريخ", date],
      ["الوقت", `${state.selectedTime} — ${TIMEZONE}`],
      ["الاسم", name],
      ["وسيلة التواصل", contact]
    ].forEach(([label, value]) => {
      const wrapper = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      if (label === "الوقت" || label === "وسيلة التواصل") {
        description.dir = "auto";
      }
      wrapper.append(term, description);
      confirmationDetails.append(wrapper);
    });

    localReference.textContent = state.reference;
    flow.hidden = true;
    document.querySelector(".booking-aside").hidden = true;
    confirmationPanel.hidden = false;
    confirmationPanel.focus();
  };

  const showFlow = () => {
    state.confirmed = false;
    confirmationPanel.hidden = true;
    flow.hidden = false;
    document.querySelector(".booking-aside").hidden = false;
    saveState();
    document.querySelector("#booking-title").focus?.();
  };

  previousDatesButton.addEventListener("click", () => {
    state.pageStart = Math.max(0, state.pageStart - PAGE_SIZE);
    renderDates();
    saveState();
  });

  nextDatesButton.addEventListener("click", () => {
    const maxPageStart = Math.floor((HORIZON_DAYS - 1) / PAGE_SIZE) * PAGE_SIZE;
    state.pageStart = Math.min(maxPageStart, state.pageStart + PAGE_SIZE);
    renderDates();
    saveState();
  });

  modeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;

      state.mode = input.value;
      state.selectedTime = null;
      staleWarning.hidden = true;
      clearError("mode");
      clearError("time");
      clearSummaryValidation();

      if (state.selectedDate) {
        const candidate = staleCandidateForDate(state.selectedDate);
        state.selectedTime =
          TIMES.find((time, index) =>
            isSlotAvailable(state.selectedDate, time, index) && time !== candidate
          ) ||
          TIMES.find((time, index) => isSlotAvailable(state.selectedDate, time, index)) ||
          null;
      }

      renderModes();
      renderTimes();
      updateSummary();
      saveState();
    });
  });

  contactKindSelect.addEventListener("change", () => {
    contactValueInput.value = "";
    updateContactFieldMode();
    updateSummary();
    clearSummaryValidation();
    saveState();
    contactValueInput.focus();
  });

  fullNameInput.addEventListener("input", () => {
    if (fullNameInput.getAttribute("aria-invalid") === "true") {
      validateName();
    }
    updateSummary();
    clearSummaryValidation();
    saveState();
  });

  fullNameInput.addEventListener("blur", () => {
    if (fullNameInput.value.trim()) {
      validateName();
    }
  });

  contactValueInput.addEventListener("input", () => {
    if (contactValueInput.getAttribute("aria-invalid") === "true") {
      validateContact();
    }
    updateSummary();
    clearSummaryValidation();
    saveState();
  });

  contactValueInput.addEventListener("blur", () => {
    if (contactValueInput.value.trim()) {
      validateContact();
    }
  });

  confirmButton.addEventListener("click", () => {
    clearSummaryValidation();

    const selectionValid = validateSelection();
    const nameValid = validateName();
    const contactValid = validateContact();

    if (!selectionValid || !nameValid || !contactValid) {
      summaryValidation.textContent = "راجع الحقول المطلوبة والاختيارات المبيّنة قبل تأكيد الحجز.";
      summaryValidation.hidden = false;

      const firstInvalid = document.querySelector(
        '[aria-invalid="true"], #date-error:not([hidden]), #time-error:not([hidden])'
      );
      firstInvalid?.focus?.();
      return;
    }

    if (triggerStaleSlotIfNeeded()) {
      return;
    }

    state.confirmed = true;
    state.reference = state.reference || makeReference();
    saveState();
    renderConfirmation();
  });

  editBookingButton.addEventListener("click", showFlow);

  restoreState();
  chooseInitialDateAndTime();
  updateContactFieldMode();
  renderModes();
  renderDates();
  renderTimes();
  updateSummary();

  if (state.confirmed && state.reference && state.selectedDate && state.selectedTime) {
    renderConfirmation();
  } else {
    state.confirmed = false;
    confirmationPanel.hidden = true;
  }

  saveState();
})();
