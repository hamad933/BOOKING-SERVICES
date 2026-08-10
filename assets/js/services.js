(() => {
  "use strict";

  const searchForm = document.querySelector("#service-search-form");
  const filterForm = document.querySelector("#service-filter-form");

  if (!searchForm || !filterForm) {
    return;
  }

  const searchInput = document.querySelector("#service-search-input");
  const categoryFilter = document.querySelector("#filter-category");
  const modeFilter = document.querySelector("#filter-mode");
  const durationFilter = document.querySelector("#filter-duration");
  const resultsCount = document.querySelector("#results-count");
  const servicesList = document.querySelector("#services-list");
  const serviceItems = Array.from(document.querySelectorAll(".catalog-service"));
  const activeFilterBar = document.querySelector("#active-filter-bar");
  const activeFilterChips = document.querySelector("#active-filter-chips");
  const clearAllButton = document.querySelector("#clear-all");
  const filterResetButton = document.querySelector("#filter-reset");
  const emptyResetButton = document.querySelector("#empty-reset");
  const emptyState = document.querySelector("#catalog-empty");
  const exampleButtons = Array.from(document.querySelectorAll("[data-search-example]"));

  const labelMaps = {
    category: {
      problem: "تشخيص وحل المشكلات",
      review: "مراجعة وتقييم",
      planning: "تخطيط وقرارات",
      discovery: "تحديد الاحتياج"
    },
    mode: {
      "in-person": "حضوري",
      remote: "عن بُعد"
    },
    duration: {
      "60-90": "60–90 دقيقة",
      "90-120": "90–120 دقيقة"
    }
  };

  const normalize = (value) => value
    .toLocaleLowerCase("ar")
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/ـ/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();

  const formatCount = (count) => {
    if (count === 0) return "لا توجد خدمات مطابقة";
    if (count === 1) return "خدمة واحدة متاحة";
    if (count === 2) return "خدمتان متاحتان";
    if (count >= 3 && count <= 10) return `${count} خدمات متاحة`;
    return `${count} خدمة متاحة`;
  };

  const state = () => ({
    query: normalize(searchInput.value),
    rawQuery: searchInput.value.trim(),
    category: categoryFilter.value,
    mode: modeFilter.value,
    duration: durationFilter.value
  });

  const matchesItem = (item, current) => {
    const searchable = normalize(item.dataset.search || item.textContent);
    const modes = (item.dataset.mode || "").split(/\s+/);

    const matchesQuery = current.query === "" || searchable.includes(current.query);
    const matchesCategory = current.category === "all" || item.dataset.category === current.category;
    const matchesMode = current.mode === "all" || modes.includes(current.mode);
    const matchesDuration = current.duration === "all" || item.dataset.duration === current.duration;

    return matchesQuery && matchesCategory && matchesMode && matchesDuration;
  };

  const removeFilter = (filterName) => {
    if (filterName === "query") searchInput.value = "";
    if (filterName === "category") categoryFilter.value = "all";
    if (filterName === "mode") modeFilter.value = "all";
    if (filterName === "duration") durationFilter.value = "all";
    applyFilters();
  };

  const makeChip = (label, filterName) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-chip";
    button.textContent = label;
    button.setAttribute("aria-label", `إزالة الفلتر: ${label}`);
    button.addEventListener("click", () => removeFilter(filterName));
    return button;
  };

  const renderActiveFilters = (current) => {
    activeFilterChips.replaceChildren();
    const chips = [];

    if (current.rawQuery) chips.push([`بحث: ${current.rawQuery}`, "query"]);
    if (current.category !== "all") chips.push([labelMaps.category[current.category], "category"]);
    if (current.mode !== "all") chips.push([labelMaps.mode[current.mode], "mode"]);
    if (current.duration !== "all") chips.push([labelMaps.duration[current.duration], "duration"]);

    chips.forEach(([label, filterName]) => activeFilterChips.append(makeChip(label, filterName)));
    activeFilterBar.hidden = chips.length === 0;
  };

  const applyFilters = () => {
    const current = state();
    let visibleCount = 0;

    serviceItems.forEach((item) => {
      const visible = matchesItem(item, current);
      item.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    resultsCount.textContent = formatCount(visibleCount);
    servicesList.hidden = visibleCount === 0;
    emptyState.hidden = visibleCount !== 0;
    renderActiveFilters(current);
  };

  const resetAll = () => {
    searchInput.value = "";
    categoryFilter.value = "all";
    modeFilter.value = "all";
    durationFilter.value = "all";
    applyFilters();
    searchInput.focus();
  };

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    applyFilters();
  });

  searchInput.addEventListener("input", applyFilters);
  filterForm.addEventListener("change", applyFilters);
  clearAllButton.addEventListener("click", resetAll);
  filterResetButton.addEventListener("click", () => {
    categoryFilter.value = "all";
    modeFilter.value = "all";
    durationFilter.value = "all";
    applyFilters();
  });
  emptyResetButton.addEventListener("click", resetAll);

  exampleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      searchInput.value = button.dataset.searchExample || "";
      applyFilters();
      searchInput.focus();
    });
  });

  applyFilters();
})();
