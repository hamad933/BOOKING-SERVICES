(() => {
  "use strict";

  const STORAGE_KEY = "rp03.frontdesk.operations.v1";
  const S05_STORAGE_KEY = "rp03.s05.booking.v1";
  const TIMEZONE = "Asia/Aden";
  const DAY_MS = 86400000;

  const state = {
    bookingOverrides: {},
    attendanceOverrides: {},
    selectedBookingId: null,
    selectedSessionId: null
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

  const nowParts = () => adenParts(new Date());
  const todayKey = () => {
    const parts = nowParts();
    return `${parts.year}-${parts.month}-${parts.day}`;
  };

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

  const minutesFromTime = (value) => {
    const [hour, minute] = value.split(":").map(Number);
    return (hour * 60) + minute;
  };

  const timeFromMinutes = (minutes) => {
    const normalized = Math.max(0, Math.min((23 * 60) + 59, minutes));
    const hour = Math.floor(normalized / 60);
    const minute = normalized % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  const currentAdenMinutes = () => {
    const parts = nowParts();
    return (Number(parts.hour) * 60) + Number(parts.minute);
  };

  const formatDate = (key, options = {}) => new Intl.DateTimeFormat("ar-YE-u-nu-latn", {
    timeZone: "UTC",
    weekday: options.compact ? undefined : "long",
    day: "numeric",
    month: options.compact ? "short" : "long",
    year: options.compact ? undefined : "numeric"
  }).format(dateFromKey(key));

  const restore = () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return;
      if (saved.bookingOverrides && typeof saved.bookingOverrides === "object") state.bookingOverrides = saved.bookingOverrides;
      if (saved.attendanceOverrides && typeof saved.attendanceOverrides === "object") state.attendanceOverrides = saved.attendanceOverrides;
      if (typeof saved.selectedBookingId === "string") state.selectedBookingId = saved.selectedBookingId;
      if (typeof saved.selectedSessionId === "string") state.selectedSessionId = saved.selectedSessionId;
    } catch {
      // Current-session continuity is optional.
    }
  };

  const save = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The deterministic fixtures remain usable without storage.
    }
  };

  const syntheticBookings = (dateKey = todayKey()) => {
    const nextDay = moveDateKey(dateKey, 1);
    const previousDay = moveDateKey(dateKey, -1);
    const current = currentAdenMinutes();
    const safeUpcoming = timeFromMinutes(Math.min((23 * 60) + 30, current + 50));
    const safeChecked = timeFromMinutes(Math.max(0, current - 20));
    const safeProgress = timeFromMinutes(Math.max(0, current - 45));
    const safeCancelled = timeFromMinutes(Math.min((23 * 60) + 30, current + 150));
    const fixtures = [
      {
        id: "BK-2026-0401", guest: "خالد الحربي", email: "khaled.demo@example.test", contact: "+967 770 100 401",
        service: "جلسة مراجعة وتقييم تقني", dateKey, start: safeUpcoming, duration: 60, bookingState: "CONFIRMED",
        preparationState: "PENDING_REVIEW", proofState: "PENDING", consultant: "أ. أحمد السعدي", room: "عن بُعد", mode: "عن بُعد"
      },
      {
        id: "BK-2026-0402", guest: "سارة العمري", email: "sara.demo@example.test", contact: "+967 770 100 402",
        service: "جلسة استشارية للبنية التقنية", dateKey, start: safeChecked, duration: 60, bookingState: "CONFIRMED",
        preparationState: "READY", proofState: "VERIFIED", consultant: "أ. أحمد السعدي", room: "غرفة 2", mode: "حضوري"
      },
      {
        id: "BK-2026-0403", guest: "فيصل المرواني", email: "faisal.demo@example.test", contact: "+967 770 100 403",
        service: "جلسة تخطيط الطريق التقني", dateKey, start: safeProgress, duration: 60, bookingState: "CONFIRMED",
        preparationState: "FOLLOW_UP_REQUIRED", proofState: "FOLLOW_UP_REQUIRED", consultant: "أ. هدى الشريف", room: "عن بُعد", mode: "عن بُعد"
      },
      {
        id: "BK-2026-0404", guest: "نورة الشمري", email: "noura.demo@example.test", contact: "+967 770 100 404",
        service: "جلسة مراجعة للتطبيقات", dateKey, start: safeCancelled, duration: 90, bookingState: "CANCELLED",
        preparationState: "NOT_REQUIRED", proofState: "VERIFIED", consultant: "أ. ريم الجهني", room: "غرفة 1", mode: "حضوري"
      },
      {
        id: "BK-2026-0405", guest: "عبدالله القرني", email: "abdullah.demo@example.test", contact: "+967 770 100 405",
        service: "جلسة مراجعة معمارية للنظام", dateKey: nextDay, start: "11:30", duration: 60, bookingState: "PENDING_REVIEW",
        preparationState: "PENDING_REVIEW", proofState: "PENDING", consultant: "أ. سارة القحطاني", room: "غرفة 3", mode: "حضوري"
      },
      {
        id: "BK-2026-0398", guest: "ريم المطيري", email: "reem.demo@example.test", contact: "+967 770 100 398",
        service: "جلسة استشارية متخصصة", dateKey: previousDay, start: "17:00", duration: 60, bookingState: "CONFIRMED",
        preparationState: "READY", proofState: "VERIFIED", consultant: "أ. أحمد السعدي", room: "عن بُعد", mode: "عن بُعد"
      }
    ];

    return fixtures.map((item) => ({ ...item, ...(state.bookingOverrides[item.id] || {}), source: "fixture" }));
  };

  const readS05Booking = () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(S05_STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object" || !saved.confirmed || !saved.reference || !saved.selectedDate || !saved.selectedTime) {
        return null;
      }
      return {
        id: saved.reference,
        guest: typeof saved.fullName === "string" && saved.fullName.trim() ? saved.fullName.trim() : "ضيف تجريبي حديث",
        email: saved.contactKind === "email" && typeof saved.contactValue === "string" ? saved.contactValue : "",
        contact: typeof saved.contactValue === "string" ? saved.contactValue : "",
        service: "جلسة مراجعة وتقييم تقني",
        dateKey: saved.selectedDate,
        start: saved.selectedTime,
        duration: 60,
        bookingState: "CONFIRMED",
        preparationState: "PENDING_REVIEW",
        proofState: "PENDING",
        consultant: "غير معروض في سجل S05 المحلي",
        room: saved.mode === "in-person" ? "سياق حضوري — المورد غير معروض" : "عن بُعد",
        mode: saved.mode === "in-person" ? "حضوري" : "عن بُعد",
        source: "s05-local"
      };
    } catch {
      return null;
    }
  };

  const bookings = () => {
    const records = syntheticBookings();
    const recent = readS05Booking();
    if (recent && !records.some((item) => item.id === recent.id)) records.unshift(recent);
    return records.map((item) => ({ ...item, ...(state.bookingOverrides[item.id] || {}) }));
  };

  const baseAttendanceSessions = (dateKey = todayKey()) => {
    const current = currentAdenMinutes();
    const safeUpcoming = timeFromMinutes(Math.min((23 * 60) + 30, current + 50));
    const safeLate = timeFromMinutes(Math.max(0, current - 8));
    const safeNoShow = timeFromMinutes(Math.max(0, current - 30));
    const safeChecked = timeFromMinutes(Math.max(0, current - 20));
    const safeProgress = timeFromMinutes(Math.max(0, current - 45));
    const safeComplete = timeFromMinutes(Math.max(0, current - 120));
    const safeRecordedNoShow = timeFromMinutes(Math.max(0, current - 70));

    const sessions = [
      { id: "AT-0401", bookingId: "BK-2026-0401", guest: "خالد الحربي", service: "جلسة مراجعة وتقييم تقني", dateKey, start: safeUpcoming, duration: 60, baseState: "UPCOMING", consultant: "أ. أحمد السعدي", room: "عن بُعد", mode: "عن بُعد" },
      { id: "AT-0402", bookingId: "BK-2026-0402", guest: "سارة العمري", service: "جلسة استشارية للبنية التقنية", dateKey, start: safeChecked, duration: 60, baseState: "CHECKED_IN", consultant: "أ. أحمد السعدي", room: "غرفة 2", mode: "حضوري" },
      { id: "AT-0403", bookingId: "BK-2026-0403", guest: "فيصل المرواني", service: "جلسة تخطيط الطريق التقني", dateKey, start: safeProgress, duration: 60, baseState: "IN_PROGRESS", consultant: "أ. هدى الشريف", room: "عن بُعد", mode: "عن بُعد" },
      { id: "AT-0397", bookingId: "BK-2026-0397", guest: "ماجد الزهراني", service: "جلسة تقييم وتحسين الأداء", dateKey, start: safeComplete, duration: 60, baseState: "COMPLETED", consultant: "أ. ليلى الشمري", room: "غرفة 3", mode: "حضوري" },
      { id: "AT-0410", bookingId: "BK-2026-0410", guest: "عبدالله القحطاني", service: "جلسة استشارية للبنية التقنية", dateKey, start: safeLate, duration: 60, baseState: "UPCOMING", consultant: "أ. سارة القحطاني", room: "غرفة 1", mode: "حضوري" },
      { id: "AT-0411", bookingId: "BK-2026-0411", guest: "إيمان الشهري", service: "جلسة مراجعة أمان", dateKey, start: safeNoShow, duration: 60, baseState: "UPCOMING", consultant: "أ. هدى الشريف", room: "عن بُعد", mode: "عن بُعد" },
      { id: "AT-0396", bookingId: "BK-2026-0396", guest: "منى اليافعي", service: "جلسة استشارية تقنية", dateKey, start: safeRecordedNoShow, duration: 60, baseState: "NO_SHOW", consultant: "أ. ليلى الشمري", room: "غرفة 2", mode: "حضوري", followUpRequired: true }
    ];

    return sessions.map((item) => ({
      ...item,
      note: "",
      followUpRequired: false,
      ...(state.attendanceOverrides[item.id] || {})
    }));
  };

  const elapsedMinutesSinceStart = (sessionItem) => {
    if (sessionItem.dateKey !== todayKey()) {
      const comparison = sessionItem.dateKey.localeCompare(todayKey());
      return comparison < 0 ? 24 * 60 : -24 * 60;
    }
    return currentAdenMinutes() - minutesFromTime(sessionItem.start);
  };

  const attendanceState = (sessionItem) => {
    if (["CHECKED_IN", "IN_PROGRESS", "COMPLETED", "NO_SHOW"].includes(sessionItem.baseState)) return sessionItem.baseState;
    const elapsed = elapsedMinutesSinceStart(sessionItem);
    return elapsed < 0 ? "UPCOMING" : "LATE";
  };

  const noShowEligible = (sessionItem) => {
    const currentState = attendanceState(sessionItem);
    return ["UPCOMING", "LATE"].includes(currentState) && elapsedMinutesSinceStart(sessionItem) >= 15;
  };

  const attendanceSessions = (dateKey = todayKey()) => baseAttendanceSessions(dateKey).map((item) => ({
    ...item,
    state: attendanceState(item),
    noShowEligible: noShowEligible(item)
  }));

  const updateBooking = (id, patch) => {
    state.bookingOverrides[id] = { ...(state.bookingOverrides[id] || {}), ...patch };
    save();
  };

  const updateAttendance = (id, patch) => {
    state.attendanceOverrides[id] = { ...(state.attendanceOverrides[id] || {}), ...patch };
    save();
  };

  const selectBooking = (id) => {
    state.selectedBookingId = id;
    save();
  };

  const selectSession = (id) => {
    state.selectedSessionId = id;
    save();
  };

  restore();

  window.RP03Operations = Object.freeze({
    TIMEZONE,
    todayKey,
    moveDateKey,
    formatDate,
    minutesFromTime,
    currentAdenMinutes,
    bookings,
    attendanceSessions,
    updateBooking,
    updateAttendance,
    selectBooking,
    selectSession,
    selectedBookingId: () => state.selectedBookingId,
    selectedSessionId: () => state.selectedSessionId
  });
})();
