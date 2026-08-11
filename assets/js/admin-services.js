(() => {
  "use strict";

  const auth = window.RP03Auth;
  const store = window.RP03AdminState;
  if (!auth || !store || auth.currentRole() !== auth.ROLES.ADMIN) return;

  const el = (id) => document.getElementById(id);
  const search = el("service-search");
  const categoryFilter = el("service-category-filter");
  const modeFilter = el("service-mode-filter");
  const statusFilter = el("service-status-filter");
  const resetButton = el("service-reset");
  const addButton = el("service-add");
  const body = el("service-table-body");
  const tableWrap = el("service-table-wrap");
  const empty = el("service-empty");
  const count = el("service-result-count");
  const detail = el("service-detail");
  const kicker = el("service-detail-kicker");
  const detailTitle = el("service-detail-title");
  const detailSubtitle = el("service-detail-subtitle");
  const form = el("service-form");
  const error = el("service-form-error");
  const saveButton = el("service-save");
  const cancelButton = el("service-cancel");
  const announcer = el("service-announcer");

  let selectedId = null;
  let creating = false;

  const statusText = (active) => active ? "نشط" : "غير نشط";
  const clearError = () => {
    error.hidden = true;
    error.textContent = "";
    form.querySelectorAll("[aria-invalid='true']").forEach((node) => node.removeAttribute("aria-invalid"));
  };
  const announce = (message) => {
    announcer.textContent = message;
    window.clearTimeout(announce.timer);
    announce.timer = window.setTimeout(() => { announcer.textContent = ""; }, 4200);
  };
  const state = () => store.load();

  const fillCategoryFilter = () => {
    const current = categoryFilter.value || "ALL";
    const categories = [...new Set(state().services.map((item) => item.category))].sort((a, b) => a.localeCompare(b, "ar"));
    categoryFilter.innerHTML = '<option value="ALL">كل الفئات</option>' + categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
    categoryFilter.value = categories.includes(current) ? current : "ALL";
  };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
  const normalized = (value) => String(value || "").trim().toLocaleLowerCase("ar");

  const filteredServices = () => {
    const query = normalized(search.value);
    return state().services.filter((item) => {
      const haystack = normalized([item.title, item.description, item.category, item.duration, ...item.modes].join(" "));
      if (query && !haystack.includes(query)) return false;
      if (categoryFilter.value !== "ALL" && item.category !== categoryFilter.value) return false;
      if (modeFilter.value !== "ALL" && !item.modes.includes(modeFilter.value)) return false;
      if (statusFilter.value === "ACTIVE" && !item.active) return false;
      if (statusFilter.value === "INACTIVE" && item.active) return false;
      return true;
    });
  };

  const render = () => {
    fillCategoryFilter();
    const items = filteredServices();
    count.textContent = `${items.length} من ${state().services.length} سجل`;
    body.innerHTML = items.map((item) => {
      const selected = item.id === selectedId;
      return `<tr data-selected="${selected}">
        <td><button class="admin-record-button" type="button" data-service-id="${escapeHtml(item.id)}" aria-pressed="${selected}">${escapeHtml(item.title)}${selected ? '<span class="admin-selected-cue">محدد</span>' : ''}<small>${item.origin === "accepted-catalog-reference" ? "نسخة محلية من مفهوم الكتالوج العام" : "سجل اصطناعي مضاف محليًا"}</small></button></td>
        <td>${escapeHtml(item.category)}</td><td><span dir="ltr">${escapeHtml(item.duration.replace(" دقيقة", ""))}</span> دقيقة</td><td>${escapeHtml(item.modes.join("، "))}</td><td>${item.preparationRequired ? "مطلوب" : "غير مطلوب"}</td>
        <td><span class="admin-status ${item.active ? "admin-status-active" : "admin-status-inactive"}">${statusText(item.active)}</span></td>
      </tr>`;
    }).join("");
    const hasItems = items.length > 0;
    tableWrap.hidden = !hasItems;
    empty.hidden = hasItems;
    body.querySelectorAll("[data-service-id]").forEach((button) => button.addEventListener("click", () => selectService(button.dataset.serviceId)));
    if (selectedId && !state().services.some((item) => item.id === selectedId)) clearForm();
  };

  const setFormEnabled = (enabled) => {
    form.querySelectorAll("input:not([type='hidden']), select, textarea").forEach((control) => { control.disabled = !enabled; });
    saveButton.disabled = !enabled;
    cancelButton.disabled = !enabled;
  };

  const writeForm = (item) => {
    el("service-id").value = item?.id || "";
    el("service-title").value = item?.title || "";
    el("service-description").value = item?.description || "";
    el("service-category").value = item?.category || "";
    el("service-duration").value = item?.duration || "";
    el("service-mode-inperson").checked = item?.modes?.includes("حضوري") || false;
    el("service-mode-remote").checked = item?.modes?.includes("عن بُعد") || false;
    el("service-preparation-required").checked = item?.preparationRequired || false;
    el("service-preparation-summary").value = item?.preparationSummary || "";
    el("service-active").checked = item?.active ?? true;
  };

  const selectService = (id, focusDetail = false) => {
    const item = state().services.find((record) => record.id === id);
    if (!item) return;
    creating = false;
    selectedId = id;
    clearError();
    kicker.textContent = "الخدمة المحددة";
    detailTitle.textContent = item.title;
    detailSubtitle.textContent = item.origin === "accepted-catalog-reference" ? "نسخة إدارة محلية متوافقة مع مفهوم الخدمة في الكتالوج العام." : "سجل خدمة اصطناعي أُضيف داخل هذه الجلسة.";
    writeForm(item);
    setFormEnabled(true);
    render();
    if (focusDetail) detail.focus();
  };

  const beginCreate = () => {
    creating = true;
    selectedId = null;
    clearError();
    kicker.textContent = "سجل اصطناعي جديد";
    detailTitle.textContent = "إضافة خدمة محلية";
    detailSubtitle.textContent = "لن تظهر هذه الخدمة في الكتالوج العام؛ تحفظ داخل جلسة المتصفح فقط.";
    writeForm(null);
    setFormEnabled(true);
    render();
    el("service-title").focus();
  };

  const clearForm = () => {
    creating = false;
    selectedId = null;
    clearError();
    kicker.textContent = "الخدمة المحددة";
    detailTitle.textContent = "اختر خدمة من القائمة";
    detailSubtitle.textContent = "ستظهر حقول النسخة المحلية هنا.";
    writeForm(null);
    setFormEnabled(false);
    render();
  };

  const validate = () => {
    clearError();
    const invalid = [];
    ["service-title", "service-description", "service-category", "service-duration"].forEach((id) => {
      const field = el(id);
      if (!field.value.trim()) invalid.push(field);
    });
    if (!el("service-mode-inperson").checked && !el("service-mode-remote").checked) invalid.push(el("service-mode-inperson"));
    if (el("service-preparation-required").checked && !el("service-preparation-summary").value.trim()) invalid.push(el("service-preparation-summary"));
    if (!invalid.length) return true;
    invalid.forEach((field) => field.setAttribute("aria-invalid", "true"));
    error.textContent = "أكمل الحقول المطلوبة، واختر طريقة جلسة واحدة على الأقل. عند تفعيل التحضير يجب كتابة ملخص واضح.";
    error.hidden = false;
    invalid[0].focus();
    return false;
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validate()) return;
    const existing = selectedId ? state().services.find((item) => item.id === selectedId) : null;
    const modes = [el("service-mode-inperson"), el("service-mode-remote")].filter((node) => node.checked).map((node) => node.value);
    const record = {
      id: existing?.id || "",
      title: el("service-title").value.trim(),
      description: el("service-description").value.trim(),
      category: el("service-category").value,
      duration: el("service-duration").value,
      modes,
      preparationRequired: el("service-preparation-required").checked,
      preparationSummary: el("service-preparation-summary").value.trim() || "لا يتطلب تحضيرًا خاصًا.",
      active: el("service-active").checked,
      origin: existing?.origin || "synthetic-admin-local"
    };
    const updated = store.upsertService(record);
    const saved = updated.services.find((item) => item.id === existing?.id) || updated.services.find((item) => item.title === record.title);
    selectedId = saved?.id || selectedId;
    creating = false;
    fillCategoryFilter();
    selectService(selectedId);
    announce(existing ? "تم تحديث سجل الخدمة محليًا داخل هذه الجلسة." : "تمت إضافة خدمة اصطناعية محليًا داخل هذه الجلسة.");
  });

  addButton.addEventListener("click", beginCreate);
  cancelButton.addEventListener("click", () => selectedId ? selectService(selectedId) : clearForm());
  [search, categoryFilter, modeFilter, statusFilter].forEach((control) => control.addEventListener(control === search ? "input" : "change", render));
  resetButton.addEventListener("click", () => { search.value = ""; categoryFilter.value = "ALL"; modeFilter.value = "ALL"; statusFilter.value = "ALL"; render(); search.focus(); });
  form.querySelectorAll("input, select, textarea").forEach((control) => control.addEventListener("input", clearError));

  fillCategoryFilter();
  setFormEnabled(false);
  render();
  const first = state().services[0];
  if (first) selectService(first.id);
})();
