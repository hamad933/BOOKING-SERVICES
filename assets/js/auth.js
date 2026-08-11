(() => {
  "use strict";

  const SESSION_KEY = "rp03.auth.session.v1";

  const ROLES = Object.freeze({
    GUEST: "GUEST",
    AUTHENTICATED_CUSTOMER: "AUTHENTICATED_CUSTOMER",
    ADMIN: "ADMIN",
    CONSULTANT: "CONSULTANT"
  });

  const ROLE_LABELS = Object.freeze({
    GUEST: "زائر",
    AUTHENTICATED_CUSTOMER: "عميل مسجّل",
    ADMIN: "مسؤول",
    CONSULTANT: "مستشار تقني"
  });

  const ROLE_DESTINATIONS = Object.freeze({
    AUTHENTICATED_CUSTOMER: "/",
    ADMIN: "/",
    CONSULTANT: "/provider/schedule/"
  });

  const isKnownRole = (role) => Object.values(ROLES).includes(role);

  const safeReturnPath = (value) => {
    if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
      return null;
    }

    try {
      const parsed = new URL(value, window.location.origin);
      if (parsed.origin !== window.location.origin) return null;
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return null;
    }
  };

  const readSession = () => {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
      if (!parsed || typeof parsed !== "object" || !isKnownRole(parsed.role) || parsed.role === ROLES.GUEST) {
        return null;
      }

      return {
        role: parsed.role,
        displayName: typeof parsed.displayName === "string" ? parsed.displayName : ROLE_LABELS[parsed.role],
        source: typeof parsed.source === "string" ? parsed.source : "demo",
        createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : ""
      };
    } catch {
      return null;
    }
  };

  const writeSession = (role, displayName, source) => {
    if (!isKnownRole(role) || role === ROLES.GUEST) {
      throw new Error("Unsupported RP03 demo role.");
    }

    const session = {
      role,
      displayName: displayName || ROLE_LABELS[role],
      source: source || "demo",
      createdAt: new Date().toISOString()
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  };

  const clearSession = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Clearing a missing or inaccessible browser session is already equivalent to logout.
    }
  };

  const currentRole = () => readSession()?.role || ROLES.GUEST;
  const roleLabel = (role = currentRole()) => ROLE_LABELS[role] || ROLE_LABELS.GUEST;

  const defaultDestination = (role = currentRole()) => ROLE_DESTINATIONS[role] || "/";

  const redirectAfterEntry = (role, requestedReturn) => {
    const safe = safeReturnPath(requestedReturn);

    if (safe === "/provider/schedule/" || safe.startsWith("/provider/schedule/?")) {
      if (role === ROLES.CONSULTANT) {
        window.location.assign(safe);
        return;
      }

      const denied = new URL("/unauthorized/", window.location.origin);
      denied.searchParams.set("from", safe);
      denied.searchParams.set("required", ROLES.CONSULTANT);
      window.location.assign(`${denied.pathname}${denied.search}`);
      return;
    }

    window.location.assign(safe || defaultDestination(role));
  };

  const createDemoSession = (role, requestedReturn = null) => {
    const allowedDemoRoles = [ROLES.AUTHENTICATED_CUSTOMER, ROLES.CONSULTANT];
    if (!allowedDemoRoles.includes(role)) {
      return { ok: false, reason: "ROLE_NOT_AVAILABLE_FOR_DEMO_ENTRY" };
    }

    const names = {
      AUTHENTICATED_CUSTOMER: "عميل تجريبي",
      CONSULTANT: "المستشار أحمد س."
    };

    const session = writeSession(role, names[role], "bounded-demo-entry");
    redirectAfterEntry(role, requestedReturn);
    return { ok: true, session };
  };

  const loginWithCredentials = (username, password, requestedReturn = null) => {
    if (username === "admin" && password === "admin") {
      const session = writeSession(ROLES.ADMIN, "مسؤول النظام التجريبي", "approved-admin-fixture");
      redirectAfterEntry(ROLES.ADMIN, requestedReturn);
      return { ok: true, session };
    }

    return { ok: false, reason: "INVALID_DEMO_CREDENTIALS" };
  };

  const requireRole = (allowedRoles) => {
    const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const session = readSession();
    const currentPath = `${window.location.pathname}${window.location.search}`;

    if (!session) {
      const login = new URL("/login/", window.location.origin);
      login.searchParams.set("return", currentPath);
      window.location.replace(`${login.pathname}${login.search}`);
      return null;
    }

    if (!allowed.includes(session.role)) {
      const denied = new URL("/unauthorized/", window.location.origin);
      denied.searchParams.set("from", currentPath);
      denied.searchParams.set("required", allowed.join(","));
      window.location.replace(`${denied.pathname}${denied.search}`);
      return null;
    }

    document.body.dataset.authPending = "false";
    document.body.dataset.authRole = session.role;
    document.querySelectorAll("[data-auth-display-name]").forEach((node) => {
      node.textContent = session.displayName;
    });
    document.querySelectorAll("[data-auth-role-label]").forEach((node) => {
      node.textContent = roleLabel(session.role);
    });

    return session;
  };

  const logout = (redirectTo = "/login/") => {
    clearSession();
    window.location.assign(safeReturnPath(redirectTo) || "/login/");
  };

  const bindLogoutControls = () => {
    document.querySelectorAll("[data-auth-logout]").forEach((control) => {
      control.addEventListener("click", () => logout(control.dataset.authLogoutTarget || "/login/"));
    });
  };

  const initLoginPage = () => {
    const root = document.querySelector("[data-auth-login]");
    if (!root) return;

    const form = root.querySelector("#demo-login-form");
    const username = root.querySelector("#demo-username");
    const password = root.querySelector("#demo-password");
    const error = root.querySelector("#login-error");
    const announcer = root.querySelector("#login-announcer");
    const returnPath = safeReturnPath(new URLSearchParams(window.location.search).get("return"));
    const activeSession = readSession();
    const sessionPanel = root.querySelector("#active-session");

    if (activeSession && sessionPanel) {
      sessionPanel.hidden = false;
      sessionPanel.querySelector("[data-current-role]").textContent = roleLabel(activeSession.role);
      const continueLink = sessionPanel.querySelector("[data-session-continue]");
      continueLink.href = activeSession.role === ROLES.CONSULTANT ? "/provider/schedule/" : defaultDestination(activeSession.role);
    }

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      error.hidden = true;
      error.textContent = "";

      const result = loginWithCredentials(username.value.trim(), password.value, returnPath);
      if (!result.ok) {
        error.textContent = "بيانات الدخول لا تطابق بيانات العرض التجريبية المتاحة.";
        error.hidden = false;
        username.setAttribute("aria-invalid", "true");
        password.setAttribute("aria-invalid", "true");
        username.focus();
      }
    });

    [username, password].forEach((field) => {
      field?.addEventListener("input", () => {
        field.removeAttribute("aria-invalid");
        error.hidden = true;
      });
    });

    root.querySelectorAll("[data-demo-role]").forEach((button) => {
      button.addEventListener("click", () => {
        const role = button.dataset.demoRole;
        announcer.textContent = role === ROLES.CONSULTANT
          ? "جارٍ إنشاء جلسة مستشار تجريبية محلية."
          : "جارٍ إنشاء جلسة عميل تجريبية محلية.";
        createDemoSession(role, returnPath);
      });
    });
  };

  const initUnauthorizedPage = () => {
    const root = document.querySelector("[data-auth-unauthorized]");
    if (!root) return;

    const session = readSession();
    const roleNode = root.querySelector("[data-current-role]");
    const action = root.querySelector("[data-unauthorized-primary]");

    if (session) {
      roleNode.textContent = roleLabel(session.role);
      action.textContent = session.role === ROLES.CONSULTANT ? "العودة إلى جدولي" : "العودة إلى الصفحة الرئيسية";
      action.href = session.role === ROLES.CONSULTANT ? "/provider/schedule/" : "/";
    } else {
      roleNode.textContent = ROLE_LABELS.GUEST;
      action.textContent = "تسجيل الدخول";
      action.href = "/login/";
    }
  };

  const initGuard = () => {
    const guard = document.body?.dataset.authGuard;
    if (!guard) return;
    const allowed = guard.split(/\s+/).filter(Boolean);
    requireRole(allowed);
  };

  window.RP03Auth = Object.freeze({
    ROLES,
    readSession,
    currentRole,
    roleLabel,
    createDemoSession,
    loginWithCredentials,
    requireRole,
    logout,
    safeReturnPath
  });

  initGuard();
  bindLogoutControls();
  initLoginPage();
  initUnauthorizedPage();
})();
