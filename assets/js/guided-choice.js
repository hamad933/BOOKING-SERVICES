(() => {
  "use strict";

  const root = document.querySelector("#guided-flow");
  const form = document.querySelector("#guided-form");

  if (!root || !form) {
    return;
  }

  const questionView = document.querySelector("#question-view");
  const recommendationView = document.querySelector("#recommendation-view");
  const progress = document.querySelector("#guided-progress");
  const questionStep = document.querySelector("#question-step");
  const questionLegend = document.querySelector("#question-legend");
  const questionHelp = document.querySelector("#question-help");
  const answerList = document.querySelector("#answer-list");
  const backButton = document.querySelector("#back-button");
  const continueButton = document.querySelector("#continue-button");
  const restartTop = document.querySelector("#restart-top");
  const restartResult = document.querySelector("#restart-result");
  const announcer = document.querySelector("#flow-announcer");

  const recommendationCategory = document.querySelector("#recommendation-category");
  const recommendationTitle = document.querySelector("#recommendation-title");
  const recommendationReason = document.querySelector("#recommendation-reason");
  const recommendationDuration = document.querySelector("#recommendation-duration");
  const recommendationMode = document.querySelector("#recommendation-mode");
  const recommendationOutcome = document.querySelector("#recommendation-outcome");
  const fitSignals = document.querySelector("#fit-signals");
  const answersSummaryList = document.querySelector("#answers-summary-list");
  const recommendationLink = document.querySelector("#recommendation-link");
  const deferredNote = document.querySelector("#deferred-note");

  const questions = [
    {
      id: "needType",
      shortLabel: "نوع الاحتياج",
      title: "ما نوع الاحتياج الأقرب إليك؟",
      help: "اختر الوصف الأقرب لما تحتاج إليه الآن.",
      options: [
        { value: "problem", label: "حل مشكلة تقنية", detail: "لدي مشكلة قائمة وأحتاج إلى فهم أسبابها وخيارات معالجتها." },
        { value: "review", label: "مراجعة أو تقييم تقني", detail: "أريد تقييم حالة تقنية أو منتج أو قرار بصورة منظمة." },
        { value: "planning", label: "تخطيط أو قرار تقني", detail: "لدي هدف أو قرار وأحتاج إلى ترتيب الخيارات والخطوات." },
        { value: "discovery", label: "تحديد الاحتياج أولًا", detail: "أعرف أنني أحتاج مساعدة تقنية، لكن الصورة ما تزال غير واضحة." }
      ]
    },
    {
      id: "currentStage",
      shortLabel: "الوضع الحالي",
      title: "أين أنت الآن في هذا الاحتياج؟",
      help: "يساعدنا هذا على التمييز بين التشخيص، والمراجعة، والقرار، والتخطيط.",
      options: [
        { value: "active_problem", label: "مشكلة تحدث الآن", detail: "هناك عطل أو تحدٍ قائم يحتاج إلى تحليل ومعالجة." },
        { value: "existing_implementation", label: "حل أو تنفيذ قائم", detail: "لدي منتج أو تنفيذ موجود وأريد مراجعته وتحسينه." },
        { value: "pending_decision", label: "قرار لم يُحسم بعد", detail: "أمامي قرار أو خيارات وأحتاج إلى وضوح قبل الاختيار." },
        { value: "early_stage", label: "بداية مبكرة أو غير واضحة", detail: "أحتاج إلى ضبط الاحتياج أو المتطلبات قبل أي خطوة أخرى." }
      ]
    },
    {
      id: "desiredOutcome",
      shortLabel: "المخرج المطلوب",
      title: "ما النتيجة التي تحتاجها أكثر من الجلسة؟",
      help: "اختر المخرج الرئيسي الذي سيجعل الجلسة مفيدة لك.",
      options: [
        { value: "diagnose", label: "فهم السبب وخطوات المعالجة", detail: "أريد تشخيصًا منظمًا للمشكلة وخيارات عملية للتعامل معها." },
        { value: "evaluate", label: "تقييم منظم وأولويات تحسين", detail: "أريد معرفة نقاط القوة والفجوات وما الذي يجب تحسينه أولًا." },
        { value: "compare", label: "مقارنة البدائل قبل القرار", detail: "أريد فهم المفاضلات والعوامل المؤثرة في اختيار البديل الأنسب." },
        { value: "plan", label: "خطة تنفيذ مرتبة", detail: "أريد تحويل الهدف إلى خطوات وأولويات قابلة للتنفيذ." },
        { value: "clarify", label: "تحديد المتطلبات والخطوة التالية", detail: "أحتاج إلى توضيح الاحتياج وصياغة نقطة بداية أوضح." }
      ]
    },
    {
      id: "discussionScope",
      shortLabel: "نطاق النقاش",
      title: "ما النطاق الأقرب لما ستناقشه؟",
      help: "اختر ما يصف موضوع الجلسة بصورة أفضل.",
      options: [
        { value: "focused_issue", label: "مشكلة أو عطل محدد", detail: "موضوع محدد يمكن وصفه ومناقشة أسبابه وتأثيره." },
        { value: "existing_solution", label: "منتج أو حل قائم", detail: "حل أو تنفيذ موجود يحتاج إلى مراجعة أو تقييم." },
        { value: "multiple_options", label: "خيارات أو بدائل متعددة", detail: "عدة خيارات تحتاج إلى مقارنة قبل اتخاذ القرار." },
        { value: "goal_or_project", label: "هدف أو مشروع جديد", detail: "هدف أريد تحويله إلى اتجاه وخطوات عملية." },
        { value: "broad_need", label: "وصف أولي للاحتياج فقط", detail: "لا أملك بعد تفاصيل كافية لتحديد نوع الخدمة بدقة." }
      ]
    }
  ];

  const services = {
    "problem-diagnosis": {
      title: "جلسة تشخيص مشكلة تقنية",
      category: "تشخيص وحل المشكلات",
      duration: "60–90 دقيقة",
      mode: "حضوري أو عن بُعد",
      outcome: "تشخيص منظم وخيارات عملية للمعالجة.",
      reason: "هذه الخدمة مناسبة عندما تكون الأولوية لفهم مشكلة قائمة، وتحديد أسبابها المحتملة، ثم مناقشة خطوات عملية لمعالجتها.",
      route: "/services/problem-diagnosis/",
      implemented: false
    },
    "technical-review": {
      title: "جلسة مراجعة وتقييم تقني",
      category: "مراجعة وتقييم",
      duration: "60–90 دقيقة",
      mode: "حضوري أو عن بُعد",
      outcome: "تقييم منظم وتوصيات واضحة.",
      reason: "هذه الخدمة مناسبة عندما تحتاج إلى مراجعة منظمة لحالة تقنية أو قرار، مع تحديد نقاط القوة والفجوات وترتيب أولويات التحسين.",
      route: "/services/technical-review/",
      implemented: true
    },
    "planning-execution": {
      title: "جلسة تخطيط وتنفيذ",
      category: "تخطيط وقرارات",
      duration: "90–120 دقيقة",
      mode: "حضوري أو عن بُعد",
      outcome: "خطة عملية مرتبة وقابلة للتنفيذ.",
      reason: "هذه الخدمة مناسبة عندما يكون لديك هدف واضح وتحتاج إلى تحويله إلى خطة تقنية مرتبة بخطوات وأولويات عملية.",
      route: "/services/planning-execution/",
      implemented: false
    },
    "decision-options": {
      title: "جلسة تقييم خيارات قبل قرار تقني",
      category: "تخطيط وقرارات",
      duration: "60–90 دقيقة",
      mode: "عن بُعد",
      outcome: "مقارنة واضحة بين البدائل والعوامل المؤثرة في القرار.",
      reason: "هذه الخدمة مناسبة عندما تكون أمام بدائل قبل قرار مهم وتحتاج إلى مقارنة المفاضلات والعوامل المؤثرة في الاختيار.",
      route: "/services/decision-options/",
      implemented: false
    },
    "implementation-review": {
      title: "مراجعة حل أو تنفيذ قائم",
      category: "مراجعة وتقييم",
      duration: "60–90 دقيقة",
      mode: "حضوري أو عن بُعد",
      outcome: "مراجعة اتجاه التنفيذ والتحسينات ذات الأولوية.",
      reason: "هذه الخدمة مناسبة عندما يكون لديك حل أو تنفيذ قائم وتريد التحقق من اتجاهه وتحديد التحسينات ذات الأولوية.",
      route: "/services/implementation-review/",
      implemented: false
    },
    "needs-discovery": {
      title: "جلسة تحديد الاحتياج التقني",
      category: "تحديد الاحتياج",
      duration: "60–90 دقيقة",
      mode: "حضوري أو عن بُعد",
      outcome: "متطلبات أولية وخطوة تالية أوضح.",
      reason: "هذه الخدمة مناسبة عندما تكون الصورة ما تزال غير مكتملة وتحتاج أولًا إلى توضيح الاحتياج وتحويله إلى متطلبات أولية وخطوة تالية أوضح.",
      route: "/services/needs-discovery/",
      implemented: false
    }
  };

  let currentStep = 0;
  let flowState = "INITIAL";
  const answers = {};

  const setFlowState = (nextState) => {
    flowState = nextState;
    root.dataset.flowState = nextState;
  };

  const selectedOption = (questionIndex) => {
    const question = questions[questionIndex];
    const selectedValue = answers[question.id];
    return question.options.find((option) => option.value === selectedValue) || null;
  };

  const labelFor = (questionIndex) => selectedOption(questionIndex)?.label || "لم تُحدد إجابة";

  const renderProgress = (recommendationReady = false) => {
    progress.replaceChildren();
    const labels = questions.map((question) => question.shortLabel).concat("التوصية");

    labels.forEach((label, index) => {
      const item = document.createElement("li");
      item.className = "progress-item";

      let status = "pending";
      if (recommendationReady) {
        status = index < 4 ? "complete" : "current";
      } else if (index < currentStep) {
        status = "complete";
      } else if (index === currentStep) {
        status = "current";
      }

      item.dataset.status = status;

      const canEdit = index < 4 && Boolean(answers[questions[index].id]) && (status === "complete" || recommendationReady);
      const control = document.createElement(canEdit ? "button" : "div");
      control.className = canEdit ? "progress-step-button" : "progress-step-static";

      if (canEdit) {
        control.type = "button";
        control.dataset.editStep = String(index);
        control.setAttribute("aria-label", `تعديل ${label}`);
      }

      const marker = document.createElement("span");
      marker.className = "progress-marker";
      marker.setAttribute("aria-hidden", "true");
      marker.textContent = String(index + 1);

      const labelNode = document.createElement("span");
      labelNode.className = "progress-label";
      labelNode.textContent = label;

      const statusText = document.createElement("span");
      statusText.className = "sr-only";
      statusText.textContent = status === "complete" ? "مكتمل" : status === "current" ? "الحالي" : "لم يبدأ";

      control.append(marker, labelNode, statusText);
      item.append(control);
      progress.append(item);
    });
  };

  const makeAnswerOption = (question, option, index) => {
    const label = document.createElement("label");
    label.className = "answer-option";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = question.id;
    input.value = option.value;
    input.id = `${question.id}-${index}`;
    input.checked = answers[question.id] === option.value;

    const copy = document.createElement("span");
    copy.className = "answer-copy";

    const strong = document.createElement("strong");
    strong.textContent = option.label;

    const detail = document.createElement("span");
    detail.textContent = option.detail;

    const selected = document.createElement("span");
    selected.className = "answer-selected-mark";
    selected.textContent = "محدد";
    selected.setAttribute("aria-hidden", "true");

    copy.append(strong, detail);
    label.append(input, copy, selected);
    return label;
  };

  const renderQuestion = ({ announce = true, focus = false } = {}) => {
    const question = questions[currentStep];
    questionView.hidden = false;
    recommendationView.hidden = true;

    questionStep.textContent = `السؤال ${currentStep + 1} من 4`;
    questionLegend.textContent = question.title;
    questionHelp.textContent = question.help;
    answerList.replaceChildren(...question.options.map((option, index) => makeAnswerOption(question, option, index)));

    const hasSelection = Boolean(answers[question.id]);
    continueButton.disabled = !hasSelection;
    continueButton.innerHTML = currentStep === questions.length - 1
      ? "عرض التوصية <span aria-hidden=\"true\">←</span>"
      : "متابعة <span aria-hidden=\"true\">←</span>";
    backButton.disabled = currentStep === 0;

    renderProgress(false);

    if (flowState !== "PREVIOUS_STEP_EDIT") {
      setFlowState(hasSelection ? "ANSWER_SELECTED" : currentStep === 0 ? "INITIAL" : "QUESTION_IN_PROGRESS");
    }

    if (announce) {
      announcer.textContent = `${questionStep.textContent}: ${question.title}`;
    }

    if (focus) {
      questionLegend.setAttribute("tabindex", "-1");
      questionLegend.focus({ preventScroll: true });
    }
  };

  const recommendationKey = () => {
    const needType = answers.needType;
    const currentStage = answers.currentStage;
    const desiredOutcome = answers.desiredOutcome;
    const discussionScope = answers.discussionScope;

    if (
      needType === "discovery" ||
      currentStage === "early_stage" ||
      desiredOutcome === "clarify" ||
      discussionScope === "broad_need"
    ) {
      return "needs-discovery";
    }

    if (
      currentStage === "existing_implementation" &&
      (needType === "review" || desiredOutcome === "evaluate" || discussionScope === "existing_solution")
    ) {
      return "implementation-review";
    }

    if (
      currentStage === "pending_decision" &&
      (desiredOutcome === "compare" || discussionScope === "multiple_options")
    ) {
      return "decision-options";
    }

    if (
      needType === "problem" ||
      currentStage === "active_problem" ||
      desiredOutcome === "diagnose" ||
      discussionScope === "focused_issue"
    ) {
      return "problem-diagnosis";
    }

    if (needType === "review" || desiredOutcome === "evaluate") {
      return "technical-review";
    }

    return "planning-execution";
  };

  const buildFitSignals = (serviceKey) => {
    const signals = [];
    const labels = questions.map((_, index) => labelFor(index));

    if (serviceKey === "needs-discovery") {
      signals.push(`احتياجك ما يزال في مرحلة تحتاج إلى وضوح: «${labels[0]}».`);
      signals.push(`وضعك الحالي يشير إلى أن البداية الأنسب هي «${labels[1]}».`);
      signals.push(`المخرج الذي طلبته هو «${labels[2]}».`);
    } else if (serviceKey === "implementation-review") {
      signals.push(`لديك «${labels[1]}»، لذلك التركيز على مراجعة ما هو قائم أكثر ملاءمة.`);
      signals.push(`المخرج المطلوب هو «${labels[2]}».`);
      signals.push(`نطاق النقاش الذي اخترته هو «${labels[3]}».`);
    } else if (serviceKey === "decision-options") {
      signals.push(`أنت في مرحلة «${labels[1]}».`);
      signals.push(`تريد «${labels[2]}» بدل البدء في التنفيذ مباشرة.`);
      signals.push(`نطاق النقاش يتضمن «${labels[3]}».`);
    } else if (serviceKey === "problem-diagnosis") {
      signals.push(`نوع الاحتياج الأقرب لديك هو «${labels[0]}».`);
      signals.push(`وضعك الحالي هو «${labels[1]}».`);
      signals.push(`النتيجة التي طلبتها هي «${labels[2]}».`);
    } else if (serviceKey === "technical-review") {
      signals.push(`اخترت «${labels[0]}» كنوع الاحتياج.`);
      signals.push(`هدف الجلسة لديك هو «${labels[2]}».`);
      signals.push(`نطاق النقاش هو «${labels[3]}»، ما يجعل المراجعة المنظمة نقطة بداية مناسبة.`);
    } else {
      signals.push(`نوع احتياجك يتجه إلى «${labels[0]}».`);
      signals.push(`المخرج الذي تريده هو «${labels[2]}».`);
      signals.push(`نطاق النقاش «${labels[3]}» يناسب تحويل الهدف إلى خطة مرتبة.`);
    }

    return signals;
  };

  const renderAnswersSummary = () => {
    answersSummaryList.replaceChildren();

    questions.forEach((question, index) => {
      const row = document.createElement("li");
      row.className = "answer-summary-row";

      const number = document.createElement("span");
      number.className = "answer-summary-number";
      number.textContent = String(index + 1);

      const copy = document.createElement("span");
      copy.className = "answer-summary-copy";
      const strong = document.createElement("strong");
      strong.textContent = question.shortLabel;
      const value = document.createElement("span");
      value.textContent = labelFor(index);
      copy.append(strong, value);

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "answer-summary-edit";
      edit.dataset.editStep = String(index);
      edit.textContent = "تعديل";
      edit.setAttribute("aria-label", `تعديل إجابة ${question.shortLabel}`);

      row.append(number, copy, edit);
      answersSummaryList.append(row);
    });
  };

  const renderRecommendation = () => {
    const key = recommendationKey();
    const service = services[key];

    questionView.hidden = true;
    recommendationView.hidden = false;
    setFlowState("RECOMMENDATION_READY");
    renderProgress(true);

    recommendationCategory.textContent = service.category;
    recommendationTitle.textContent = service.title;
    recommendationReason.textContent = service.reason;
    recommendationDuration.textContent = service.duration;
    recommendationMode.textContent = service.mode;
    recommendationOutcome.textContent = service.outcome;

    fitSignals.replaceChildren();
    buildFitSignals(key).forEach((signal) => {
      const item = document.createElement("li");
      item.textContent = signal;
      fitSignals.append(item);
    });

    renderAnswersSummary();

    if (service.implemented) {
      recommendationLink.href = service.route;
      recommendationLink.innerHTML = "عرض تفاصيل الخدمة <span aria-hidden=\"true\">←</span>";
      recommendationLink.removeAttribute("data-deferred-target");
      deferredNote.hidden = true;
      deferredNote.textContent = "";
    } else {
      recommendationLink.href = "/services/";
      recommendationLink.innerHTML = "عرض الخدمة في دليل الخدمات <span aria-hidden=\"true\">←</span>";
      recommendationLink.dataset.deferredTarget = service.route;
      deferredNote.hidden = false;
      deferredNote.textContent = "صفحة التفاصيل الخاصة بهذه الخدمة لم تُنفّذ بعد. لن ننشئ صفحة بديلة؛ يمكنك مراجعة الخدمة الآن داخل دليل الخدمات.";
    }

    announcer.textContent = `اكتملت الأسئلة. التوصية: ${service.title}.`;
    recommendationTitle.setAttribute("tabindex", "-1");
    recommendationTitle.focus({ preventScroll: true });
  };

  const editStep = (index) => {
    if (!Number.isInteger(index) || index < 0 || index >= questions.length || !answers[questions[index].id]) {
      return;
    }

    currentStep = index;
    setFlowState("PREVIOUS_STEP_EDIT");
    renderQuestion({ announce: true, focus: true });
  };

  const restart = () => {
    Object.keys(answers).forEach((key) => delete answers[key]);
    currentStep = 0;
    setFlowState("RESTARTED");
    renderQuestion({ announce: false, focus: true });
    setFlowState("RESTARTED");
    announcer.textContent = "تمت إعادة بدء مسار التوجيه. السؤال الأول: ما نوع الاحتياج الأقرب إليك؟";
  };

  answerList.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "radio") {
      return;
    }

    const question = questions[currentStep];
    answers[question.id] = target.value;
    continueButton.disabled = false;
    setFlowState(flowState === "PREVIOUS_STEP_EDIT" ? "PREVIOUS_STEP_EDIT" : "ANSWER_SELECTED");
    announcer.textContent = `تم اختيار: ${labelFor(currentStep)}.`;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = questions[currentStep];

    if (!answers[question.id]) {
      continueButton.disabled = true;
      announcer.textContent = "اختر إجابة قبل المتابعة.";
      return;
    }

    if (currentStep < questions.length - 1) {
      currentStep += 1;
      setFlowState("QUESTION_IN_PROGRESS");
      renderQuestion({ announce: true, focus: true });
      return;
    }

    renderRecommendation();
  });

  backButton.addEventListener("click", () => {
    if (currentStep === 0) {
      return;
    }

    currentStep -= 1;
    setFlowState("PREVIOUS_STEP_EDIT");
    renderQuestion({ announce: true, focus: true });
  });

  progress.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-step]");
    if (!button) {
      return;
    }
    editStep(Number(button.dataset.editStep));
  });

  answersSummaryList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-step]");
    if (!button) {
      return;
    }
    editStep(Number(button.dataset.editStep));
  });

  restartTop.addEventListener("click", restart);
  restartResult.addEventListener("click", restart);

  renderQuestion({ announce: false });
})();
