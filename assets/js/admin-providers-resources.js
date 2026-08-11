(() => {
  "use strict";
  const auth = window.RP03Auth;
  const store = window.RP03AdminState;
  if (!auth || !store || auth.currentRole() !== auth.ROLES.ADMIN) return;
  const el = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
  const normalized = (value) => String(value || "").trim().toLocaleLowerCase("ar");
  const splitTags = (value) => String(value || "").split(/[،,]/).map((item) => item.trim()).filter(Boolean);
  const announcer = el("entity-announcer");
  let activeTab = "providers";
  let selectedProviderId = null;
  let selectedResourceId = null;

  const announce = (message) => { announcer.textContent = message; window.clearTimeout(announce.timer); announce.timer = window.setTimeout(() => { announcer.textContent = ""; }, 4200); };
  const setError = (form, node, message, invalidNodes = []) => { form.querySelectorAll("[aria-invalid='true']").forEach((field) => field.removeAttribute("aria-invalid")); node.hidden = !message; node.textContent = message || ""; invalidNodes.forEach((field) => field.setAttribute("aria-invalid", "true")); if (invalidNodes[0]) invalidNodes[0].focus(); };
  const setEnabled = (form, enabled) => { form.querySelectorAll("input:not([type='hidden']), textarea").forEach((control) => { control.disabled = !enabled; }); form.querySelector("[type='submit']").disabled = !enabled; form.querySelector("[type='button']").disabled = !enabled; };
  const tagsHtml = (items) => `<div class="admin-tags">${items.map((item) => `<span class="admin-tag"${/[A-Za-z]/.test(item) ? ' dir="ltr" lang="en"' : ""}>${escapeHtml(item)}</span>`).join("")}</div>`;

  const fillProviderSpecialties = () => {
    const select = el("provider-specialty-filter");
    const current = select.value || "ALL";
    const values = [...new Set(store.load().providers.flatMap((item) => item.specialties))].sort((a,b) => a.localeCompare(b, "ar"));
    select.innerHTML = '<option value="ALL">كل التخصصات</option>' + values.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
    select.value = values.includes(current) ? current : "ALL";
  };
  const fillResourceTypes = () => {
    const select = el("resource-type-filter");
    const current = select.value || "ALL";
    const values = [...new Set(store.load().resources.map((item) => item.type))].sort((a,b) => a.localeCompare(b, "ar"));
    select.innerHTML = '<option value="ALL">كل الأنواع</option>' + values.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
    select.value = values.includes(current) ? current : "ALL";
  };

  const renderProviders = () => {
    fillProviderSpecialties();
    const query = normalized(el("provider-search").value);
    const specialty = el("provider-specialty-filter").value;
    const status = el("provider-status-filter").value;
    const all = store.load().providers;
    const items = all.filter((item) => {
      if (query && !normalized([item.name,item.role,item.experience,...item.specialties,...item.modes,item.notes].join(" ")).includes(query)) return false;
      if (specialty !== "ALL" && !item.specialties.includes(specialty)) return false;
      if (status === "ACTIVE" && !item.active) return false;
      if (status === "INACTIVE" && item.active) return false;
      return true;
    });
    el("provider-count").textContent = `${items.length} من ${all.length} سجل`;
    el("provider-table-wrap").hidden = !items.length; el("provider-empty").hidden = !!items.length;
    el("provider-table-body").innerHTML = items.map((item) => { const selected = item.id === selectedProviderId; return `<tr data-selected="${selected}"><td><button class="admin-record-button" type="button" data-provider-id="${escapeHtml(item.id)}" aria-pressed="${selected}">${escapeHtml(item.name)}${selected?'<span class="admin-selected-cue">محدد</span>':''}<small>${escapeHtml(item.experience || "سياق خبرة غير محدد")}</small></button></td><td>${escapeHtml(item.role)}</td><td>${tagsHtml(item.specialties)}</td><td>${escapeHtml(item.modes.join("، "))}</td><td><span class="admin-status ${item.active?"admin-status-active":"admin-status-inactive"}">${item.active?"نشط":"غير نشط"}</span></td></tr>`; }).join("");
    document.querySelectorAll("[data-provider-id]").forEach((button) => button.addEventListener("click", () => selectProvider(button.dataset.providerId)));
  };

  const writeProviderForm = (item) => {
    el("provider-id").value = item?.id || ""; el("provider-name").value = item?.name || ""; el("provider-role").value = item?.role || ""; el("provider-experience").value = item?.experience || ""; el("provider-specialties").value = item?.specialties?.join("، ") || ""; el("provider-mode-inperson").checked = item?.modes?.includes("حضوري") || false; el("provider-mode-remote").checked = item?.modes?.includes("عن بُعد") || false; el("provider-notes").value = item?.notes || ""; el("provider-active").checked = item?.active ?? true;
  };
  const selectProvider = (id) => {
    const item = store.load().providers.find((record) => record.id === id); if (!item) return; selectedProviderId = id; el("provider-kicker").textContent = "المستشار المحدد"; el("provider-detail-title").textContent = item.name; el("provider-detail-subtitle").textContent = "ملف قدرات وصفي؛ لا يمثل توفرًا أو إسنادًا أو جدولًا."; writeProviderForm(item); setError(el("provider-form"), el("provider-error"), ""); setEnabled(el("provider-form"), true); renderProviders();
  };
  const createProvider = () => { activeTab = "providers"; switchTab("providers"); selectedProviderId = null; el("provider-kicker").textContent = "سجل اصطناعي جديد"; el("provider-detail-title").textContent = "إضافة مستشار محلي"; el("provider-detail-subtitle").textContent = "سجل وصفي داخل جلسة المتصفح فقط."; writeProviderForm(null); setEnabled(el("provider-form"), true); renderProviders(); el("provider-name").focus(); };
  const clearProvider = () => { selectedProviderId = null; el("provider-kicker").textContent = "المستشار المحدد"; el("provider-detail-title").textContent = "اختر مستشارًا"; el("provider-detail-subtitle").textContent = "يظهر هنا السجل الوصفي والقدرات فقط."; writeProviderForm(null); setEnabled(el("provider-form"), false); renderProviders(); };

  el("provider-form").addEventListener("submit", (event) => {
    event.preventDefault(); const form = event.currentTarget; const invalid = [el("provider-name"), el("provider-role"), el("provider-specialties")].filter((field) => !field.value.trim()); const modes = [el("provider-mode-inperson"),el("provider-mode-remote")].filter((field)=>field.checked).map((field)=>field.value); if (!modes.length) invalid.push(el("provider-mode-inperson")); if (invalid.length) { setError(form, el("provider-error"), "أكمل الاسم والدور والتخصصات، واختر طريقة جلسة واحدة على الأقل.", invalid); return; }
    const record = { id:selectedProviderId||"", name:el("provider-name").value.trim(), role:el("provider-role").value.trim(), specialties:splitTags(el("provider-specialties").value), experience:el("provider-experience").value.trim(), modes, active:el("provider-active").checked, notes:el("provider-notes").value.trim() || "سجل وصفي اصطناعي محلي؛ لا يعبّر عن توفر أو إسناد." };
    const existing = !!selectedProviderId; const next = store.upsertProvider(record); const saved = next.providers.find((item)=>item.id===selectedProviderId) || next.providers.find((item)=>item.name===record.name); selectedProviderId = saved?.id || selectedProviderId; selectProvider(selectedProviderId); announce(existing ? "تم تحديث سجل المستشار الوصفي محليًا." : "تمت إضافة مستشار اصطناعي محليًا.");
  });
  el("provider-cancel").addEventListener("click", () => selectedProviderId ? selectProvider(selectedProviderId) : clearProvider());

  const renderResources = () => {
    fillResourceTypes(); const query=normalized(el("resource-search").value); const type=el("resource-type-filter").value; const status=el("resource-status-filter").value; const all=store.load().resources; const items=all.filter((item)=>{ if(query&&!normalized([item.name,item.type,...item.characteristics,item.notes].join(" ")).includes(query))return false; if(type!=="ALL"&&item.type!==type)return false; if(status==="ACTIVE"&&!item.active)return false; if(status==="INACTIVE"&&item.active)return false; return true; });
    el("resource-count").textContent=`${items.length} من ${all.length} سجل`; el("resource-table-wrap").hidden=!items.length; el("resource-empty").hidden=!!items.length; el("resource-table-body").innerHTML=items.map((item)=>{const selected=item.id===selectedResourceId;return `<tr data-selected="${selected}"><td><button class="admin-record-button" type="button" data-resource-id="${escapeHtml(item.id)}" aria-pressed="${selected}">${escapeHtml(item.name)}${selected?'<span class="admin-selected-cue">محدد</span>':''}<small>سجل وصفي محلي</small></button></td><td>${escapeHtml(item.type)}</td><td><span dir="ltr">${escapeHtml(item.capacity)}</span></td><td>${tagsHtml(item.characteristics)}</td><td><span class="admin-status ${item.active?"admin-status-active":"admin-status-inactive"}">${item.active?"نشط":"غير نشط"}</span></td></tr>`;}).join(""); document.querySelectorAll("[data-resource-id]").forEach((button)=>button.addEventListener("click",()=>selectResource(button.dataset.resourceId)));
  };
  const writeResourceForm=(item)=>{el("resource-id").value=item?.id||"";el("resource-name").value=item?.name||"";el("resource-type").value=item?.type||"";el("resource-capacity").value=item?.capacity||"";el("resource-characteristics").value=item?.characteristics?.join("، ")||"";el("resource-notes").value=item?.notes||"";el("resource-active").checked=item?.active??true;};
  const selectResource=(id)=>{const item=store.load().resources.find((record)=>record.id===id);if(!item)return;selectedResourceId=id;el("resource-kicker").textContent="المورد المحدد";el("resource-detail-title").textContent=item.name;el("resource-detail-subtitle").textContent="سجل رئيسي وصفي؛ الإشغال والحجز التشغيليان يبقيان في جدول الموارد التشغيلي.";writeResourceForm(item);setError(el("resource-form"),el("resource-error"),"");setEnabled(el("resource-form"),true);renderResources();};
  const createResource=()=>{activeTab="resources";switchTab("resources");selectedResourceId=null;el("resource-kicker").textContent="سجل اصطناعي جديد";el("resource-detail-title").textContent="إضافة مورد محلي";el("resource-detail-subtitle").textContent="إضافة وصفية فقط، دون إنشاء حجز أو إشغال.";writeResourceForm(null);setEnabled(el("resource-form"),true);renderResources();el("resource-name").focus();};
  const clearResource=()=>{selectedResourceId=null;el("resource-kicker").textContent="المورد المحدد";el("resource-detail-title").textContent="اختر موردًا";el("resource-detail-subtitle").textContent="يظهر هنا السجل الوصفي فقط، لا الإشغال التشغيلي.";writeResourceForm(null);setEnabled(el("resource-form"),false);renderResources();};
  el("resource-form").addEventListener("submit",(event)=>{event.preventDefault();const form=event.currentTarget;const invalid=[el("resource-name"),el("resource-type"),el("resource-capacity")].filter((field)=>!field.value.trim()|| (field===el("resource-capacity")&&Number(field.value)<1));if(invalid.length){setError(form,el("resource-error"),"أكمل اسم المورد ونوعه وسعة وصفية صحيحة.",invalid);return;}const record={id:selectedResourceId||"",name:el("resource-name").value.trim(),type:el("resource-type").value.trim(),capacity:Number(el("resource-capacity").value),characteristics:splitTags(el("resource-characteristics").value),active:el("resource-active").checked,notes:el("resource-notes").value.trim()||"سجل وصفي اصطناعي محلي؛ لا يمثل حجزًا أو إشغالًا."};const existing=!!selectedResourceId;const next=store.upsertResource(record);const saved=next.resources.find((item)=>item.id===selectedResourceId)||next.resources.find((item)=>item.name===record.name);selectedResourceId=saved?.id||selectedResourceId;selectResource(selectedResourceId);announce(existing?"تم تحديث سجل المورد الوصفي محليًا.":"تمت إضافة مورد اصطناعي محليًا.");});
  el("resource-cancel").addEventListener("click",()=>selectedResourceId?selectResource(selectedResourceId):clearResource());

  const switchTab = (name) => {
    activeTab=name; document.querySelectorAll("[data-entity-tab]").forEach((tab)=>{const active=tab.dataset.entityTab===name;tab.setAttribute("aria-selected",String(active));tab.tabIndex=active?0:-1;}); el("providers-panel").hidden=name!=="providers"; el("resources-panel").hidden=name!=="resources"; el("entity-add").textContent=name==="providers"?"إضافة مستشار اصطناعي":"إضافة مورد اصطناعي"; if(name==="providers")renderProviders();else renderResources();
  };
  document.querySelectorAll("[data-entity-tab]").forEach((tab)=>{tab.addEventListener("click",()=>switchTab(tab.dataset.entityTab));tab.addEventListener("keydown",(event)=>{if(!["ArrowLeft","ArrowRight"].includes(event.key))return;event.preventDefault();const next=activeTab==="providers"?"resources":"providers";switchTab(next);document.querySelector(`[data-entity-tab="${next}"]`).focus();});});
  el("entity-add").addEventListener("click",()=>activeTab==="providers"?createProvider():createResource());
  [el("provider-search"),el("provider-specialty-filter"),el("provider-status-filter")].forEach((control)=>control.addEventListener(control.type==="search"?"input":"change",renderProviders)); el("provider-reset").addEventListener("click",()=>{el("provider-search").value="";el("provider-specialty-filter").value="ALL";el("provider-status-filter").value="ALL";renderProviders();el("provider-search").focus();});
  [el("resource-search"),el("resource-type-filter"),el("resource-status-filter")].forEach((control)=>control.addEventListener(control.type==="search"?"input":"change",renderResources)); el("resource-reset").addEventListener("click",()=>{el("resource-search").value="";el("resource-type-filter").value="ALL";el("resource-status-filter").value="ALL";renderResources();el("resource-search").focus();});
  [el("provider-form"),el("resource-form")].forEach((form)=>form.querySelectorAll("input, textarea").forEach((control)=>control.addEventListener("input",()=>setError(form,form===el("provider-form")?el("provider-error"):el("resource-error"),""))));

  setEnabled(el("provider-form"),false);setEnabled(el("resource-form"),false);switchTab("providers");const firstProvider=store.load().providers[0];if(firstProvider)selectProvider(firstProvider.id);const firstResource=store.load().resources[0];if(firstResource){selectedResourceId=firstResource.id;writeResourceForm(firstResource);setEnabled(el("resource-form"),true);el("resource-detail-title").textContent=firstResource.name;el("resource-detail-subtitle").textContent="سجل رئيسي وصفي؛ الإشغال والحجز التشغيليان يبقيان في جدول الموارد التشغيلي.";}
})();
