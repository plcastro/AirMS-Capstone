(() => {
  const TOKEN_KEY = "airms_flask_token";
  const REFRESH_TOKEN_KEY = "airms_flask_refresh_token";
  const USER_KEY = "airms_flask_user";
  const REMEMBER_ME_KEY = "airms_flask_remember_me";
  const SESSION_META_KEY = "airms_flask_session_meta";
  const AUTH_SYNC_KEY = "airms_flask_auth_sync";
  const OTP_CONTEXT_KEY = "airms_flask_otp_context";
  const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;
  const WARNING_DURATION_MS = 15 * 1000;
  const AUTH_PATHS = [
    "/web/login",
    "/web/forgot",
    "/web/verification",
    "/web/reset-password",
    "/web/security-setup",
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  const getToken = () =>
    sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || "";
  const getRefreshToken = () =>
    sessionStorage.getItem(REFRESH_TOKEN_KEY) ||
    localStorage.getItem(REFRESH_TOKEN_KEY) ||
    "";
  const getUser = () => {
    try {
      return JSON.parse(
        localStorage.getItem(USER_KEY) ||
          sessionStorage.getItem(USER_KEY) ||
          "null",
      );
    } catch {
      return null;
    }
  };

  const saveStoredUser = (user) => {
    if (!user) return;
    const remember = localStorage.getItem(REMEMBER_ME_KEY) === "true";
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(USER_KEY, JSON.stringify(user));
    (remember ? sessionStorage : localStorage).removeItem(USER_KEY);
  };

  const getSessionMeta = () => {
    try {
      return JSON.parse(
        localStorage.getItem(SESSION_META_KEY) ||
          sessionStorage.getItem(SESSION_META_KEY) ||
          "{}",
      );
    } catch {
      return {};
    }
  };

  const normalizeRole = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();
  const getUserRole = (user = getUser()) =>
    normalizeRole(user?.jobTitle || user?.access || user?.role);

  const tokenPayload = (token) => {
    try {
      return JSON.parse(atob(String(token).split(".")[1] || ""));
    } catch {
      return null;
    }
  };

  const tokenExpiresAt = (token) => {
    const payload = tokenPayload(token);
    return payload?.exp ? payload.exp * 1000 : null;
  };

  const isTokenValid = (token) => {
    const expiry = tokenExpiresAt(token);
    return Boolean(expiry && expiry > Date.now());
  };

  const publishAuthSync = (type, payload = {}) => {
    try {
      localStorage.setItem(
        AUTH_SYNC_KEY,
        JSON.stringify({ type, at: Date.now(), ...payload }),
      );
    } catch {
      // no-op
    }
  };

  const homePathFor = (user) => {
    switch (getUserRole(user)) {
      case "superadmin":
        return "/web/dashboard/user-management/view-users";
      case "mechanic":
        return "/web/dashboard/maintenance-log";
      case "maintenance manager":
      case "officer-in-charge":
        return "/web/dashboard/maintenance-dashboard";
      case "warehouse department":
        return "/web/dashboard/parts-requisition";
      default:
        return "/web/dashboard/profile";
    }
  };

  const storeSession = (data, remember) => {
    const storage = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    const token = data.token || data.accessToken;
    const refreshToken = data.refreshToken || "";
    const user = data.user || null;
    const meta = {
      base: user?.base || data.base || "UNKNOWN",
      sessionId: data.sessionId || user?.sessionId || null,
      platform: "WEB",
    };
    if (token) storage.setItem(TOKEN_KEY, token);
    if (refreshToken) storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (user) storage.setItem(USER_KEY, JSON.stringify(user));
    storage.setItem(REMEMBER_ME_KEY, remember ? "true" : "false");
    storage.setItem(SESSION_META_KEY, JSON.stringify(meta));
    other.removeItem(TOKEN_KEY);
    other.removeItem(REFRESH_TOKEN_KEY);
    other.removeItem(USER_KEY);
    other.removeItem(SESSION_META_KEY);
    publishAuthSync("LOGIN", { user, remember });
  };

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_META_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(SESSION_META_KEY);
    localStorage.setItem(REMEMBER_ME_KEY, "false");
  };

  const logout = async (broadcast = true) => {
    const token = getToken();
    try {
      if (token) {
        await fetch("/api/user/logout", { method: "POST", headers: headers() });
      }
    } catch {
      // no-op
    }
    clearSession();
    if (broadcast) publishAuthSync("LOGOUT");
    window.location.href = "/web/login";
  };

  const headers = (extra = {}) => {
    const token = getToken();
    const meta = getSessionMeta();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(meta.base ? { "x-base": meta.base } : {}),
      ...(meta.sessionId ? { "x-session-id": meta.sessionId } : {}),
      "x-platform": meta.platform || "WEB",
      ...extra,
    };
  };

  const refreshAccessToken = async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token available");
    const response = await fetch("/api/user/refresh-token", {
      method: "POST",
      headers: {
        ...headers(),
        Authorization: `Bearer ${refreshToken}`,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.token)
      throw new Error(data.message || "Failed to refresh token");
    const remember = localStorage.getItem(REMEMBER_ME_KEY) === "true";
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, data.token);
    publishAuthSync("TOKEN_REFRESH");
    return data.token;
  };

  const ensureFreshToken = async () => {
    const token = getToken();
    if (token && isTokenValid(token)) return token;
    return refreshAccessToken();
  };

  const apiFetch = async (url, options = {}) => {
    if (getToken()) {
      try {
        await ensureFreshToken();
      } catch {
        // Let the request surface the actual auth error.
      }
    }
    const response = await fetch(url, {
      ...options,
      headers: headers(options.headers || {}),
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (
      (response.status === 401 || response.status === 403) &&
      getRefreshToken() &&
      !options._retried
    ) {
      try {
        await refreshAccessToken();
        return apiFetch(url, { ...options, _retried: true });
      } catch {
        clearSession();
      }
    }
    if (!response.ok) {
      const message =
        data?.message ||
        data?.detail ||
        response.statusText ||
        "Request failed";
      throw new Error(message);
    }
    return data;
  };

  const verifyCurrentUserPin = async (pin) => {
    const cleanPin = String(pin || "").trim();
    if (!/^\d{6}$/.test(cleanPin))
      throw new Error("Enter your 6-digit PIN to confirm.");
    const user = getUser();
    const userId = user?.id || user?._id;
    if (!userId)
      throw new Error("Your user ID is missing. Please sign in again.");
    await apiFetch(`/api/user/verify-pin/${encodeURIComponent(userId)}`, {
      method: "POST",
      body: JSON.stringify({ pin: cleanPin }),
    });
  };

  const readPageConfig = () => {
    const node = $("#page-config");
    if (!node) return null;
    try {
      return JSON.parse(node.textContent || "{}");
    } catch {
      return null;
    }
  };

  const getId = (row) => row?._id || row?.id || row?.userId || "";
  const labelize = (key) =>
    String(key || "")
      .replace(/([A-Z])/g, " $1")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const normalizeRows = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.results)) return payload.results;
    if (payload && typeof payload === "object") {
      return Object.entries(payload).map(([metric, value]) => ({
        metric,
        value,
      }));
    }
    return [];
  };

  const valueAt = (row, key) => {
    const value = row?.[key];
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const renderStatus = (value) => {
    const text = String(value || "-");
    const className = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return `<span class="status-pill ${className}">${escapeHtml(text)}</span>`;
  };

  const escapeHtml = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );

  const fillTemplate = (template, row) =>
    String(template || "").replace("{id}", encodeURIComponent(getId(row)));

  let inactivityWarningTimer = null;
  let inactivityLogoutTimer = null;
  let warningCountdownTimer = null;

  const isDashboardPath = () =>
    window.location.pathname.startsWith("/web/dashboard");
  const isAuthPath = () => AUTH_PATHS.includes(window.location.pathname);

  const protectCurrentRoute = () => {
    if (!isDashboardPath()) return true;
    const token = getToken();
    const user = getUser();
    if (!token || !user) {
      window.location.href = "/web/login";
      return false;
    }
    const config = readPageConfig() || {};
    const allowed = (config.allowedRoles || []).map(normalizeRole);
    const role = getUserRole(user);
    if (allowed.length && !allowed.includes(role)) {
      window.location.href = "/web/dashboard/profile";
      return false;
    }
    return true;
  };

  const hydrateAuthPage = () => {
    if (!isAuthPath()) return;
    const token = getToken();
    const user = getUser();
    if (
      token &&
      user &&
      isTokenValid(token) &&
      window.location.pathname === "/web/login"
    ) {
      window.location.href = homePathFor(user);
    }
  };

  const clearInactivityTimers = () => {
    clearTimeout(inactivityWarningTimer);
    clearTimeout(inactivityLogoutTimer);
    clearInterval(warningCountdownTimer);
    inactivityWarningTimer = null;
    inactivityLogoutTimer = null;
    warningCountdownTimer = null;
  };

  const closeSessionWarning = () => {
    const dialog = $("[data-session-warning]");
    if (dialog?.open) dialog.close();
  };

  const showSessionWarning = () => {
    const dialog = $("[data-session-warning]");
    const secondsRoot = $("[data-warning-seconds]");
    if (!dialog) return;
    let remaining = Math.ceil(WARNING_DURATION_MS / 1000);
    if (secondsRoot) secondsRoot.textContent = String(remaining);
    if (!dialog.open) dialog.showModal();
    clearInterval(warningCountdownTimer);
    warningCountdownTimer = setInterval(() => {
      remaining -= 1;
      if (secondsRoot) secondsRoot.textContent = String(Math.max(remaining, 0));
      if (remaining <= 0) clearInterval(warningCountdownTimer);
    }, 1000);
  };

  const scheduleInactivityTimers = () => {
    if (!isDashboardPath() || !getUser()) return;
    clearInactivityTimers();
    closeSessionWarning();
    inactivityWarningTimer = setTimeout(
      showSessionWarning,
      Math.max(0, INACTIVITY_LIMIT_MS - WARNING_DURATION_MS),
    );
    inactivityLogoutTimer = setTimeout(() => logout(), INACTIVITY_LIMIT_MS);
  };

  const initSessionGuards = () => {
    hydrateAuthPage();
    if (!protectCurrentRoute()) return;

    window.addEventListener("storage", (event) => {
      if (event.key !== AUTH_SYNC_KEY || !event.newValue) return;
      try {
        const payload = JSON.parse(event.newValue);
        if (payload.type === "LOGOUT" && isDashboardPath()) {
          clearSession();
          window.location.href = "/web/login";
        }
      } catch {
        // no-op
      }
    });

    if (!isDashboardPath()) return;
    const activityEvents = [
      "click",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
    ];
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, scheduleInactivityTimers, {
        passive: true,
      }),
    );
    $("[data-continue-session]")?.addEventListener("click", () => {
      closeSessionWarning();
      scheduleInactivityTimers();
    });
    scheduleInactivityTimers();
  };

  const auditCategories = [
    {
      value: "auth",
      label: "Authentication",
      color: "#722ed1",
      keywords: [
        "login",
        "log in",
        "logged in",
        "logout",
        "log out",
        "logged out",
        "signed in",
        "signed out",
        "session refreshed",
        "activated",
        "security setup",
        "otp",
        "password reset",
        "pin reset",
        "pin verified",
      ],
    },
    {
      value: "user",
      label: "User Management",
      color: "#1677ff",
      keywords: [
        "user",
        "profile",
        "password changed",
        "pin updated",
        "signature",
        "image",
        "invitation",
        "activation email",
        "mobile push device",
      ],
    },
    {
      value: "flight",
      label: "Flight Logs",
      color: "#13c2c2",
      keywords: ["flight log", "flightlogs"],
    },
    {
      value: "inspection",
      label: "Inspections",
      color: "#52c41a",
      keywords: [
        "inspection",
        "pre-inspection",
        "post-inspection",
        "pre-flight",
        "post-flight",
      ],
    },
    {
      value: "maintenance",
      label: "Maintenance",
      color: "#faad14",
      keywords: [
        "maintenance",
        "technical log",
        "defect log",
        "approval",
        "ai manual rules",
        "rectification",
      ],
    },
    { value: "task", label: "Tasks", color: "#eb2f96", keywords: ["task"] },
    {
      value: "parts",
      label: "Parts",
      color: "#fa8c16",
      keywords: ["parts", "requisition", "aircraft totals", "priority rules"],
    },
    {
      value: "communication",
      label: "Communication",
      color: "#2f54eb",
      keywords: ["message", "group chat", "notification"],
    },
    {
      value: "security",
      label: "Security",
      color: "#f5222d",
      keywords: ["security alert", "audit logs", "superadmin activity"],
    },
    {
      value: "export",
      label: "Exports",
      color: "#595959",
      keywords: ["exported", "export"],
    },
    {
      value: "create",
      label: "Create",
      color: "#389e0d",
      keywords: ["created", "added", "inserted", "new"],
    },
    {
      value: "update",
      label: "Update",
      color: "#0958d9",
      keywords: ["updated", "modified", "changed", "edited", "saved"],
    },
    {
      value: "delete",
      label: "Delete",
      color: "#cf1322",
      keywords: ["deleted", "removed", "destroyed", "erased", "revoked"],
    },
    { value: "other", label: "Other", color: "#8c8c8c", keywords: [] },
  ];

  const auditCategoryFor = (text = "") => {
    const value = String(text || "").toLowerCase();
    return (
      auditCategories.find((category) =>
        category.keywords.some((keyword) => value.includes(keyword)),
      )?.value || "other"
    );
  };

  const toDateInputValue = (date) => date.toISOString().slice(0, 10);

  const displayDateTime = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const initActivityLogs = () => {
    const root = $("[data-activity-logs]");
    if (!root) return;

    const config = readPageConfig() || {};
    const search = $("[data-log-search]", root);
    const start = $("[data-log-start]", root);
    const end = $("[data-log-end]", root);
    const actionType = $("[data-log-action-type]", root);
    const scope = $("[data-log-scope]", root);
    const scopeValue = $("[data-log-scope-value]", root);
    const scopeValueWrap = $("[data-log-scope-value-wrap]", root);
    const rowsRoot = $("[data-log-rows]", root);
    const chartRoot = $("[data-log-chart]", root);
    const countRoot = $("[data-log-count]", root);
    const summary = $("[data-log-page-summary]", root);
    const pageSizeInput = $("[data-log-page-size]", root);
    const prev = $("[data-log-prev]", root);
    const next = $("[data-log-next]", root);
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    let allRows = [];
    let currentPage = 1;
    let pageSize = Number(pageSizeInput?.value || 10);

    start.value = toDateInputValue(thirtyDaysAgo);
    end.value = toDateInputValue(now);
    actionType.innerHTML = `<option value="all">All Actions</option>${auditCategories.map((category) => `<option value="${category.value}">${escapeHtml(category.label)}</option>`).join("")}`;

    const currentRangeParams = () => {
      const params = new URLSearchParams({ page: "1", limit: "1000" });
      if (start.value)
        params.set(
          "startDate",
          new Date(`${start.value}T00:00:00`).toISOString(),
        );
      if (end.value)
        params.set("endDate", new Date(`${end.value}T23:59:59`).toISOString());
      return params;
    };

    const filteredRows = () => {
      const query = String(search.value || "")
        .toLowerCase()
        .trim();
      return allRows.filter((row) => {
        const matchesSearch =
          !query ||
          [row.actionMade, row.dateTime, row.username].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(query),
          );
        const matchesAction =
          actionType.value === "all" ||
          auditCategoryFor(row.actionMade) === actionType.value;
        const scopeText = scope.value === "base" ? row.base : row.platform;
        const matchesScope =
          scope.value === "all" ||
          scopeValue.value === "all" ||
          String(scopeText || "UNKNOWN").toUpperCase() === scopeValue.value;
        return matchesSearch && matchesAction && matchesScope;
      });
    };

    const refreshScopeValues = () => {
      if (scope.value === "all") {
        scopeValueWrap.hidden = true;
        scopeValue.innerHTML = `<option value="all">All Scope</option>`;
        return;
      }
      const key = scope.value === "base" ? "base" : "platform";
      const values = Array.from(
        new Set(
          allRows.map((row) => String(row[key] || "UNKNOWN").toUpperCase()),
        ),
      ).sort();
      scopeValueWrap.hidden = false;
      scopeValue.innerHTML = `<option value="all">All ${labelize(key)}</option>${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
    };

    const renderChart = (rows) => {
      const width = 920;
      const height = 250;
      const pad = 32;
      const days = {};
      rows.forEach((row) => {
        const date = new Date(row.dateTime);
        if (Number.isNaN(date.getTime())) return;
        const key = date.toISOString().slice(0, 10);
        days[key] ||= Object.fromEntries(
          auditCategories.map((category) => [category.value, 0]),
        );
        days[key][auditCategoryFor(row.actionMade)] += 1;
      });
      const endDate = end.value
        ? new Date(`${end.value}T00:00:00`)
        : new Date();
      const startDate = start.value
        ? new Date(`${start.value}T00:00:00`)
        : new Date(endDate);
      if (!start.value) startDate.setDate(endDate.getDate() - 29);
      const keys = [];
      for (
        let cursor = new Date(startDate);
        cursor <= endDate;
        cursor.setDate(cursor.getDate() + 1)
      ) {
        keys.push(cursor.toISOString().slice(0, 10));
      }
      const visibleCategories = auditCategories.filter(
        (category) =>
          actionType.value === "all" || actionType.value === category.value,
      );
      const max = Math.max(
        1,
        ...keys.flatMap((key) =>
          visibleCategories.map((category) => days[key]?.[category.value] || 0),
        ),
      );
      const xFor = (index) =>
        pad + (index * (width - pad * 2)) / Math.max(keys.length - 1, 1);
      const yFor = (value) => height - pad - (value * (height - pad * 2)) / max;
      const lines = visibleCategories
        .map((category) => {
          const points = keys
            .map(
              (key, index) =>
                `${xFor(index).toFixed(1)},${yFor(days[key]?.[category.value] || 0).toFixed(1)}`,
            )
            .join(" ");
          return `<polyline fill="none" stroke="${category.color}" stroke-width="2" points="${points}"><title>${escapeHtml(category.label)}</title></polyline>`;
        })
        .join("");
      const legend = visibleCategories
        .map(
          (category) =>
            `<span><i style="background:${category.color}"></i>${escapeHtml(category.label)}</span>`,
        )
        .join("");
      chartRoot.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Activity trend chart"><line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#dbe2ea"/><line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" stroke="#dbe2ea"/>${lines}</svg><div class="chart-legend">${legend}</div>`;
    };

    const renderTable = () => {
      const rows = filteredRows();
      const totalPages = Math.max(Math.ceil(rows.length / pageSize), 1);
      currentPage = Math.min(currentPage, totalPages);
      const startIndex = (currentPage - 1) * pageSize;
      const visible = rows.slice(startIndex, startIndex + pageSize);
      countRoot.textContent = `${rows.length} visible of ${allRows.length} loaded`;
      summary.textContent = rows.length
        ? `${startIndex + 1}-${Math.min(startIndex + pageSize, rows.length)} of ${rows.length}`
        : "0 of 0";
      prev.disabled = currentPage <= 1;
      next.disabled = currentPage >= totalPages;
      if (!visible.length) {
        rowsRoot.innerHTML = `<tr><td colspan="6" class="muted">No logs match the current filters.</td></tr>`;
      } else {
        rowsRoot.innerHTML = visible
          .map(
            (row, index) => `
          <tr>
            <td>${startIndex + index + 1}</td>
            <td>${escapeHtml(row.actionMade || "N/A")}</td>
            <td><strong class="link-text">${escapeHtml(row.username || "Unknown")}</strong></td>
            <td>${renderStatus(row.platform || "UNKNOWN")}</td>
            <td>${renderStatus(row.base || "UNKNOWN")}</td>
            <td>${escapeHtml(displayDateTime(row.dateTime))}</td>
          </tr>
        `,
          )
          .join("");
      }
      renderChart(rows);
    };

    const load = async (silent = false) => {
      if (!silent)
        rowsRoot.innerHTML = `<tr><td colspan="6" class="muted">Loading logs...</td></tr>`;
      try {
        const payload = await apiFetch(
          `${config.list || "/api/logs/getAllUserLogs"}?${currentRangeParams().toString()}`,
        );
        allRows = normalizeRows(payload).map((row, index) => ({
          ...row,
          index: index + 1,
          actionMade: row.actionMade || row.action || "N/A",
          username: row.username || "Unknown",
          platform: row.platform || "UNKNOWN",
          base: row.base || "UNKNOWN",
        }));
        refreshScopeValues();
        currentPage = 1;
        renderTable();
      } catch (error) {
        rowsRoot.innerHTML = `<tr><td colspan="6" class="muted">${escapeHtml(error.message)}</td></tr>`;
      }
    };

    [search, actionType, scopeValue].forEach((input) =>
      input?.addEventListener("input", () => {
        currentPage = 1;
        renderTable();
      }),
    );
    [start, end].forEach((input) =>
      input?.addEventListener("change", () => load()),
    );
    scope.addEventListener("change", () => {
      scopeValue.value = "all";
      refreshScopeValues();
      currentPage = 1;
      renderTable();
    });
    pageSizeInput.addEventListener("change", () => {
      pageSize = Number(pageSizeInput.value || 10);
      currentPage = 1;
      renderTable();
    });
    prev.addEventListener("click", () => {
      currentPage = Math.max(currentPage - 1, 1);
      renderTable();
    });
    next.addEventListener("click", () => {
      currentPage += 1;
      renderTable();
    });
    $("[data-log-refresh]", root)?.addEventListener("click", () => load());
    $("[data-log-clear]", root)?.addEventListener("click", () => {
      search.value = "";
      actionType.value = "all";
      scope.value = "all";
      scopeValue.value = "all";
      start.value = "";
      end.value = "";
      refreshScopeValues();
      load();
    });

    if (window.EventSource) {
      const stream = new EventSource("/api/events/stream");
      stream.addEventListener("airms:data-changed", () => load(true));
      stream.addEventListener("data-changed", () => load(true));
    }

    load();
  };

  const initLayout = () => {
    const user = getUser();
    const pill = $("#current-user-pill");
    const avatar = $("[data-user-avatar]");
    if (pill && user) {
      const name =
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.username ||
        "AirMS User";
      pill.innerHTML = `<strong>${escapeHtml(name.toUpperCase())}</strong><span>${escapeHtml(String(user.jobTitle || user.access || "web").toUpperCase())}</span>`;
    }
    if (avatar && user) {
      const initials =
        `${String(user.firstName || "").charAt(0)}${String(user.lastName || "").charAt(0)}`.toUpperCase() ||
        "U";
      if (user.image) {
        avatar.innerHTML = `<img src="${escapeHtml(user.image.startsWith("http") ? user.image : user.image)}" alt="">`;
      } else {
        avatar.textContent = initials;
      }
    }
    $$("[data-logout]").forEach((button) =>
      button.addEventListener("click", logout),
    );
    $("[data-profile-link]")?.addEventListener("click", () => {
      window.location.href = "/web/dashboard/profile";
    });
    $("[data-sidebar-toggle]")?.addEventListener("click", () => {
      document.body.classList.toggle("sidebar-open");
    });
    $$(".nav-link").forEach((link) => {
      link.addEventListener("click", () =>
        document.body.classList.remove("sidebar-open"),
      );
    });
  };

  const initNotifications = () => {
    const openButton = $("[data-notifications-open]");
    const dialog = $("[data-notifications-dialog]");
    const closeButton = $("[data-notifications-close]");
    const list = $("[data-notifications-list]");
    const count = $("[data-notification-count]");
    if (!openButton || !dialog || !list) return;

    const renderNotifications = (items) => {
      const unread = items.filter((item) => !item.read).length;
      if (count) {
        count.hidden = unread <= 0;
        count.textContent = String(unread);
      }
      if (!items.length) {
        list.innerHTML = `<p class="muted">No notifications yet.</p>`;
        return;
      }
      list.innerHTML = "";
      items.forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `list-item ${item.read ? "" : "unread"}`;
        button.innerHTML = `<strong>${escapeHtml(item.title || "Notification")}</strong><br><span class="muted">${escapeHtml(item.description || item.message || "")}</span>`;
        button.addEventListener("click", async () => {
          if (!item._id && !item.id) return;
          try {
            await apiFetch(
              `/api/notifications/${encodeURIComponent(item._id || item.id)}/read`,
              { method: "POST", body: JSON.stringify({}) },
            );
            await loadNotifications();
          } catch {
            // no-op
          }
        });
        list.appendChild(button);
      });
    };

    const loadNotifications = async () => {
      try {
        renderNotifications(
          normalizeRows(await apiFetch("/api/notifications")),
        );
      } catch (error) {
        list.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
      }
    };

    openButton.addEventListener("click", async () => {
      if (!dialog.open) dialog.showModal();
      await loadNotifications();
    });
    closeButton?.addEventListener("click", () => dialog.close());
    $("[data-mark-all-notifications]")?.addEventListener("click", async () => {
      try {
        await apiFetch("/api/notifications/mark-all-read", {
          method: "POST",
          body: JSON.stringify({}),
        });
        await loadNotifications();
      } catch (error) {
        list.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
      }
    });
    if (window.EventSource && isDashboardPath()) {
      const stream = new EventSource("/api/events/stream");
      stream.addEventListener("airms:data-changed", loadNotifications);
      stream.addEventListener("data-changed", loadNotifications);
    }
    loadNotifications();
  };

  const initLogin = () => {
    const form = $("[data-login-form]");
    if (!form) return;
    const result = $("[data-login-result]");
    const savedIdentifier =
      localStorage.getItem("airms_flask_remembered_identifier") || "";
    const savedRemember = localStorage.getItem(REMEMBER_ME_KEY) === "true";
    if (savedIdentifier && form.identifier)
      form.identifier.value = savedIdentifier;
    if (form.rememberMe) form.rememberMe.checked = savedRemember;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(form).entries());
      body.rememberMe = Boolean(
        form.querySelector("[name='rememberMe']")?.checked,
      );
      body.client = "web";
      body.trustedDeviceToken =
        localStorage.getItem("airms_flask_trusted_device") || "";
      try {
        const data = await apiFetch(form.action, {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "x-base": body.base || "" },
        });
        if (data.requireSetup && data.user?.email) {
          window.location.href = `/web/security-setup?email=${encodeURIComponent(data.user.email)}&setupToken=${encodeURIComponent(data.user.setupToken || "")}`;
          return;
        }
        if (data.requireLoginOtp && data.verification?.token) {
          sessionStorage.setItem(
            OTP_CONTEXT_KEY,
            JSON.stringify({
              mode: "login-2fa",
              token: data.verification.token,
              email: data.verification.email,
              maskedEmail: data.verification.maskedEmail,
              rememberMe: body.rememberMe,
              base: body.base,
            }),
          );
          window.location.href = "/web/verification";
          return;
        }
        storeSession(data, body.rememberMe);
        if (body.rememberMe) {
          localStorage.setItem(
            "airms_flask_remembered_identifier",
            body.identifier || "",
          );
        } else {
          localStorage.removeItem("airms_flask_remembered_identifier");
        }
        if (result) result.textContent = "Login successful. Redirecting...";
        window.location.href = homePathFor(data.user);
      } catch (error) {
        if (result) result.textContent = error.message;
      }
    });
  };

  const initOtpForm = () => {
    const form = $("[data-otp-form]");
    if (!form) return;
    const result = form.querySelector("[data-form-result]");
    const params = new URLSearchParams(window.location.search);
    let context = {};
    try {
      context = JSON.parse(sessionStorage.getItem(OTP_CONTEXT_KEY) || "{}");
    } catch {
      context = {};
    }
    context = {
      mode: params.get("mode") || context.mode || "password-reset",
      token:
        params.get("token") || context.token || params.get("setupToken") || "",
      email: params.get("email") || context.email || "",
      rememberMe: context.rememberMe || params.get("rememberMe") === "true",
      base: params.get("base") || context.base || "",
    };
    form.querySelector("[data-otp-mode]").value = context.mode;
    form.querySelector("[data-otp-token]").value = context.token;
    form.querySelector("[data-otp-remember]").value = context.rememberMe
      ? "true"
      : "false";
    form.querySelector("[data-otp-base]").value = context.base;
    const emailInput = form.querySelector("[data-otp-email]");
    if (emailInput && context.email) emailInput.value = context.email;
    const trustRow = $("[data-trust-device-row]");
    if (trustRow) trustRow.hidden = context.mode !== "login-2fa";

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(form).entries());
      const isLoginOtp = body.mode === "login-2fa";
      try {
        const data = await apiFetch(
          isLoginOtp ? "/api/user/login/verify-otp" : "/api/user/verify-otp",
          {
            method: "POST",
            body: JSON.stringify({
              ...body,
              rememberMe: body.rememberMe === "true",
              trustDevice: Boolean(
                form.querySelector("[name='trustDevice']")?.checked,
              ),
              client: "web",
            }),
          },
        );
        if (isLoginOtp) {
          if (data.trustedDeviceToken)
            localStorage.setItem(
              "airms_flask_trusted_device",
              data.trustedDeviceToken,
            );
          storeSession(data, body.rememberMe === "true");
          sessionStorage.removeItem(OTP_CONTEXT_KEY);
          window.location.href = homePathFor(data.user);
          return;
        }
        if (result)
          result.textContent = data?.message || "Verification successful";
      } catch (error) {
        if (result) result.textContent = error.message;
      }
    });

    $("[data-resend-otp]")?.addEventListener("click", async () => {
      const body = Object.fromEntries(new FormData(form).entries());
      const isLoginOtp = body.mode === "login-2fa";
      try {
        const data = await apiFetch(
          isLoginOtp
            ? "/api/user/login/resend-otp"
            : "/api/user/request-password-reset",
          {
            method: "POST",
            body: JSON.stringify(
              isLoginOtp ? { token: body.token } : { email: body.email },
            ),
          },
        );
        if (result) result.textContent = data?.message || "Code resent";
      } catch (error) {
        if (result) result.textContent = error.message;
      }
    });
  };

  const initApiForms = () => {
    $$("[data-api-form]").forEach((form) => {
      const result =
        form.querySelector("[data-form-result]") ||
        $(`[data-form-result="${form.dataset.result || ""}"]`);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const body = Object.fromEntries(new FormData(form).entries());
        try {
          const data = await apiFetch(form.action, {
            method: form.method || "POST",
            body: JSON.stringify(body),
          });
          if (result)
            result.textContent = data?.message || JSON.stringify(data, null, 2);
        } catch (error) {
          if (result) result.textContent = error.message;
        }
      });
    });
  };

  const buildInput = (field, value = "") => {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const label = document.createElement("label");
    label.textContent = field.label || labelize(field.name);
    label.setAttribute("for", `field-${field.name}`);
    let input;
    if (field.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 3;
    } else if (field.type === "select") {
      input = document.createElement("select");
      (field.options || []).forEach((option) => {
        const node = document.createElement("option");
        node.value = option;
        node.textContent = labelize(option);
        input.appendChild(node);
      });
    } else {
      input = document.createElement("input");
      input.type = field.type || "text";
    }
    input.id = `field-${field.name}`;
    input.name = field.name;
    input.value = value ?? "";
    input.required = Boolean(field.required);
    wrap.append(label, input);
    return wrap;
  };

  const initCrudPage = () => {
    const config = readPageConfig();
    const table = $("[data-crud-table]");
    if (!config || !table || !config.list) return;

    const tbody = $("tbody", table);
    const thead = $("thead", table);
    const search = $("[data-page-search]");
    const dialog = $("[data-record-dialog]");
    const form = $("[data-record-form]");
    const fieldsRoot = $("[data-form-fields]");
    const formStatus = $("[data-form-status]");
    const dashboardCards = $("[data-dashboard-cards]");
    let rows = [];
    let editingRow = null;

    const columns = config.columns || [];

    const renderDashboard = () => {
      if (!dashboardCards) return;
      dashboardCards.innerHTML = "";
      rows.slice(0, 8).forEach((row) => {
        const card = document.createElement("article");
        card.className = "card";
        card.innerHTML = `<div class="muted">${escapeHtml(labelize(row.metric))}</div><div class="kpi">${escapeHtml(row.value)}</div>`;
        dashboardCards.appendChild(card);
      });
    };

    const renderTable = () => {
      thead.innerHTML = `<tr>${columns.map((col) => `<th>${escapeHtml(labelize(col))}</th>`).join("")}<th>Actions</th></tr>`;
      const query = String(search?.value || "").toLowerCase();
      const filtered = rows.filter((row) =>
        JSON.stringify(row).toLowerCase().includes(query),
      );
      if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="${columns.length + 1}" class="muted">No records found.</td></tr>`;
        return;
      }
      tbody.innerHTML = "";
      filtered.forEach((row) => {
        const tr = document.createElement("tr");
        columns.forEach((col) => {
          const td = document.createElement("td");
          const value = valueAt(row, col);
          td.innerHTML =
            col.toLowerCase().includes("status") ||
            col.toLowerCase().includes("priority")
              ? renderStatus(value)
              : escapeHtml(value);
          tr.appendChild(td);
        });
        const actions = document.createElement("td");
        actions.className = "row-actions";
        if (!config.readonly && config.update && getId(row)) {
          const edit = document.createElement("button");
          edit.type = "button";
          edit.className = "btn ghost small";
          edit.textContent = "Edit";
          edit.addEventListener("click", () => openForm(row));
          actions.appendChild(edit);
        }
        (config.actions || []).forEach((action) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn ghost small";
          btn.textContent = action.label;
          btn.addEventListener("click", () => runAction(action, row));
          actions.appendChild(btn);
        });
        if (config.status && getId(row)) {
          ["active", "inactive", "deactivated"].forEach((status) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className =
              status === "deactivated" ? "btn danger small" : "btn ghost small";
            btn.textContent = labelize(status);
            btn.addEventListener("click", () => updateStatus(row, status));
            actions.appendChild(btn);
          });
        }
        if (!config.readonly && config.delete && getId(row)) {
          const del = document.createElement("button");
          del.type = "button";
          del.className = "btn danger small";
          del.textContent = "Delete";
          del.addEventListener("click", () => deleteRow(row));
          actions.appendChild(del);
        }
        if (!actions.children.length) actions.textContent = "-";
        tr.appendChild(actions);
        tbody.appendChild(tr);
      });
    };

    const load = async () => {
      tbody.innerHTML = `<tr><td colspan="${columns.length + 1}" class="muted">Loading records...</td></tr>`;
      try {
        rows = normalizeRows(await apiFetch(config.list));
        renderDashboard();
        renderTable();
      } catch (error) {
        tbody.innerHTML = `<tr><td colspan="${columns.length + 1}" class="muted">${escapeHtml(error.message)}</td></tr>`;
      }
    };

    const openForm = (row = null) => {
      if (!dialog || !fieldsRoot) return;
      editingRow = row;
      $("[data-dialog-title]").textContent = row ? "Edit Record" : "New Record";
      fieldsRoot.innerHTML = "";
      (config.fields || []).forEach((field) =>
        fieldsRoot.appendChild(buildInput(field, row?.[field.name] || "")),
      );
      if (formStatus) formStatus.textContent = "";
      dialog.showModal();
    };

    const collectPayload = () => {
      const payload = Object.fromEntries(new FormData(form).entries());
      Object.keys(payload).forEach((key) => {
        if (payload[key] === "") delete payload[key];
      });
      return payload;
    };

    const save = async (event) => {
      event.preventDefault();
      const isEditing = Boolean(editingRow && getId(editingRow));
      const url = isEditing
        ? fillTemplate(config.update, editingRow)
        : config.create;
      const method = isEditing ? "PUT" : "POST";
      try {
        await apiFetch(url, { method, body: JSON.stringify(collectPayload()) });
        dialog.close();
        await load();
      } catch (error) {
        if (formStatus) formStatus.textContent = error.message;
      }
    };

    const runAction = async (action, row) => {
      try {
        await apiFetch(fillTemplate(action.url, row), {
          method: action.method || "POST",
          body: JSON.stringify({}),
        });
        await load();
      } catch (error) {
        alert(error.message);
      }
    };

    const updateStatus = async (row, status) => {
      try {
        await apiFetch(fillTemplate(config.status, row), {
          method: "PUT",
          body: JSON.stringify({ status }),
        });
        await load();
      } catch (error) {
        alert(error.message);
      }
    };

    const deleteRow = async (row) => {
      if (!confirm("Delete this record?")) return;
      try {
        await apiFetch(fillTemplate(config.delete, row), { method: "DELETE" });
        await load();
      } catch (error) {
        alert(error.message);
      }
    };

    $("[data-open-create]")?.addEventListener("click", () => openForm());
    $("[data-refresh]")?.addEventListener("click", load);
    search?.addEventListener("input", renderTable);
    form?.addEventListener("submit", save);
    $$("[data-close-dialog]").forEach((button) =>
      button.addEventListener("click", () => dialog?.close()),
    );
    load();
  };

  const initUserManagement = () => {
    const page = $("[data-users-page]");
    if (!page) return;
    const statsRoot = $("[data-user-stats]");
    const tableBody = $("[data-users-table]");
    const search = $("[data-user-search]");
    const filters = $$("[data-user-filter]");
    const dialog = $("[data-user-dialog]");
    const previewDialog = $("[data-user-preview-dialog]");
    const form = $("[data-user-form]");
    const formStatus = $("[data-user-form-status]");
    const previewStatus = $("[data-user-preview-status]");
    const previewBody = $("[data-user-preview-body]");
    const avatarPreview = $("[data-user-avatar-preview]");
    const imageInput = $("[data-user-image]");
    const licenseField = $("[data-license-field]");
    const roleMap = {
      superadmin: "Superadmin",
      pilot: "User",
      "maintenance manager": "Superuser",
      "officer-in-charge": "Superuser",
      mechanic: "User",
      "warehouse department": "User",
    };
    const licenseRoles = new Set([
      "maintenance manager",
      "pilot",
      "mechanic",
      "officer-in-charge",
    ]);
    let users = [];
    let editingUser = null;

    const imageUrl = (path) => {
      if (!path) return "";
      return String(path).startsWith("http") ? path : path;
    };
    const formatDate = (value) =>
      value ? new Date(value).toLocaleString("en-PH") : "N/A";
    const fullname = (user) =>
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.name ||
      "-";
    const maskEmail = (email) => {
      const [local, domain] = String(email || "").split("@");
      if (!local || !domain) return email || "-";
      return `${local.slice(0, 1)}${"*".repeat(Math.max(local.length - 2, 1))}${local.slice(-1)}@${domain}`;
    };
    const inviteStatus = (user) => {
      if (String(user.status || "").toLowerCase() === "active")
        return "claimed";
      const status = String(user.invitationStatus || "").toLowerCase();
      if (
        status === "pending" &&
        user.invitationExpiresAt &&
        new Date(user.invitationExpiresAt).getTime() < Date.now()
      )
        return "expired";
      return status || "N/A";
    };
    const visibleUsers = () => {
      const query = String(search?.value || "")
        .trim()
        .toLowerCase();
      return users.filter((user) => {
        const haystack = [
          fullname(user),
          user.username,
          user.email,
          user.jobTitle,
          user.access,
          user.status,
          inviteStatus(user),
        ]
          .join(" ")
          .toLowerCase();
        if (query && !haystack.includes(query)) return false;
        return filters.every((filter) => {
          const value = String(filter.value || "").toLowerCase();
          if (!value) return true;
          const key = filter.dataset.userFilter;
          const actual =
            key === "invitationStatus" ? inviteStatus(user) : user[key];
          return String(actual || "").toLowerCase() === value;
        });
      });
    };
    const updateAvatarPreview = (user = null) => {
      const image = imageInput?.files?.[0]
        ? URL.createObjectURL(imageInput.files[0])
        : imageUrl(user?.image);
      if (!avatarPreview) return;
      if (image) {
        avatarPreview.innerHTML = `<img src="${escapeHtml(image)}" alt="" />`;
      } else {
        const initials =
          `${String(form.firstName.value || user?.firstName || "U").charAt(0)}${String(form.lastName.value || user?.lastName || "").charAt(0)}`.toUpperCase();
        avatarPreview.textContent = initials || "U";
      }
    };
    const syncDerivedFields = () => {
      const jobTitle = form.jobTitle.value;
      form.access.value = roleMap[String(jobTitle).toLowerCase()] || "";
      if (licenseField)
        licenseField.hidden = !licenseRoles.has(String(jobTitle).toLowerCase());
      if (!editingUser) {
        const first = form.firstName.value.trim();
        const last = form.lastName.value.trim();
        if (first && last) {
          const base = `${last}${first[0]}`
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/[^a-z0-9]/g, "");
          let candidate = base;
          let counter = 1;
          const taken = (name) =>
            users.some(
              (user) =>
                String(user.username || "").toLowerCase() ===
                name.toLowerCase(),
            );
          while (taken(candidate)) {
            counter += 1;
            candidate = `${base}${counter}`;
          }
          form.username.value = candidate;
        }
      }
      updateAvatarPreview(editingUser);
    };
    const renderStats = () => {
      if (!statsRoot) return;
      const counts = {
        Total: users.length,
        Active: users.filter((user) => user.status === "active").length,
        Inactive: users.filter((user) => user.status === "inactive").length,
        Deactivated: users.filter((user) => user.status === "deactivated")
          .length,
      };
      statsRoot.innerHTML = Object.entries(counts)
        .map(
          ([label, value]) =>
            `<div class="card"><span class="muted">${label}</span><div class="kpi">${value}</div></div>`,
        )
        .join("");
    };
    const renderTable = () => {
      const rows = visibleUsers();
      if (!rows.length) {
        tableBody.innerHTML = `<tr><td colspan="9" class="muted">No users found.</td></tr>`;
        return;
      }
      const currentUserId = getUser()?.id;
      tableBody.innerHTML = rows
        .map((user) => {
          const id = getId(user);
          const status = String(user.status || "").toLowerCase();
          const invitation = inviteStatus(user);
          const actions = [
            `<button type="button" class="btn small" data-user-action="edit" data-id="${escapeHtml(id)}">Edit</button>`,
          ];
          if (status === "deactivated") {
            actions.push(
              `<button type="button" class="btn small ghost" data-user-action="reactivate" data-id="${escapeHtml(id)}">Reactivate</button>`,
            );
          } else if (status === "inactive") {
            actions.push(
              `<button type="button" class="btn small ghost" data-user-action="resend" data-id="${escapeHtml(id)}">Resend</button>`,
            );
            if (invitation === "expired")
              actions.push(
                `<button type="button" class="btn small ghost" data-user-action="extend" data-id="${escapeHtml(id)}">Extend 24h</button>`,
              );
            if (invitation !== "revoked")
              actions.push(
                `<button type="button" class="btn small danger" data-user-action="revoke" data-id="${escapeHtml(id)}">Revoke</button>`,
              );
          } else if (status === "active" && id !== currentUserId) {
            actions.push(
              `<button type="button" class="btn small danger" data-user-action="deactivate" data-id="${escapeHtml(id)}">Deactivate</button>`,
            );
          }
          return `<tr>
          <td>${escapeHtml(fullname(user))}</td>
          <td>${escapeHtml(user.username || "-")}</td>
          <td>${escapeHtml(maskEmail(user.email))}</td>
          <td>${escapeHtml(user.jobTitle || "-")}</td>
          <td>${escapeHtml(user.access || "-")}</td>
          <td>${renderStatus(status || "-")}</td>
          <td>${renderStatus(invitation)}</td>
          <td>${escapeHtml(formatDate(user.dateCreated || user.createdAt))}</td>
          <td><div class="row-actions">${actions.join("")}</div></td>
        </tr>`;
        })
        .join("");
    };
    const loadUsers = async () => {
      tableBody.innerHTML = `<tr><td colspan="9" class="muted">Loading users...</td></tr>`;
      try {
        users = normalizeRows(await apiFetch("/api/user/get-all-users"));
        renderStats();
        renderTable();
      } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="9" class="muted">${escapeHtml(error.message)}</td></tr>`;
      }
    };
    const openForm = (user = null) => {
      editingUser = user;
      form.reset();
      if (formStatus) formStatus.textContent = "";
      $("[data-user-dialog-title]").textContent = user
        ? "Edit User"
        : "Add User";
      [
        "firstName",
        "lastName",
        "email",
        "username",
        "jobTitle",
        "access",
        "licenseNo",
      ].forEach((key) => {
        if (form[key]) form[key].value = user?.[key] || "";
      });
      syncDerivedFields();
      dialog.showModal();
    };
    const collectUserForm = () => {
      const data = new FormData(form);
      data.set("access", form.access.value);
      data.set("confirmAction", "true");
      data.set(
        "dateCreated",
        editingUser?.dateCreated || new Date().toISOString(),
      );
      return data;
    };
    const submitFormData = async (url, method, formData) => {
      await ensureFreshToken().catch(() => null);
      const nextHeaders = headers();
      delete nextHeaders["Content-Type"];
      const response = await fetch(url, {
        method,
        headers: nextHeaders,
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Operation failed");
      return data;
    };
    const preview = () => {
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(collectUserForm().entries());
      $("[data-user-preview-title]").textContent = editingUser
        ? "Preview Updated User"
        : "Preview New User";
      previewBody.innerHTML = [
        "firstName",
        "lastName",
        "email",
        "username",
        "jobTitle",
        "access",
        "licenseNo",
      ]
        .filter((key) => values[key])
        .map(
          (key) =>
            `<div><span class="muted">${escapeHtml(labelize(key))}</span><strong>${escapeHtml(values[key])}</strong></div>`,
        )
        .join("");
      if (previewStatus) previewStatus.textContent = "";
      previewDialog.showModal();
    };
    const save = async () => {
      const id = editingUser ? getId(editingUser) : "";
      try {
        await submitFormData(
          editingUser
            ? `/api/user/update-user/${encodeURIComponent(id)}`
            : "/api/user/create",
          editingUser ? "PUT" : "POST",
          collectUserForm(),
        );
        previewDialog.close();
        dialog.close();
        await loadUsers();
      } catch (error) {
        if (previewStatus) previewStatus.textContent = error.message;
      }
    };
    const runAction = async (action, user) => {
      const id = getId(user);
      const labels = {
        deactivate: "Deactivate this user?",
        reactivate: "Reactivate this user?",
        resend: "Resend activation credentials?",
        extend: "Extend invitation expiry by 24 hours?",
        revoke: "Revoke this invitation?",
      };
      if (!confirm(labels[action] || "Continue?")) return;
      const routes = {
        deactivate: [
          "/api/user/update-user-status/{id}",
          "PUT",
          { status: "deactivated" },
        ],
        reactivate: [
          "/api/user/update-user-status/{id}",
          "PUT",
          { status: "active" },
        ],
        resend: ["/api/user/resend-activation/{id}", "POST", {}],
        extend: [
          "/api/user/extend-invitation-expiry/{id}",
          "PUT",
          { hours: 24 },
        ],
        revoke: ["/api/user/revoke-invitation/{id}", "PUT", {}],
      };
      const [template, method, body] = routes[action] || [];
      if (!template) return;
      try {
        await apiFetch(template.replace("{id}", encodeURIComponent(id)), {
          method,
          body: JSON.stringify(body),
        });
        await loadUsers();
      } catch (error) {
        alert(error.message);
      }
    };

    form?.addEventListener("input", syncDerivedFields);
    form?.jobTitle?.addEventListener("change", syncDerivedFields);
    imageInput?.addEventListener("change", () =>
      updateAvatarPreview(editingUser),
    );
    $("[data-user-open-create]")?.addEventListener("click", () => openForm());
    $("[data-users-refresh]")?.addEventListener("click", loadUsers);
    $("[data-user-preview]")?.addEventListener("click", preview);
    $("[data-user-save]")?.addEventListener("click", save);
    $$("[data-user-close]").forEach((button) =>
      button.addEventListener("click", () => dialog?.close()),
    );
    $$("[data-user-preview-close]").forEach((button) =>
      button.addEventListener("click", () => previewDialog?.close()),
    );
    search?.addEventListener("input", renderTable);
    filters.forEach((filter) => filter.addEventListener("change", renderTable));
    tableBody?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-user-action]");
      if (!button) return;
      const user = users.find((row) => getId(row) === button.dataset.id);
      if (!user) return;
      if (button.dataset.userAction === "edit") openForm(user);
      else runAction(button.dataset.userAction, user);
    });
    loadUsers();
  };

  const initFlightLogPage = () => {
    const page = $("[data-flight-log-page]");
    if (!page) return;
    const tableBody = $("[data-flight-table]");
    const search = $("[data-flight-search]");
    const aircraftFilter = $("[data-flight-aircraft]");
    const statusFilter = $("[data-flight-status]");
    const countRoot = $("[data-flight-count]");
    const dialog = $("[data-flight-dialog]");
    const form = $("[data-flight-form]");
    const workflowDialog = $("[data-flight-workflow-dialog]");
    const workflowForm = $("[data-flight-workflow-form]");
    const legsRoot = $("[data-flight-legs]");
    const componentsRoot = $("[data-flight-components]");
    const fuelRoot = $("[data-flight-fuel]");
    const oilRoot = $("[data-flight-oil]");
    const workRoot = $("[data-flight-work]");
    let logs = [];
    let editing = null;
    let workflow = { action: "", log: null };
    let formLegs = [];
    let formComponentData = {};
    let fuelServicing = [];
    let oilServicing = [];
    let workItems = [];

    const componentFields = [
      ["airframe", "A/Frame"],
      ["gearBoxMain", "Gear Box (Main)"],
      ["gearBoxTail", "Gear Box (Tail)"],
      ["rotorMain", "Rotor (Main)"],
      ["rotorTail", "Rotor (Tail)"],
      ["airframeNextInsp", "Aircraft Next Insp", "date"],
      ["engine", "Engine"],
      ["cycleN1", "Cycle (N1)"],
      ["cycleN2", "Cycle (N2)"],
      ["usage", "Usage"],
      ["landingCycle", "Landing Cycle"],
      ["engineNextInsp", "Engine Next Insp", "date"],
    ];
    const componentSections = [
      ["broughtForwardData", "Brought Forward", true],
      ["thisFlightData", "This Flt", false],
      ["toDateData", "To Date", true],
    ];
    const emptyComponentSection = () =>
      Object.fromEntries(componentFields.map(([key]) => [key, ""]));
    const emptyComponentData = () => ({
      broughtForwardData: emptyComponentSection(),
      thisFlightData: emptyComponentSection(),
      toDateData: emptyComponentSection(),
    });
    const emptyLeg = () => ({
      stations: [{ from: "", to: "" }],
      blockTimeOn: "",
      blockTimeOff: "",
      flightTimeOn: "",
      flightTimeOff: "",
      totalTimeOn: "",
      totalTimeOff: "",
      date: "",
      passengers: "",
    });
    const emptyFuelItem = () => ({
      date: "",
      contCheck: "",
      mainRemG: "",
      mainAdd: "",
      mainTotal: "",
      refuelerName: "",
      fuelType: "",
      signature: "",
    });
    const emptyOilItem = () => ({
      date: "",
      engineRem: "",
      engineAdd: "",
      engineTot: "",
      mrGboxRem: "",
      mrGboxAdd: "",
      mrGboxTot: "",
      trGboxRem: "",
      trGboxAdd: "",
      trGboxTot: "",
      remarks: "",
      signature: "",
    });
    const emptyWorkItem = () => ({
      id: `work-${Date.now()}-${Math.random()}`,
      selectedWorkTypes: [],
      date: "",
      aircraft: "",
      workDone: "",
      name: "",
      certificateNumber: "",
      signature: "",
    });
    const dateInputValue = (value) => {
      if (!value) return "";
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime())
        ? String(value)
        : parsed.toISOString().slice(0, 10);
    };
    const normalizeLegsForForm = (legs = []) => {
      const rows = Array.isArray(legs) && legs.length ? legs : [emptyLeg()];
      return rows.map((leg) => ({
        ...emptyLeg(),
        ...leg,
        stations:
          Array.isArray(leg?.stations) && leg.stations.length
            ? leg.stations.map((station) => ({
                from: station?.from || "",
                to: station?.to || "",
              }))
            : [{ from: "", to: "" }],
        date: dateInputValue(leg?.date),
      }));
    };
    const normalizeComponentData = (data = {}) => {
      const base = emptyComponentData();
      componentSections.forEach(([key]) => {
        base[key] = { ...base[key], ...(data?.[key] || {}) };
      });
      return base;
    };
    const calculateToDateData = () => {
      const brought = formComponentData.broughtForwardData || {};
      const flight = formComponentData.thisFlightData || {};
      const toDate = {};
      componentFields.forEach(([key, , type]) => {
        if (type === "date") {
          toDate[key] = flight[key] || brought[key] || "";
          return;
        }
        const total = (Number(brought[key]) || 0) + (Number(flight[key]) || 0);
        toDate[key] = total ? Number(total.toFixed(2)) : "";
      });
      formComponentData.toDateData = toDate;
    };
    const syncServicingRows = () => {
      fuelServicing = formLegs.map((_, index) => ({
        ...emptyFuelItem(),
        ...(fuelServicing[index] || {}),
      }));
      oilServicing = formLegs.map((_, index) => ({
        ...emptyOilItem(),
        ...(oilServicing[index] || {}),
      }));
    };

    const normalizeFlightStatus = (value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_") || "pending_release";
    const comparableFlightStatus = (log) => {
      const status = normalizeFlightStatus(log.status);
      if (["ongoing", "draft"].includes(status)) return "pending_release";
      if (status === "released") return "pending_acceptance";
      if (status === "accepted" && log.notifiedForCompletion)
        return "for_completion";
      return status;
    };
    const statusLabel = (log) =>
      ({
        pending_release: "Pending Release",
        pending_acceptance: "Released",
        accepted: "Accepted",
        for_completion: "For Completion",
        completed: "Completed",
      })[comparableFlightStatus(log)] || "Pending Release";
    const flightDate = (value) =>
      value ? new Date(value).toLocaleDateString("en-PH") : "N/A";
    const canMechanic = () =>
      [
        "mechanic",
        "maintenance manager",
        "superadmin",
        "head of maintenance",
        "engineer",
      ].includes(getUserRole());
    const canPilot = () => getUserRole() === "pilot";
    const isOic = () => getUserRole() === "officer-in-charge";
    const hasDestinationInfo = (log) =>
      Array.isArray(log.legs) &&
      log.legs.some(
        (leg) =>
          Array.isArray(leg?.stations) &&
          leg.stations.some((station) => station?.from && station?.to),
      );
    const userDisplayName = () =>
      [getUser()?.firstName, getUser()?.lastName].filter(Boolean).join(" ") ||
      getUser()?.username ||
      "AirMS User";
    const buildToDateData = (log) => {
      const broughtForward = log?.componentData?.broughtForwardData || {};
      const thisFlight = log?.componentData?.thisFlightData || {};
      const existing = log?.componentData?.toDateData || {};
      const sum = (key) =>
        (Number(broughtForward[key]) || 0) + (Number(thisFlight[key]) || 0);
      return Object.keys(existing).length
        ? existing
        : {
            airframe: sum("airframe"),
            gearBoxMain: sum("gearBoxMain"),
            gearBoxTail: sum("gearBoxTail"),
            rotorMain: sum("rotorMain"),
            rotorTail: sum("rotorTail"),
            engine: sum("engine"),
            cycleN1: sum("cycleN1"),
            cycleN2: sum("cycleN2"),
            landingCycle: sum("landingCycle"),
            usage: sum("usage"),
          };
    };
    const exportFlightLog = (log) => {
      const win = window.open("", "_blank", "noopener,noreferrer");
      if (!win) return;
      const destinations =
        (log.legs || [])
          .flatMap((leg) => leg.stations || [])
          .map((station) => `${station.from || ""} - ${station.to || ""}`)
          .filter((value) => value.trim())
          .join(", ") || "N/A";
      const toDate = buildToDateData(log);
      win.document
        .write(`<!doctype html><html><head><title>Flight Log ${escapeHtml(log.rpc || getId(log))}</title><style>
        body{font-family:Arial,sans-serif;margin:28px;color:#111} h1{margin:0 0 8px} table{width:100%;border-collapse:collapse;margin-top:14px} td,th{border:1px solid #ccc;padding:8px;text-align:left;vertical-align:top} th{background:#f3f4f6}.muted{color:#667085}.sig{height:58px}
      </style></head><body>
        <h1>Aircraft Flight Log</h1>
        <p class="muted">Generated ${escapeHtml(new Date().toLocaleString())}</p>
        <table><tbody>
          <tr><th>RP/C</th><td>${escapeHtml(log.rpc || "N/A")}</td><th>Aircraft Type</th><td>${escapeHtml(log.aircraftType || "N/A")}</td></tr>
          <tr><th>Date</th><td>${escapeHtml(flightDate(log.date))}</td><th>Control No.</th><td>${escapeHtml(log.controlNo || log.control || "N/A")}</td></tr>
          <tr><th>Route</th><td>${escapeHtml(log.route || "N/A")}</td><th>Pilot</th><td>${escapeHtml(log.pilot || "N/A")}</td></tr>
          <tr><th>Status</th><td>${escapeHtml(statusLabel(log))}</td><th>Total Flight Time</th><td>${escapeHtml(log.totalFlightTime || "N/A")}</td></tr>
          <tr><th>Destination/s</th><td colspan="3">${escapeHtml(destinations)}</td></tr>
          <tr><th>Remarks</th><td colspan="3">${escapeHtml(log.remarks || "N/A")}</td></tr>
        </tbody></table>
        <h2>Component To-Date Data</h2>
        <table><tbody>${Object.entries(toDate)
          .map(
            ([key, value]) =>
              `<tr><th>${escapeHtml(labelize(key))}</th><td>${escapeHtml(value || "0")}</td></tr>`,
          )
          .join("")}</tbody></table>
        <h2>Signatures</h2>
        <table><tbody>
          <tr><th>Released By</th><td class="sig">${escapeHtml(log.releasedByName || log.releaseName || "")}</td><th>Accepted By</th><td class="sig">${escapeHtml(log.acceptedByName || log.acceptName || log.pilot || "")}</td></tr>
        </tbody></table>
        <script>window.onload=()=>window.print();<\/script>
      </body></html>`);
      win.document.close();
    };
    const filtered = () => {
      const q = String(search?.value || "")
        .toLowerCase()
        .trim();
      const aircraft = aircraftFilter?.value || "all";
      const status = statusFilter?.value || "all";
      return logs.filter((log) => {
        const haystack = [log.rpc, log.aircraftType, log.date, log.controlNo]
          .join(" ")
          .toLowerCase();
        if (q && !haystack.includes(q)) return false;
        if (aircraft !== "all" && log.rpc !== aircraft) return false;
        return status === "all" || comparableFlightStatus(log) === status;
      });
    };
    const populateAircraft = () => {
      const current = aircraftFilter.value || "all";
      const aircraft = [...new Set(logs.map((log) => log.rpc).filter(Boolean))];
      aircraftFilter.innerHTML = `<option value="all">All Aircraft</option>${aircraft.map((rpc) => `<option value="${escapeHtml(rpc)}">RP/C: ${escapeHtml(rpc)}</option>`).join("")}`;
      aircraftFilter.value = aircraft.includes(current) ? current : "all";
    };
    const renderTable = () => {
      const rows = filtered();
      if (countRoot)
        countRoot.textContent = `Showing ${rows.length} flight log(s)`;
      if (!rows.length) {
        tableBody.innerHTML = `<tr><td colspan="6" class="muted">No flight logs found.</td></tr>`;
        return;
      }
      tableBody.innerHTML = rows
        .map((log) => {
          const id = getId(log);
          const status = comparableFlightStatus(log);
          const actions = [
            `<button type="button" class="btn small" data-flight-action="edit" data-id="${escapeHtml(id)}">${isOic() ? "View" : "Edit"}</button>`,
          ];
          if (!isOic() && canMechanic() && status === "pending_release")
            actions.push(
              `<button type="button" class="btn small ghost" data-flight-action="release" data-id="${escapeHtml(id)}">Release</button>`,
            );
          if (canPilot() && status === "pending_acceptance")
            actions.push(
              `<button type="button" class="btn small ghost" data-flight-action="accept" data-id="${escapeHtml(id)}">Accept</button>`,
            );
          if (canPilot() && status === "accepted" && !log.notifiedForCompletion)
            actions.push(
              `<button type="button" class="btn small ghost" data-flight-action="notify" data-id="${escapeHtml(id)}">Notify</button>`,
            );
          if (!isOic() && canMechanic() && status === "for_completion")
            actions.push(
              `<button type="button" class="btn small ghost" data-flight-action="complete" data-id="${escapeHtml(id)}">Complete</button>`,
            );
          actions.push(
            `<button type="button" class="btn small ghost" data-flight-action="export" data-id="${escapeHtml(id)}">Export</button>`,
          );
          return `<tr>
          <td>${escapeHtml(log.rpc || "N/A")}</td>
          <td>${escapeHtml(log.aircraftType || "N/A")}</td>
          <td>${escapeHtml(flightDate(log.date))}</td>
          <td>${escapeHtml(log.controlNo || log.control || "N/A")}</td>
          <td>${renderStatus(statusLabel(log))}</td>
          <td><div class="row-actions">${actions.join("")}</div></td>
        </tr>`;
        })
        .join("");
    };
    const load = async () => {
      tableBody.innerHTML = `<tr><td colspan="6" class="muted">Loading flight logs...</td></tr>`;
      try {
        const data = await apiFetch("/api/flightlogs?page=1&limit=500");
        logs = normalizeRows(data).sort(
          (a, b) =>
            new Date(b.date || b.createdAt || 0) -
            new Date(a.date || a.createdAt || 0),
        );
        populateAircraft();
        renderTable();
      } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="6" class="muted">${escapeHtml(error.message)}</td></tr>`;
      }
    };
    const renderLegs = () => {
      if (!legsRoot) return;
      const canEdit = !isOic();
      legsRoot.innerHTML = formLegs
        .map(
          (leg, legIndex) => `
        <section class="flight-leg-card" data-flight-leg="${legIndex}">
          <div class="section-head">
            <h5>Leg ${legIndex + 1}</h5>
            ${canEdit && formLegs.length > 1 ? `<button type="button" class="btn small danger" data-flight-remove-leg="${legIndex}">Remove</button>` : ""}
          </div>
          <div class="flight-stations">
            ${(leg.stations || [])
              .map(
                (station, stationIndex) => `
              <div class="flight-station-row" data-flight-station="${stationIndex}">
                <input class="table-input" value="${escapeHtml(station.from || "")}" placeholder="From" data-flight-station-key="from" data-leg-index="${legIndex}" data-station-index="${stationIndex}" />
                <span>-</span>
                <input class="table-input" value="${escapeHtml(station.to || "")}" placeholder="To" data-flight-station-key="to" data-leg-index="${legIndex}" data-station-index="${stationIndex}" />
                ${canEdit && (leg.stations || []).length > 1 ? `<button type="button" class="btn small ghost" data-flight-remove-station="${stationIndex}" data-leg-index="${legIndex}">Remove</button>` : ""}
              </div>
            `,
              )
              .join("")}
            ${canEdit ? `<button type="button" class="btn small ghost" data-flight-add-station="${legIndex}">Add Station</button>` : ""}
          </div>
          <div class="flight-leg-fields">
            ${[
              ["blockTimeOn", "Block Time On"],
              ["blockTimeOff", "Block Time Off"],
              ["flightTimeOn", "Flight Time On"],
              ["flightTimeOff", "Flight Time Off"],
              ["totalTimeOn", "Total Time On"],
              ["totalTimeOff", "Total Time Off"],
              ["date", "Date", "date"],
              ["passengers", "Passengers"],
            ]
              .map(
                ([key, label, type]) => `
              <label class="field compact">
                <span>${escapeHtml(label)}</span>
                <input type="${type || "text"}" value="${escapeHtml(type === "date" ? dateInputValue(leg[key]) : leg[key] || "")}" data-flight-leg-key="${key}" data-leg-index="${legIndex}" />
              </label>
            `,
              )
              .join("")}
          </div>
        </section>
      `,
        )
        .join("");
    };
    const renderComponents = () => {
      if (!componentsRoot) return;
      calculateToDateData();
      componentsRoot.innerHTML = componentSections
        .map(
          ([sectionKey, title, locked]) => `
        <section class="flight-component-section">
          <h5>${escapeHtml(title)}</h5>
          ${componentFields
            .map(
              ([key, label, type]) => `
            <label class="field compact">
              <span>${escapeHtml(label)}</span>
              <input type="${type || "number"}" step="any" value="${escapeHtml(type === "date" ? dateInputValue(formComponentData?.[sectionKey]?.[key]) : formComponentData?.[sectionKey]?.[key] || "")}" data-flight-component-section="${sectionKey}" data-flight-component-key="${key}" ${locked ? "disabled" : ""} />
            </label>
          `,
            )
            .join("")}
        </section>
      `,
        )
        .join("");
    };
    const serviceField = (
      group,
      legIndex,
      key,
      label,
      value,
      type = "text",
    ) => `
      <label class="field compact">
        <span>${escapeHtml(label)}</span>
        <input type="${type}" value="${escapeHtml(type === "date" ? dateInputValue(value) : value || "")}" data-flight-service="${group}" data-service-index="${legIndex}" data-service-key="${key}" />
      </label>
    `;
    const renderFuelOil = () => {
      syncServicingRows();
      if (fuelRoot) {
        fuelRoot.innerHTML = fuelServicing
          .map(
            (fuel, index) => `
          <section class="flight-leg-card">
            <div class="section-head"><h5>Leg ${index + 1}</h5></div>
            <div class="flight-leg-fields">
              ${serviceField("fuel", index, "date", "Date", fuel.date, "date")}
              ${serviceField("fuel", index, "contCheck", "Cont Check", fuel.contCheck)}
              ${serviceField("fuel", index, "mainRemG", "Main REM/G", fuel.mainRemG)}
              ${serviceField("fuel", index, "mainAdd", "Main ADD", fuel.mainAdd)}
              ${serviceField("fuel", index, "mainTotal", "Main TOTAL", fuel.mainTotal)}
              ${serviceField("fuel", index, "refuelerName", "Refueler Name", fuel.refuelerName)}
              ${serviceField("fuel", index, "fuelType", "Fuel Type", fuel.fuelType)}
              ${serviceField("fuel", index, "signature", "Signature / Name", fuel.signature)}
            </div>
          </section>
        `,
          )
          .join("");
      }
      if (oilRoot) {
        oilRoot.innerHTML = oilServicing
          .map(
            (oil, index) => `
          <section class="flight-leg-card">
            <div class="section-head"><h5>Leg ${index + 1}</h5></div>
            <div class="flight-leg-fields">
              ${serviceField("oil", index, "date", "Date", oil.date, "date")}
              ${serviceField("oil", index, "engineRem", "Engine REM", oil.engineRem)}
              ${serviceField("oil", index, "engineAdd", "Engine ADD", oil.engineAdd)}
              ${serviceField("oil", index, "engineTot", "Engine TOT", oil.engineTot)}
              ${serviceField("oil", index, "mrGboxRem", "M/R GBox REM", oil.mrGboxRem)}
              ${serviceField("oil", index, "mrGboxAdd", "M/R GBox ADD", oil.mrGboxAdd)}
              ${serviceField("oil", index, "mrGboxTot", "M/R GBox TOT", oil.mrGboxTot)}
              ${serviceField("oil", index, "trGboxRem", "T/R GBox REM", oil.trGboxRem)}
              ${serviceField("oil", index, "trGboxAdd", "T/R GBox ADD", oil.trGboxAdd)}
              ${serviceField("oil", index, "trGboxTot", "T/R GBox TOT", oil.trGboxTot)}
              ${serviceField("oil", index, "remarks", "Remarks", oil.remarks)}
              ${serviceField("oil", index, "signature", "Signature / Name", oil.signature)}
            </div>
          </section>
        `,
          )
          .join("");
      }
    };
    const renderWorkItems = () => {
      if (!workRoot) return;
      workRoot.innerHTML = workItems.length
        ? workItems
            .map(
              (item, index) => `
        <section class="flight-leg-card" data-work-index="${index}">
          <div class="section-head">
            <h5>Work Done ${index + 1}</h5>
            <button type="button" class="btn small danger" data-flight-remove-work="${index}">Remove</button>
          </div>
          <div class="flight-work-types">
            ${["Discrepancy Correction", "SB/AD Compliance", "Inspection", "Others"].map((type) => `<label><input type="checkbox" data-work-type="${escapeHtml(type)}" data-work-index="${index}" ${(item.selectedWorkTypes || []).includes(type) ? "checked" : ""} /> ${escapeHtml(type)}</label>`).join("")}
          </div>
          <div class="flight-leg-fields">
            ${serviceField("work", index, "date", "Date", item.date, "date")}
            ${serviceField("work", index, "aircraft", "Aircraft", item.aircraft)}
            <label class="field compact"><span>Work Done</span><textarea rows="3" data-flight-service="work" data-service-index="${index}" data-service-key="workDone">${escapeHtml(item.workDone || "")}</textarea></label>
            ${serviceField("work", index, "name", "Name", item.name)}
            ${serviceField("work", index, "certificateNumber", "Certificate No.", item.certificateNumber)}
            ${serviceField("work", index, "signature", "Signature / Name", item.signature)}
          </div>
        </section>
      `,
            )
            .join("")
        : `<p class="muted">No work items yet.</p>`;
    };
    const openForm = (log = null) => {
      editing = log;
      form.reset();
      $$("input,select,textarea", form).forEach((node) => {
        node.disabled = false;
      });
      $("[data-flight-dialog-title]").textContent = log
        ? "Edit Flight Log"
        : "New Flight Log";
      [
        "rpc",
        "aircraftType",
        "date",
        "controlNo",
        "route",
        "pilot",
        "totalFlightTime",
        "status",
        "remarks",
        "sling",
      ].forEach((key) => {
        if (!form[key]) return;
        form[key].value =
          key === "date" && log?.[key]
            ? new Date(log[key]).toISOString().slice(0, 10)
            : log?.[key] || "";
      });
      formLegs = normalizeLegsForForm(log?.legs);
      formComponentData = normalizeComponentData(log?.componentData);
      fuelServicing = Array.isArray(log?.fuelServicing)
        ? log.fuelServicing
        : [];
      oilServicing = Array.isArray(log?.oilServicing) ? log.oilServicing : [];
      workItems = Array.isArray(log?.workItems) ? log.workItems : [];
      renderLegs();
      renderComponents();
      renderFuelOil();
      renderWorkItems();
      $("[data-flight-add-leg]").hidden = isOic();
      $("[data-flight-add-work]").hidden = isOic();
      $("[data-flight-save]").hidden = isOic();
      if (isOic())
        $$("input,select,textarea", form).forEach((node) => {
          node.disabled = true;
        });
      $("[data-flight-status-text]").textContent = "";
      dialog.showModal();
    };
    const collect = () => {
      const body = Object.fromEntries(new FormData(form).entries());
      body.legs = formLegs.map((leg) => ({
        ...leg,
        stations: (leg.stations || []).filter(
          (station) => station.from || station.to,
        ),
      }));
      calculateToDateData();
      body.componentData = formComponentData;
      body.fuelServicing = fuelServicing;
      body.oilServicing = oilServicing;
      body.workItems = workItems;
      Object.keys(body).forEach((key) => {
        if (body[key] === "") delete body[key];
      });
      return body;
    };
    const openWorkflow = (action, log) => {
      workflow = { action, log };
      const title = {
        release: "Flight Log - Release",
        accept: "Flight Log - Accept",
        notify: "Flight Log - Notify Mechanic",
        complete: "Flight Log - Complete",
      }[action];
      const copy = {
        release:
          "Attach your release signature and send this flight log to the pilot for acceptance.",
        accept: "Attach your acceptance signature as pilot.",
        notify:
          "Notify the mechanic that this accepted flight log is ready for completion.",
        complete: "Complete this flight log.",
      }[action];
      $("[data-flight-workflow-title]").textContent = title;
      $("[data-flight-workflow-copy]").textContent = copy;
      const needsSignature = ["release", "accept"].includes(action);
      $("[data-flight-signature-field]").hidden = !needsSignature;
      $("[data-flight-pin-field]").hidden = !needsSignature;
      workflowForm.signature.disabled = !needsSignature;
      workflowForm.pin.disabled = !needsSignature;
      $("[data-flight-workflow-status]").textContent = "";
      workflowForm.reset();
      workflowDialog.showModal();
    };
    const runWorkflow = async (event) => {
      event.preventDefault();
      const { action, log } = workflow;
      const id = getId(log);
      const statusRoot = $("[data-flight-workflow-status]");
      try {
        if (action === "notify") {
          if (!hasDestinationInfo(log))
            throw new Error(
              "Add at least one complete From-To station in Destination/s before notifying for completion.",
            );
          await apiFetch(`/api/flightlogs/${encodeURIComponent(id)}`, {
            method: "PUT",
            body: JSON.stringify({ ...log, notifiedForCompletion: true }),
          });
        } else if (action === "complete") {
          const toDateData = buildToDateData(log);
          const aircraft = log.aircraft || log.rpc;
          if (!aircraft) throw new Error("Aircraft identifier is missing.");
          await apiFetch(
            `/api/parts-monitoring/${encodeURIComponent(aircraft)}/update-totals`,
            {
              method: "PUT",
              body: JSON.stringify({
                acftTT: Number(toDateData.airframe) || 0,
                n1Cycles: Number(toDateData.cycleN1) || 0,
                n2Cycles: Number(toDateData.cycleN2) || 0,
                landings: Number(toDateData.landingCycle) || 0,
                updatedBy: userDisplayName(),
              }),
            },
          );
          await apiFetch(`/api/flightlogs/${encodeURIComponent(id)}/complete`, {
            method: "PUT",
            body: JSON.stringify({}),
          });
        } else {
          const signature = workflowForm.signature?.value || "";
          await verifyCurrentUserPin(workflowForm.pin.value);
          await apiFetch(
            `/api/flightlogs/${encodeURIComponent(id)}/${action}`,
            {
              method: "PUT",
              body: JSON.stringify({ name: userDisplayName(), signature }),
            },
          );
        }
        workflowDialog.close();
        await load();
      } catch (error) {
        statusRoot.textContent = error.message;
      }
    };

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const statusRoot = $("[data-flight-status-text]");
      try {
        const id = editing ? getId(editing) : "";
        await apiFetch(
          editing
            ? `/api/flightlogs/${encodeURIComponent(id)}`
            : "/api/flightlogs",
          {
            method: editing ? "PUT" : "POST",
            body: JSON.stringify({ ...(editing || {}), ...collect() }),
          },
        );
        dialog.close();
        await load();
      } catch (error) {
        statusRoot.textContent = error.message;
      }
    });
    tableBody?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-flight-action]");
      if (!button) return;
      const log = logs.find((item) => getId(item) === button.dataset.id);
      if (!log) return;
      if (button.dataset.flightAction === "edit") openForm(log);
      else if (button.dataset.flightAction === "export") {
        exportFlightLog(log);
      } else openWorkflow(button.dataset.flightAction, log);
    });
    $("[data-flight-add-leg]")?.addEventListener("click", () => {
      formLegs.push(emptyLeg());
      syncServicingRows();
      renderLegs();
      renderFuelOil();
    });
    legsRoot?.addEventListener("click", (event) => {
      const addStation = event.target.closest("[data-flight-add-station]");
      const removeStation = event.target.closest(
        "[data-flight-remove-station]",
      );
      const removeLeg = event.target.closest("[data-flight-remove-leg]");
      if (addStation) {
        const legIndex = Number(addStation.dataset.flightAddStation);
        const stations = formLegs[legIndex].stations || [];
        const last = stations[stations.length - 1] || { to: "" };
        formLegs[legIndex].stations = [
          ...stations,
          { from: last.to || "", to: "" },
        ];
        renderLegs();
      }
      if (removeStation) {
        const legIndex = Number(removeStation.dataset.legIndex);
        const stationIndex = Number(removeStation.dataset.flightRemoveStation);
        formLegs[legIndex].stations = (
          formLegs[legIndex].stations || []
        ).filter((_, index) => index !== stationIndex);
        renderLegs();
      }
      if (removeLeg) {
        formLegs = formLegs.filter(
          (_, index) => index !== Number(removeLeg.dataset.flightRemoveLeg),
        );
        if (!formLegs.length) formLegs = [emptyLeg()];
        syncServicingRows();
        renderLegs();
        renderFuelOil();
      }
    });
    legsRoot?.addEventListener("input", (event) => {
      const stationInput = event.target.closest("[data-flight-station-key]");
      const legInput = event.target.closest("[data-flight-leg-key]");
      if (stationInput) {
        const legIndex = Number(stationInput.dataset.legIndex);
        const stationIndex = Number(stationInput.dataset.stationIndex);
        const key = stationInput.dataset.flightStationKey;
        formLegs[legIndex].stations[stationIndex][key] = stationInput.value;
        if (key === "to" && formLegs[legIndex].stations[stationIndex + 1])
          formLegs[legIndex].stations[stationIndex + 1].from =
            stationInput.value;
      }
      if (legInput) {
        formLegs[Number(legInput.dataset.legIndex)][
          legInput.dataset.flightLegKey
        ] = legInput.value;
      }
    });
    componentsRoot?.addEventListener("change", (event) => {
      const input = event.target.closest("[data-flight-component-key]");
      if (!input || input.disabled) return;
      const section = input.dataset.flightComponentSection;
      const key = input.dataset.flightComponentKey;
      formComponentData[section] = formComponentData[section] || {};
      formComponentData[section][key] = input.value;
      renderComponents();
    });
    page.addEventListener("input", (event) => {
      const input = event.target.closest("[data-flight-service]");
      if (!input) return;
      const group = input.dataset.flightService;
      const index = Number(input.dataset.serviceIndex);
      const key = input.dataset.serviceKey;
      if (group === "fuel") fuelServicing[index][key] = input.value;
      if (group === "oil") oilServicing[index][key] = input.value;
      if (group === "work") workItems[index][key] = input.value;
    });
    page.addEventListener("change", (event) => {
      const checkbox = event.target.closest("[data-work-type]");
      if (!checkbox) return;
      const index = Number(checkbox.dataset.workIndex);
      const type = checkbox.dataset.workType;
      const selected = new Set(workItems[index]?.selectedWorkTypes || []);
      if (checkbox.checked) selected.add(type);
      else selected.delete(type);
      workItems[index].selectedWorkTypes = [...selected];
    });
    $("[data-flight-add-work]")?.addEventListener("click", () => {
      workItems.push({ ...emptyWorkItem(), aircraft: form.rpc?.value || "" });
      renderWorkItems();
    });
    workRoot?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-flight-remove-work]");
      if (!button) return;
      workItems = workItems.filter(
        (_, index) => index !== Number(button.dataset.flightRemoveWork),
      );
      renderWorkItems();
    });
    workflowForm?.addEventListener("submit", runWorkflow);
    search?.addEventListener("input", renderTable);
    aircraftFilter?.addEventListener("change", renderTable);
    statusFilter?.addEventListener("change", renderTable);
    $("[data-flight-new]")?.addEventListener("click", () => openForm());
    $("[data-flight-refresh]")?.addEventListener("click", load);
    $$("[data-flight-close]").forEach((button) =>
      button.addEventListener("click", () => dialog?.close()),
    );
    $$("[data-flight-workflow-close]").forEach((button) =>
      button.addEventListener("click", () => workflowDialog?.close()),
    );
    if (isOic()) $("[data-flight-new]")?.setAttribute("hidden", "hidden");
    load();
  };

  const initInspectionPage = () => {
    const page = $("[data-inspection-page]");
    if (!page) return;
    const config = readPageConfig() || {};
    const kind = page.dataset.inspectionKind || "pre";
    const listUrl = config.list;
    const createUrl =
      kind === "pre"
        ? "/api/pre-inspections/createPreInspection"
        : "/api/post-inspections/createPostInspection";
    const updateUrl =
      kind === "pre"
        ? "/api/pre-inspections/updatePreInspectionById/{id}"
        : "/api/post-inspections/updatePostInspectionById/{id}";
    const tableBody = $("[data-inspection-table]");
    const search = $("[data-inspection-search]");
    const aircraftFilter = $("[data-inspection-aircraft]");
    const statusFilter = $("[data-inspection-status]");
    const countRoot = $("[data-inspection-count]");
    const dialog = $("[data-inspection-dialog]");
    const form = $("[data-inspection-form]");
    const checklistRoot = $("[data-inspection-checklist]");
    const signDialog = $("[data-inspection-sign-dialog]");
    const signForm = $("[data-inspection-sign-form]");
    let records = [];
    let editing = null;
    let signMode = "";

    const preFields = {
      "Station 1 and 2": [
        "station1_transparentPanels",
        "station1_engineOilCooler",
        "station1_sideSlipIndicator",
        "station1_pitotTube",
        "station1_landingLights",
        "station2_frontDoor",
        "station2_rearDoor",
        "station2_fuelTank",
        "station1_mainRotor",
        "station1_engineCowl",
      ],
      "Station 3 and Sling": [
        "station3_heatShield",
        "station3_tailBoom",
        "station3_stabilizer",
        "station3_tailRotorGuard",
        "station3_tgbOilLevel",
        "sling_sling",
        "sling_cablePins",
      ],
      "Floats and Onboard": [
        "floats_lhRh",
        "floats_cylinder",
        "floats_hoses",
        "onboard_firstAid",
        "onboard_lifeVest",
        "onboard_lifeRaft",
        "onboard_fireExt",
        "onboard_certAirworthiness",
        "onboard_certRegistration",
        "onboard_radioLicense",
        "onboard_flightLogbook",
      ],
    };
    const postFields = {
      "Station 1": [
        "station1_fuselage",
        "station1_windshield",
        "station1_landingGear",
        "station1_lights",
      ],
      "Station 2": [
        "station2_doors",
        "station2_cargo",
        "station2_fuelTank",
        "station2_panels",
      ],
      Engine: [
        "engine_oilLevel",
        "engine_cowling",
        "engine_intake",
        "station3_tailBoom",
        "station3_tailRotor",
      ],
      "Main Rotor": [
        "mainRotor_blades",
        "mainRotor_head",
        "mainRotor_pitchChangeLinks",
        "mainRotor_swashplate",
      ],
      "Cabin Interior": [
        "cabin_seats",
        "cabin_harness",
        "cabin_fireExt",
        "interior_cleanliness",
      ],
    };
    const sections = kind === "pre" ? preFields : postFields;
    const allFields = () => [...new Set(Object.values(sections).flat())];
    const labelFor = (field) =>
      labelize(
        field
          .replace(/^station\d+_/, "")
          .replace(/^mainRotor_/, "")
          .replace(/^engine_/, "")
          .replace(/^cabin_/, "")
          .replace(/^interior_/, ""),
      );
    const getDisplayStatus = (record) =>
      String(record?.status || "pending").toLowerCase() === "completed"
        ? "completed"
        : String(record?.status || "pending").toLowerCase() === "released"
          ? "released"
          : "pending";
    const canRelease = () =>
      ["mechanic", "maintenance manager", "superadmin"].includes(getUserRole());
    const canAccept = () => getUserRole() === "pilot";
    const readOnlyRole = () => getUserRole() === "officer-in-charge";
    const filtered = () => {
      const q = String(search?.value || "")
        .toLowerCase()
        .trim();
      const aircraft = aircraftFilter?.value || "all";
      const status = statusFilter?.value || "all";
      return records.filter((record) => {
        const haystack = [record.rpc, record.aircraftType, record.date]
          .join(" ")
          .toLowerCase();
        if (q && !haystack.includes(q)) return false;
        if (aircraft !== "all" && record.rpc !== aircraft) return false;
        return status === "all" || getDisplayStatus(record) === status;
      });
    };
    const populateAircraft = () => {
      const current = aircraftFilter.value || "all";
      const aircraft = [
        ...new Set(records.map((record) => record.rpc).filter(Boolean)),
      ];
      aircraftFilter.innerHTML = `<option value="all">All Aircraft</option>${aircraft.map((rpc) => `<option value="${escapeHtml(rpc)}">RP/C: ${escapeHtml(rpc)}</option>`).join("")}`;
      aircraftFilter.value = aircraft.includes(current) ? current : "all";
    };
    const renderTable = () => {
      const rows = filtered();
      if (countRoot)
        countRoot.textContent = `Showing ${rows.length} ${kind}-inspection log(s)`;
      if (!rows.length) {
        tableBody.innerHTML = `<tr><td colspan="7" class="muted">No inspections found.</td></tr>`;
        return;
      }
      tableBody.innerHTML = rows
        .map((record) => {
          const id = getId(record);
          const status = getDisplayStatus(record);
          const actions = [
            `<button type="button" class="btn small" data-inspection-action="edit" data-id="${escapeHtml(id)}">${readOnlyRole() ? "View" : "Edit"}</button>`,
          ];
          if (
            kind === "pre" &&
            canAccept() &&
            status === "released" &&
            !record.acceptedBy?.name
          )
            actions.push(
              `<button type="button" class="btn small ghost" data-inspection-action="accept" data-id="${escapeHtml(id)}">Accept</button>`,
            );
          return `<tr>
          <td>${escapeHtml(record.rpc || "N/A")}</td>
          <td>${escapeHtml(record.aircraftType || "N/A")}</td>
          <td>${escapeHtml(record.date || "N/A")}</td>
          <td>${renderStatus(status)}</td>
          <td>${escapeHtml(record.releasedBy?.name || "-")}</td>
          <td>${escapeHtml(record.acceptedBy?.name || "-")}</td>
          <td><div class="row-actions">${actions.join("")}</div></td>
        </tr>`;
        })
        .join("");
    };
    const load = async () => {
      tableBody.innerHTML = `<tr><td colspan="7" class="muted">Loading inspections...</td></tr>`;
      try {
        records = normalizeRows(await apiFetch(listUrl));
        populateAircraft();
        renderTable();
      } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="7" class="muted">${escapeHtml(error.message)}</td></tr>`;
      }
    };
    const renderChecklist = (record = {}) => {
      const tabRoot = $("[data-inspection-tabs]");
      tabRoot.innerHTML = [
        `<button type="button" class="tab-btn active" data-inspection-tab="basic">Basic Information</button>`,
      ]
        .concat(
          Object.keys(sections).map(
            (section) =>
              `<button type="button" class="tab-btn" data-inspection-tab="${escapeHtml(section)}">${escapeHtml(section)}</button>`,
          ),
        )
        .join("");
      checklistRoot.innerHTML = Object.entries(sections)
        .map(
          ([
            section,
            fields,
          ]) => `<section class="inspection-section" data-inspection-section="${escapeHtml(section)}" hidden>
        <div class="card-head"><h3>${escapeHtml(section)}</h3><label class="check-row"><input type="checkbox" data-select-section="${escapeHtml(section)}" /> Select All</label></div>
        <div class="checklist-grid">${fields.map((field) => `<label class="check-item"><input type="checkbox" name="${escapeHtml(field)}" ${record[field] ? "checked" : ""} /> ${escapeHtml(labelFor(field))}</label>`).join("")}</div>
      </section>`,
        )
        .join("");
      tabRoot.onclick = (event) => {
        const button = event.target.closest("[data-inspection-tab]");
        if (!button) return;
        $$("[data-inspection-tab]").forEach((node) =>
          node.classList.toggle("active", node === button),
        );
        $("[data-inspection-basic]").hidden =
          button.dataset.inspectionTab !== "basic";
        $$("[data-inspection-section]").forEach((section) => {
          section.hidden =
            section.dataset.inspectionSection !== button.dataset.inspectionTab;
        });
      };
      checklistRoot.onclick = (event) => {
        const select = event.target.closest("[data-select-section]");
        if (!select) return;
        const section = select.dataset.selectSection;
        $$(
          `input[type="checkbox"][name]`,
          $(`[data-inspection-section="${CSS.escape(section)}"]`),
        ).forEach((input) => {
          input.checked = select.checked;
        });
      };
    };
    const openForm = (record = null) => {
      editing = record;
      form.reset();
      $("[data-inspection-dialog-title]").textContent = record
        ? `${kind === "pre" ? "Pre" : "Post"} Inspection`
        : `New ${kind === "pre" ? "Pre" : "Post"} Inspection`;
      ["base", "rpc", "aircraftType", "date", "fob", "status", "notes"].forEach(
        (key) => {
          if (!form[key]) return;
          form[key].value =
            key === "date" &&
            record?.[key] &&
            !String(record[key]).includes("/")
              ? new Date(record[key]).toISOString().slice(0, 10)
              : record?.[key] || (key === "status" ? "pending" : "");
        },
      );
      renderChecklist(record || {});
      $("[data-released-by]").textContent = record?.releasedBy?.name || "-";
      $("[data-accepted-by]").textContent = record?.acceptedBy?.name || "-";
      const readOnly =
        readOnlyRole() ||
        getDisplayStatus(record) === "completed" ||
        getDisplayStatus(record) === "released";
      $$("input,select,textarea", form).forEach((node) => {
        node.disabled = Boolean(record && readOnly);
      });
      $("[data-inspection-save]").hidden = Boolean(record && readOnly);
      $("[data-inspection-release]").hidden = !(
        canRelease() &&
        (!record || getDisplayStatus(record) === "pending")
      );
      $("[data-inspection-accept]").hidden = !(
        kind === "pre" &&
        canAccept() &&
        record &&
        getDisplayStatus(record) === "released" &&
        !record.acceptedBy?.name
      );
      $("[data-inspection-form-status]").textContent = "";
      dialog.showModal();
    };
    const collect = () => {
      const body = Object.fromEntries(new FormData(form).entries());
      allFields().forEach((field) => {
        body[field] = Boolean(
          form.querySelector(`[name="${CSS.escape(field)}"]`)?.checked,
        );
      });
      Object.keys(body).forEach((key) => {
        if (body[key] === "") delete body[key];
      });
      return body;
    };
    const signaturePayload = (signature) => ({
      name:
        [getUser()?.firstName, getUser()?.lastName].filter(Boolean).join(" ") ||
        getUser()?.username ||
        "User",
      id: getUser()?.id || "",
      signature,
      timestamp: new Date().toISOString(),
    });
    const save = async (payload = collect()) => {
      const id = editing ? getId(editing) : "";
      const data = await apiFetch(
        editing ? updateUrl.replace("{id}", encodeURIComponent(id)) : createUrl,
        {
          method: editing ? "PUT" : "POST",
          body: JSON.stringify({
            ...(editing || {}),
            ...payload,
            confirmAction: true,
          }),
        },
      );
      editing = data.data || editing;
      await load();
      return data;
    };
    const openSign = (mode) => {
      signMode = mode;
      $("[data-inspection-sign-title]").textContent =
        mode === "accept"
          ? "Accept Pre-Inspection"
          : kind === "pre"
            ? "Release Pre-Inspection"
            : "Complete Post-Inspection";
      $("[data-inspection-sign-copy]").textContent =
        mode === "accept"
          ? "Attach your acceptance signature and complete this pre-inspection."
          : "Attach your signature to confirm this inspection workflow action.";
      $("[data-inspection-sign-status]").textContent = "";
      signForm.reset();
      signDialog.showModal();
    };
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await save();
        dialog.close();
      } catch (error) {
        $("[data-inspection-form-status]").textContent = error.message;
      }
    });
    $("[data-inspection-release]")?.addEventListener("click", () =>
      openSign("release"),
    );
    $("[data-inspection-accept]")?.addEventListener("click", () =>
      openSign("accept"),
    );
    signForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const signature = signForm.signature.value;
        await verifyCurrentUserPin(signForm.pin.value);
        const payload = collect();
        if (signMode === "accept") {
          payload.status = "completed";
          payload.acceptedBy = signaturePayload(signature);
        } else {
          payload.status = kind === "pre" ? "released" : "completed";
          payload.releasedBy = signaturePayload(signature);
        }
        await save(payload);
        signDialog.close();
        dialog.close();
      } catch (error) {
        $("[data-inspection-sign-status]").textContent = error.message;
      }
    });
    tableBody?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-inspection-action]");
      if (!button) return;
      const record = records.find((item) => getId(item) === button.dataset.id);
      if (!record) return;
      openForm(record);
      if (button.dataset.inspectionAction === "accept") openSign("accept");
    });
    search?.addEventListener("input", renderTable);
    aircraftFilter?.addEventListener("change", renderTable);
    statusFilter?.addEventListener("change", renderTable);
    $("[data-inspection-new]")?.addEventListener("click", () => openForm());
    $("[data-inspection-refresh]")?.addEventListener("click", load);
    $$("[data-inspection-close]").forEach((button) =>
      button.addEventListener("click", () => dialog?.close()),
    );
    $$("[data-inspection-sign-close]").forEach((button) =>
      button.addEventListener("click", () => signDialog?.close()),
    );
    if (kind === "post" || getUserRole() === "pilot" || readOnlyRole())
      $("[data-inspection-new]")?.setAttribute("hidden", "hidden");
    load();
  };

  const initTaskAssignmentPage = () => {
    const page = $("[data-tasks-page]");
    if (!page) return;
    const managerRoles = new Set(["maintenance manager", "superadmin"]);
    const activeOpen = new Set(["pending", "ongoing", "returned"]);
    const isManager = () => managerRoles.has(getUserRole());
    const normalize = (value) =>
      String(value || "")
        .trim()
        .toLowerCase();
    const isTurnedIn = (task) => normalize(task.status) === "turned in";
    const isReviewed = (task) =>
      task.isApproved || normalize(task.status) === "approved";
    const isCompleted = (task) =>
      ["completed", "turned in", "approved"].includes(normalize(task.status));
    const isPastDue = (task) => {
      const value = task.endDateTime || task.dueDate;
      if (!value) return false;
      const due = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return due < today;
    };
    const tableBody = $("[data-task-table]");
    const search = $("[data-task-search]");
    const aircraftFilter = $("[data-task-aircraft]");
    const tabsRoot = $("[data-task-tabs]");
    const countRoot = $("[data-task-count]");
    const formDialog = $("[data-task-form-dialog]");
    const taskForm = $("[data-task-form]");
    const checklistDialog = $("[data-task-checklist-dialog]");
    const checklistForm = $("[data-task-checklist-form]");
    const returnDialog = $("[data-task-return-dialog]");
    const returnForm = $("[data-task-return-form]");
    const approveDialog = $("[data-task-approve-dialog]");
    const approveForm = $("[data-task-approve-form]");
    let tasks = [];
    let users = [];
    let aircraftList = [];
    let schedules = [];
    let activeTab = isManager() ? "assigned" : "upcoming";
    let editingTask = null;
    let selectedTask = null;

    const taskId = (task) => task.id || getId(task);
    const mechanicName = (user) =>
      user.name ||
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      "Mechanic";
    const mechanics = () =>
      users
        .filter(
          (user) =>
            normalize(user.jobTitle) === "mechanic" &&
            normalize(user.status) === "active",
        )
        .map((user) => {
          const id = getId(user);
          const activeTasks = tasks.filter(
            (task) =>
              String(task.assignedTo) === String(id) &&
              activeOpen.has(normalize(task.status)),
          ).length;
          return {
            ...user,
            id,
            name: mechanicName(user),
            isBusy: activeTasks > 0,
          };
        });
    const currentTasks = () =>
      isManager()
        ? tasks
        : tasks.filter(
            (task) => String(task.assignedTo) === String(getUser()?.id),
          );
    const counts = () => {
      const mine = currentTasks();
      return {
        assigned: mine.filter((task) => activeOpen.has(normalize(task.status)))
          .length,
        for_review: mine.filter(
          (task) =>
            isTurnedIn(task) ||
            (normalize(task.status) === "completed" && !task.isApproved),
        ).length,
        reviewed: mine.filter(isReviewed).length,
        upcoming: mine.filter(
          (task) => activeOpen.has(normalize(task.status)) && !isPastDue(task),
        ).length,
        past_due: mine.filter(
          (task) => activeOpen.has(normalize(task.status)) && isPastDue(task),
        ).length,
        completed: mine.filter(
          (task) => normalize(task.status) === "completed" || isTurnedIn(task),
        ).length,
      };
    };
    const tabItems = () => {
      const c = counts();
      return isManager()
        ? [
            ["assigned", `Assigned (${c.assigned})`],
            ["for_review", `For Review (${c.for_review})`],
            ["reviewed", `Reviewed (${c.reviewed})`],
          ]
        : [
            ["upcoming", `Upcoming (${c.upcoming})`],
            ["past_due", `Past Due (${c.past_due})`],
            ["completed", `Completed (${c.completed})`],
          ];
    };
    const displayedTasks = () => {
      const query = String(search?.value || "")
        .trim()
        .toLowerCase();
      const aircraft = aircraftFilter?.value || "all";
      return currentTasks().filter((task) => {
        if (!isManager() && aircraft !== "all" && task.aircraft !== aircraft)
          return false;
        if (activeTab === "assigned" && !activeOpen.has(normalize(task.status)))
          return false;
        if (
          activeTab === "for_review" &&
          !(
            isTurnedIn(task) ||
            (normalize(task.status) === "completed" && !task.isApproved)
          )
        )
          return false;
        if (activeTab === "reviewed" && !isReviewed(task)) return false;
        if (
          activeTab === "upcoming" &&
          !(activeOpen.has(normalize(task.status)) && !isPastDue(task))
        )
          return false;
        if (
          activeTab === "past_due" &&
          !(activeOpen.has(normalize(task.status)) && isPastDue(task))
        )
          return false;
        if (
          activeTab === "completed" &&
          !(normalize(task.status) === "completed" || isTurnedIn(task))
        )
          return false;
        if (!query) return true;
        return [task.id, task.title, task.aircraft, task.assignedToName]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
    };
    const populateAircraft = () => {
      const aircraft = [
        ...new Set(tasks.map((task) => task.aircraft).filter(Boolean)),
      ];
      const current = aircraftFilter.value || "all";
      aircraftFilter.innerHTML = `<option value="all">All Aircraft</option>${aircraft.map((item) => `<option value="${escapeHtml(item)}">RP/C: ${escapeHtml(item)}</option>`).join("")}`;
      aircraftFilter.value = aircraft.includes(current) ? current : "all";
      aircraftFilter.closest(".field").hidden = isManager();
    };
    const renderTabs = () => {
      tabsRoot.innerHTML = tabItems()
        .map(
          ([key, label]) =>
            `<button type="button" class="tab-btn ${key === activeTab ? "active" : ""}" data-task-tab="${key}">${escapeHtml(label)}</button>`,
        )
        .join("");
    };
    const progress = (task) => {
      const items = Array.isArray(task.checklistItems)
        ? task.checklistItems
        : [];
      const state = Array.isArray(task.checklistState)
        ? task.checklistState
        : [];
      if (!items.length) return "0/0";
      return `${state.filter(Boolean).length}/${items.length}`;
    };
    const renderTasks = () => {
      renderTabs();
      const rows = displayedTasks();
      countRoot.textContent = `Showing ${rows.length} task(s)`;
      if (!rows.length) {
        tableBody.innerHTML = `<tr><td colspan="7" class="muted">No tasks found.</td></tr>`;
        return;
      }
      tableBody.innerHTML = rows
        .map((task) => {
          const id = taskId(task);
          const actions = [
            `<button type="button" class="btn small" data-task-action="open" data-id="${escapeHtml(id)}">Checklist</button>`,
          ];
          if (isManager())
            actions.unshift(
              `<button type="button" class="btn small ghost" data-task-action="edit" data-id="${escapeHtml(id)}">Edit</button>`,
            );
          if (isManager())
            actions.push(
              `<button type="button" class="btn small danger" data-task-action="delete" data-id="${escapeHtml(id)}">Delete</button>`,
            );
          return `<tr>
          <td>${escapeHtml(task.title || "Maintenance Task")}</td>
          <td>${escapeHtml(task.aircraft || "-")}</td>
          <td>${escapeHtml(task.assignedToName || "-")}</td>
          <td>${escapeHtml(task.endDateTime || task.dueDate || "-")}</td>
          <td>${escapeHtml(progress(task))}</td>
          <td>${renderStatus(task.status || "Pending")}</td>
          <td><div class="row-actions">${actions.join("")}</div></td>
        </tr>`;
        })
        .join("");
    };
    const load = async () => {
      tableBody.innerHTML = `<tr><td colspan="7" class="muted">Loading tasks...</td></tr>`;
      try {
        const [taskPayload, userPayload, aircraftPayload, schedulePayload] =
          await Promise.all([
            apiFetch("/api/tasks/getAll"),
            apiFetch("/api/user/assignable-users").catch(() => []),
            apiFetch("/api/parts-monitoring/aircraft-list").catch(() => []),
            apiFetch("/api/inspections/schedules").catch(() => []),
          ]);
        tasks = normalizeRows(taskPayload);
        users = normalizeRows(userPayload);
        aircraftList = normalizeRows(aircraftPayload);
        schedules = normalizeRows(schedulePayload);
        populateAircraft();
        renderTasks();
      } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="7" class="muted">${escapeHtml(error.message)}</td></tr>`;
      }
    };
    const fillMechanics = (selected = "") => {
      const options = mechanics().map(
        (item) =>
          `<option value="${escapeHtml(item.id)}" ${String(item.id) === String(selected) ? "selected" : ""}>${escapeHtml(item.name)}${item.isBusy && String(item.id) !== String(selected) ? " (busy)" : ""}</option>`,
      );
      $("[data-task-mechanics]").innerHTML =
        `<option value="">Pick Mechanic</option>${options.join("")}`;
    };
    const openForm = (task = null) => {
      editingTask = task;
      taskForm.reset();
      fillMechanics(task?.assignedTo);
      const aircraftOptions = [
        ...new Set(
          [...aircraftList, ...tasks.map((item) => item.aircraft)].filter(
            Boolean,
          ),
        ),
      ];
      $("[data-task-aircraft-list]").innerHTML = aircraftOptions
        .map((item) => `<option value="${escapeHtml(item)}"></option>`)
        .join("");
      $("[data-task-schedules]").innerHTML =
        `<option value="">Custom Task</option>${schedules.map((schedule) => `<option value="${escapeHtml(getId(schedule))}">${escapeHtml(schedule.name || schedule.inspectionName || schedule.title || getId(schedule))}</option>`).join("")}`;
      $("[data-task-form-title]").textContent = task
        ? "Edit Task Assignment"
        : "Create Task Assignment";
      [
        "title",
        "aircraft",
        "assignedTo",
        "priority",
        "maintenanceType",
        "status",
        "inspectionSchedule",
      ].forEach((key) => {
        if (taskForm[key])
          taskForm[key].value =
            task?.[key] ||
            task?.inspectionId ||
            (key === "priority" ? "Normal" : key === "status" ? "Pending" : "");
      });
      ["startDateTime", "endDateTime"].forEach((key) => {
        if (task?.[key])
          taskForm[key].value = new Date(task[key]).toISOString().slice(0, 16);
      });
      taskForm.checklistText.value =
        (task?.checklistItems || [])
          .map((item) => item.taskName || item.description || item)
          .join("\n") || "Visual inspection";
      $("[data-task-form-status]").textContent = "";
      formDialog.showModal();
    };
    const collectTask = () => {
      const body = Object.fromEntries(new FormData(taskForm).entries());
      const assignee = mechanics().find(
        (item) => String(item.id) === String(body.assignedTo),
      );
      const checklistItems = String(body.checklistText || "")
        .split(/\r?\n/)
        .map((line, index) =>
          line.trim()
            ? {
                taskId: `custom-${Date.now()}-${index + 1}`,
                taskName: line.trim(),
                inspectionTypeFull: body.maintenanceType || "Custom Task",
              }
            : null,
        )
        .filter(Boolean);
      delete body.checklistText;
      body.id = editingTask?.id || editingTask?._id || Date.now().toString();
      body.inspectionId =
        body.inspectionSchedule || editingTask?.inspectionId || "";
      body.assignedToName = assignee?.name || editingTask?.assignedToName || "";
      body.dueDate = body.endDateTime;
      body.checklistItems = checklistItems;
      body.checklistState = Array.isArray(editingTask?.checklistState)
        ? editingTask.checklistState.slice(0, checklistItems.length)
        : checklistItems.map(() => false);
      return body;
    };
    const upsert = async (task) => {
      const id = getId(task);
      const data = await apiFetch(
        id && tasks.some((item) => getId(item) === id)
          ? `/api/tasks/${encodeURIComponent(id)}`
          : "/api/tasks/create",
        {
          method:
            id && tasks.some((item) => getId(item) === id) ? "PUT" : "POST",
          body: JSON.stringify({ ...task, confirmAction: true }),
        },
      );
      await load();
      return data.data;
    };
    const openChecklist = (task) => {
      selectedTask = structuredClone(task);
      $("[data-task-checklist-title]").textContent =
        selectedTask.title || "Task Checklist";
      $("[data-task-meta]").textContent =
        `Aircraft: ${selectedTask.aircraft || "-"} | Due: ${selectedTask.endDateTime || selectedTask.dueDate || "-"}`;
      const returnNote = $("[data-task-return-note]");
      returnNote.hidden = !selectedTask.returnComments;
      returnNote.innerHTML = selectedTask.returnComments
        ? `<strong>Returned for Rework:</strong> ${escapeHtml(selectedTask.returnComments)}`
        : "";
      const items = selectedTask.checklistItems || [];
      const state = Array.isArray(selectedTask.checklistState)
        ? selectedTask.checklistState
        : items.map(() => false);
      $("[data-task-checklist]").innerHTML =
        items
          .map(
            (item, index) =>
              `<label class="check-item"><input type="checkbox" name="item-${index}" ${state[index] ? "checked" : ""} ${isManager() || isTurnedIn(selectedTask) || isReviewed(selectedTask) ? "disabled" : ""} /> <span><strong>${escapeHtml(item.taskName || "Checklist item")}</strong><br><span class="muted">${escapeHtml(item.documentation || item.description || item.inspectionTypeFull || "")}</span></span></label>`,
          )
          .join("") || `<p class="muted">No checklist items.</p>`;
      checklistForm.findings.value = selectedTask.findings || "";
      $("[data-task-findings-field]").hidden =
        isManager() || normalize(selectedTask.status) === "pending";
      const actions = [];
      if (
        isManager() &&
        isTurnedIn(selectedTask) &&
        !isReviewed(selectedTask)
      ) {
        actions.push(
          `<button type="button" class="btn danger" data-task-checklist-action="return">Return</button>`,
        );
        actions.push(
          `<button type="button" class="btn" data-task-checklist-action="approve">Approve</button>`,
        );
      }
      if (!isManager() && normalize(selectedTask.status) === "pending")
        actions.push(
          `<button type="button" class="btn" data-task-checklist-action="start">Start Task</button>`,
        );
      if (
        !isManager() &&
        ["ongoing", "returned"].includes(normalize(selectedTask.status))
      )
        actions.push(
          `<button type="button" class="btn" data-task-checklist-action="save">Save / Turn In</button>`,
        );
      if (
        !isManager() &&
        (isTurnedIn(selectedTask) ||
          normalize(selectedTask.status) === "completed") &&
        !isReviewed(selectedTask)
      )
        actions.push(
          `<button type="button" class="btn ghost" data-task-checklist-action="undo">Undo Turn In</button>`,
        );
      $("[data-task-checklist-actions]").innerHTML =
        `<button type="button" class="btn ghost" data-task-checklist-close>Close</button>${actions.join("")}`;
      $$("[data-task-checklist-close]").forEach((button) =>
        button.addEventListener("click", () => checklistDialog.close()),
      );
      $("[data-task-checklist-status]").textContent = "";
      checklistDialog.showModal();
    };
    const saveChecklist = async (turnIn = false, undo = false) => {
      const items = selectedTask.checklistItems || [];
      const state = items.map((_, index) =>
        Boolean(checklistForm.querySelector(`[name="item-${index}"]`)?.checked),
      );
      if (turnIn && state.some((value) => !value)) {
        $("[data-task-checklist-status]").textContent =
          "Please complete all checklist items before turning in.";
        return;
      }
      selectedTask.checklistState = state;
      selectedTask.findings = checklistForm.findings.value;
      selectedTask.status = undo
        ? "Ongoing"
        : turnIn
          ? "Turned in"
          : selectedTask.status;
      selectedTask.completedAt = undo
        ? null
        : turnIn
          ? new Date().toISOString()
          : selectedTask.completedAt;
      await upsert(selectedTask);
      checklistDialog.close();
    };

    taskForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await upsert({ ...(editingTask || {}), ...collectTask() });
        formDialog.close();
      } catch (error) {
        $("[data-task-form-status]").textContent = error.message;
      }
    });
    $("[data-task-schedules]")?.addEventListener("change", async (event) => {
      const scheduleId = event.target.value;
      if (!scheduleId) return;
      try {
        const schedule =
          schedules.find((item) => getId(item) === scheduleId) || {};
        const templatePayload = await apiFetch(
          `/api/inspections/tasks?inspectionId=${encodeURIComponent(scheduleId)}`,
        ).catch(() => []);
        const templateRows = normalizeRows(templatePayload);
        taskForm.title.value =
          schedule.name ||
          schedule.inspectionName ||
          schedule.title ||
          taskForm.title.value ||
          "Inspection Task";
        taskForm.maintenanceType.value = "Inspection";
        if (!taskForm.aircraft.value && schedule.aircraft)
          taskForm.aircraft.value = schedule.aircraft;
        if (templateRows.length) {
          taskForm.checklistText.value = templateRows
            .map(
              (item) =>
                item.taskName || item.description || item.name || item.title,
            )
            .filter(Boolean)
            .join("\n");
        }
      } catch (error) {
        $("[data-task-form-status]").textContent = error.message;
      }
    });
    checklistForm?.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-task-checklist-action]");
      if (!button) return;
      try {
        if (button.dataset.taskChecklistAction === "start") {
          selectedTask.status = "Ongoing";
          selectedTask.startDateTime = new Date().toISOString();
          await upsert(selectedTask);
          checklistDialog.close();
        }
        if (button.dataset.taskChecklistAction === "save") {
          const items = selectedTask.checklistItems || [];
          const allChecked =
            items.length &&
            items.every(
              (_, index) =>
                checklistForm.querySelector(`[name="item-${index}"]`)?.checked,
            );
          await saveChecklist(Boolean(allChecked), false);
        }
        if (button.dataset.taskChecklistAction === "undo")
          await saveChecklist(false, true);
        if (button.dataset.taskChecklistAction === "return") {
          const checkedItems = (selectedTask.checklistItems || [])
            .map((item, index) => ({ item, index }))
            .filter(({ index }) => selectedTask.checklistState?.[index]);
          $("[data-task-return-items]").innerHTML = checkedItems
            .map(
              ({ item, index }) =>
                `<label class="check-item"><input type="checkbox" name="return-${index}" checked /> ${escapeHtml(item.taskName || "Checklist item")}</label>`,
            )
            .join("");
          $("[data-task-return-status]").textContent = "";
          returnDialog.showModal();
        }
        if (button.dataset.taskChecklistAction === "approve") {
          $("[data-task-approve-status]").textContent = "";
          approveForm.reset();
          approveDialog.showModal();
        }
      } catch (error) {
        $("[data-task-checklist-status]").textContent = error.message;
      }
    });
    returnForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const nextState = [...(selectedTask.checklistState || [])];
      nextState.forEach((_, index) => {
        const input = returnForm.querySelector(`[name="return-${index}"]`);
        if (input && !input.checked) nextState[index] = false;
      });
      selectedTask.status = "Returned";
      selectedTask.isApproved = false;
      selectedTask.returnComments = returnForm.reviewNote.value;
      selectedTask.returnedAt = new Date().toISOString();
      selectedTask.reviewedAt = new Date().toISOString();
      selectedTask.checklistState = nextState;
      try {
        await upsert(selectedTask);
        returnDialog.close();
        checklistDialog.close();
      } catch (error) {
        $("[data-task-return-status]").textContent = error.message;
      }
    });
    approveForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await verifyCurrentUserPin(approveForm.pin.value);
        selectedTask.status = "Approved";
        selectedTask.isApproved = true;
        selectedTask.approvedBy =
          [getUser()?.firstName, getUser()?.lastName]
            .filter(Boolean)
            .join(" ") ||
          getUser()?.username ||
          "Maintenance Manager";
        selectedTask.approvedSignature = approveForm.signature.value;
        selectedTask.approvedAt = new Date().toISOString();
        selectedTask.reviewedAt = new Date().toISOString();
        await upsert(selectedTask);
        approveDialog.close();
        checklistDialog.close();
      } catch (error) {
        $("[data-task-approve-status]").textContent = error.message;
      }
    });
    tableBody?.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-task-action]");
      if (!button) return;
      const task = tasks.find(
        (item) =>
          taskId(item) === button.dataset.id ||
          getId(item) === button.dataset.id,
      );
      if (!task) return;
      if (button.dataset.taskAction === "open") openChecklist(task);
      if (button.dataset.taskAction === "edit") openForm(task);
      if (
        button.dataset.taskAction === "delete" &&
        confirm("Delete this task?")
      ) {
        await apiFetch(`/api/tasks/${encodeURIComponent(getId(task))}`, {
          method: "DELETE",
        });
        await load();
      }
    });
    tabsRoot?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-task-tab]");
      if (!button) return;
      activeTab = button.dataset.taskTab;
      renderTasks();
    });
    search?.addEventListener("input", renderTasks);
    aircraftFilter?.addEventListener("change", renderTasks);
    $("[data-task-new]")?.addEventListener("click", () => openForm());
    $("[data-task-refresh]")?.addEventListener("click", load);
    $$("[data-task-form-close]").forEach((button) =>
      button.addEventListener("click", () => formDialog.close()),
    );
    $$("[data-task-return-close]").forEach((button) =>
      button.addEventListener("click", () => returnDialog.close()),
    );
    $$("[data-task-approve-close]").forEach((button) =>
      button.addEventListener("click", () => approveDialog.close()),
    );
    if (!isManager()) $("[data-task-new]")?.setAttribute("hidden", "hidden");
    if (typeof EventSource !== "undefined") {
      const stream = new EventSource("/api/events/stream");
      const refreshFromStream = () => load().catch(() => {});
      stream.onmessage = refreshFromStream;
      stream.addEventListener("data-changed", refreshFromStream);
      window.addEventListener("beforeunload", () => stream.close());
    }
    load();
  };

  const initMechanicsPage = () => {
    const page = $("[data-mechanics-page]");
    if (!page) return;
    const tableHead = $("[data-mechanic-head]");
    const tableBody = $("[data-mechanic-table]");
    const search = $("[data-mechanic-search]");
    const back = $("[data-mechanic-back]");
    const detail = $("[data-mechanic-detail]");
    const tabs = $("[data-mechanic-tabs]");
    let users = [];
    let tasks = [];
    let selected = null;
    let tab = "ongoing";
    const isCompletedTask = (task) =>
      ["completed", "turned in", "approved"].includes(
        String(task?.status || "").toLowerCase(),
      );
    const mechanicName = (user) =>
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.name ||
      user.username ||
      "Mechanic";
    const mechanics = () =>
      users
        .filter(
          (item) =>
            String(item.jobTitle || "").toLowerCase() === "mechanic" &&
            String(item.status || "").toLowerCase() === "active",
        )
        .map((item) => {
          const id = getId(item);
          const assigned = tasks.filter(
            (task) => String(task.assignedTo) === String(id),
          );
          const activeTasks = assigned.filter(
            (task) => !isCompletedTask(task),
          ).length;
          const isOnline = Boolean(item?.isOnline ?? item?.online);
          return {
            ...item,
            id,
            name: mechanicName(item),
            activeTasks,
            isOnline,
            platform: item.platform || "unknown",
            availability: isOnline
              ? activeTasks >= 3
                ? "Busy"
                : "Available"
              : "Offline",
          };
        })
        .filter(
          (item) =>
            !search.value.trim() ||
            item.name.toLowerCase().includes(search.value.trim().toLowerCase()),
        );
    const selectedTasks = () => {
      if (!selected) return [];
      return tasks
        .filter((task) => String(task.assignedTo) === String(selected.id))
        .filter((task) =>
          tab === "completed" ? isCompletedTask(task) : !isCompletedTask(task),
        );
    };
    const render = () => {
      if (selected) {
        const assigned = tasks.filter(
          (task) => String(task.assignedTo) === String(selected.id),
        );
        const ongoing = assigned.filter(
          (task) => !isCompletedTask(task),
        ).length;
        const completed = assigned.filter(isCompletedTask).length;
        detail.hidden = false;
        detail.innerHTML = `<h3>${escapeHtml(selected.name)}</h3><p class="muted">${escapeHtml(selected.jobTitle || "Mechanic")} | ${selected.isOnline ? "Online" : "Offline"} | ${escapeHtml(selected.platform)}</p>`;
        tabs.hidden = false;
        tabs.innerHTML = `<button type="button" class="tab-btn ${tab === "ongoing" ? "active" : ""}" data-mechanic-tab="ongoing">Ongoing (${ongoing})</button><button type="button" class="tab-btn ${tab === "completed" ? "active" : ""}" data-mechanic-tab="completed">Completed (${completed})</button>`;
        back.hidden = false;
        tableHead.innerHTML = `<tr><th>Task</th><th>Aircraft</th><th>Due</th><th>Status</th></tr>`;
        const rows = selectedTasks();
        tableBody.innerHTML = rows.length
          ? rows
              .map(
                (task) =>
                  `<tr><td>${escapeHtml(task.title || "-")}</td><td>${escapeHtml(task.aircraft || "-")}</td><td>${escapeHtml(task.endDateTime || task.dueDate || "-")}</td><td>${renderStatus(task.status || "-")}</td></tr>`,
              )
              .join("")
          : `<tr><td colspan="4" class="muted">No tasks found.</td></tr>`;
        return;
      }
      detail.hidden = true;
      tabs.hidden = true;
      back.hidden = true;
      tableHead.innerHTML = `<tr><th>Name</th><th>Job Title</th><th>Platform</th><th>Active Tasks</th><th>Status</th></tr>`;
      const rows = mechanics();
      tableBody.innerHTML = rows.length
        ? rows
            .map(
              (mechanic) =>
                `<tr data-mechanic-id="${escapeHtml(mechanic.id)}"><td>${escapeHtml(mechanic.name)}</td><td>${escapeHtml(mechanic.jobTitle || "-")}</td><td>${escapeHtml(mechanic.platform)}</td><td>${mechanic.activeTasks}</td><td>${renderStatus(mechanic.availability)}</td></tr>`,
            )
            .join("")
        : `<tr><td colspan="5" class="muted">No mechanics found.</td></tr>`;
    };
    const load = async () => {
      tableBody.innerHTML = `<tr><td class="muted">Loading mechanics...</td></tr>`;
      try {
        const [userPayload, taskPayload] = await Promise.all([
          apiFetch("/api/user/assignable-users"),
          apiFetch("/api/tasks/getAll"),
        ]);
        users = normalizeRows(userPayload);
        tasks = normalizeRows(taskPayload);
        render();
      } catch (error) {
        tableBody.innerHTML = `<tr><td class="muted">${escapeHtml(error.message)}</td></tr>`;
      }
    };
    tableBody?.addEventListener("click", (event) => {
      const row = event.target.closest("[data-mechanic-id]");
      if (!row) return;
      selected = mechanics().find(
        (item) => String(item.id) === String(row.dataset.mechanicId),
      );
      tab = "ongoing";
      render();
    });
    tabs?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mechanic-tab]");
      if (!button) return;
      tab = button.dataset.mechanicTab;
      render();
    });
    back?.addEventListener("click", () => {
      selected = null;
      render();
    });
    search?.addEventListener("input", render);
    $("[data-mechanic-refresh]")?.addEventListener("click", load);
    load();
  };

  const initMaintenanceLogPage = () => {
    const page = $("[data-maintenance-log-page]");
    if (!page) return;
    const search = $("[data-maintenance-search]");
    const aircraftRoot = $("[data-maintenance-aircraft]");
    const detail = $("[data-maintenance-aircraft-detail]");
    const workorders = $("[data-maintenance-workorders]");
    const workorderTable = $("[data-maintenance-workorder-table]");
    const report = $("[data-maintenance-report]");
    const back = $("[data-maintenance-back]");
    const exportButton = $("[data-maintenance-export]");
    const seenKey = "maintenanceLogSeenIds";
    let entries = [];
    let view = "dashboard";
    let selectedAircraft = null;
    let selectedWO = null;
    const seen = () => {
      try {
        return new Set(JSON.parse(localStorage.getItem(seenKey) || "[]"));
      } catch {
        return new Set();
      }
    };
    const persistSeen = (next) =>
      localStorage.setItem(seenKey, JSON.stringify([...next]));
    const stableId = (entry) =>
      String(entry.sourceTaskId || entry.id || entry._id || "");
    const normalizedEntries = () =>
      entries.map((entry) => {
        const workDetails =
          Array.isArray(entry.workDetails) && entry.workDetails.length
            ? entry.workDetails
            : [
                entry.correctiveActionDone
                  ? { description: entry.correctiveActionDone }
                  : null,
                entry.defects ? { description: entry.defects } : null,
                entry.taskTitle
                  ? { description: `Reference task: ${entry.taskTitle}` }
                  : null,
              ].filter(Boolean);
        return {
          ...entry,
          id: entry.sourceTaskId || entry._id,
          type: "Task Assignment",
          sn: String(entry.aircraft || "").replace(/[^\d]/g, "") || "N/A",
          workDetails,
        };
      });
    const filtered = () => {
      const q = String(search.value || "")
        .trim()
        .toLowerCase();
      const rows = normalizedEntries();
      if (!q) return rows;
      return rows.filter((entry) =>
        [
          entry.aircraft,
          entry.taskTitle,
          entry.defects,
          entry.correctiveActionDone,
          entry.reportedBy,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    };
    const showDashboard = () => {
      view = "dashboard";
      selectedAircraft = null;
      selectedWO = null;
      back.hidden = true;
      exportButton.hidden = true;
      detail.hidden = true;
      workorders.hidden = true;
      report.hidden = true;
      aircraftRoot.hidden = false;
      const rows = filtered();
      const aircraft = [
        ...new Set(rows.map((entry) => entry.aircraft).filter(Boolean)),
      ];
      if (!aircraft.length) {
        aircraftRoot.innerHTML = `<section class="card"><p class="muted">No maintenance logs found yet. Approved task-assignment records will appear here automatically.</p></section>`;
        return;
      }
      const seenSet = seen();
      aircraftRoot.innerHTML = aircraft
        .map((reg) => {
          const logs = rows.filter((entry) => entry.aircraft === reg);
          const newCount = logs.filter(
            (entry) => stableId(entry) && !seenSet.has(stableId(entry)),
          ).length;
          return `<button type="button" class="card aircraft-card" data-aircraft="${escapeHtml(reg)}"><h3>${escapeHtml(reg)} ${newCount ? `<span class="new-badge">${newCount} NEW</span>` : ""}</h3><p class="muted">SOURCE: ${escapeHtml(logs[0]?.type || "Task Assignment")}</p><p class="muted">ENTRIES: ${logs.length}</p></button>`;
        })
        .join("");
    };
    const showAircraft = (reg) => {
      view = "aircraft";
      const rows = filtered().filter((entry) => entry.aircraft === reg);
      const seenSet = seen();
      rows.forEach((entry) => {
        if (stableId(entry)) seenSet.add(stableId(entry));
      });
      persistSeen(seenSet);
      selectedAircraft = { aircraft: reg, entries: rows, ...rows[0] };
      aircraftRoot.hidden = true;
      report.hidden = true;
      detail.hidden = false;
      workorders.hidden = false;
      back.hidden = false;
      exportButton.hidden = true;
      detail.innerHTML = `<h3>${escapeHtml(reg)}</h3><p class="muted">Completed task records synced to maintenance logs</p><div class="card-grid"><div class="card"><span class="muted">Reported By</span><strong>${escapeHtml(selectedAircraft.reportedBy || "N/A")}</strong></div><div class="card"><span class="muted">Status</span><strong>${escapeHtml(selectedAircraft.status || "N/A")}</strong></div><div class="card"><span class="muted">ACFT S/N</span><strong>${escapeHtml(selectedAircraft.sn || "N/A")}</strong></div><div class="card"><span class="muted">Work Orders</span><strong>${rows.length}</strong></div></div>`;
      workorderTable.innerHTML = rows
        .map(
          (entry) =>
            `<tr data-workorder="${escapeHtml(stableId(entry))}"><td>${escapeHtml(entry.id || "N/A")}</td><td>${escapeHtml(entry.dateDefectRectified ? new Date(entry.dateDefectRectified).toLocaleDateString("en-US") : "N/A")}</td><td>${escapeHtml(entry.taskTitle || "-")}</td><td>${renderStatus(entry.status || "-")}</td></tr>`,
        )
        .join("");
    };
    const showReport = (id) => {
      selectedWO = (selectedAircraft?.entries || []).find(
        (entry) => stableId(entry) === id,
      );
      if (!selectedWO) return;
      view = "report";
      detail.hidden = true;
      workorders.hidden = true;
      report.hidden = false;
      exportButton.hidden = false;
      report.innerHTML = `<h3>WORK DONE REPORT / CERTIFICATE OF RETURN TO SERVICE</h3>
        <dl class="profile-list"><dt>Aircraft</dt><dd>${escapeHtml(selectedWO.aircraft || "-")}</dd><dt>Task ID</dt><dd>${escapeHtml(selectedWO.sourceTaskId || selectedWO.id || "-")}</dd><dt>Reported By</dt><dd>${escapeHtml(selectedWO.reportedBy || "-")}</dd><dt>Task Status</dt><dd>${escapeHtml(selectedWO.sourceTaskStatus || "-")}</dd><dt>Rectified</dt><dd>${escapeHtml(selectedWO.dateDefectRectified ? new Date(selectedWO.dateDefectRectified).toLocaleDateString("en-US") : "N/A")}</dd><dt>Task Title</dt><dd>${escapeHtml(selectedWO.taskTitle || "-")}</dd></dl>
        <table class="table"><thead><tr><th>Description Of Work</th></tr></thead><tbody>${(selectedWO.workDetails || []).map((item) => `<tr><td>${escapeHtml(item.description || item)}</td></tr>`).join("")}</tbody></table>`;
    };
    const exportMaintenanceReport = async () => {
      if (!selectedWO) return;
      let aircraftData = null;
      try {
        aircraftData = await apiFetch(
          `/api/parts-monitoring/${encodeURIComponent(selectedWO.aircraft)}`,
        ).then((payload) => payload.data || payload);
      } catch {
        aircraftData = null;
      }
      const win = window.open("", "_blank", "noopener,noreferrer");
      if (!win) return;
      const workRows = (
        Array.isArray(selectedWO.workDetails) && selectedWO.workDetails.length
          ? selectedWO.workDetails
          : [
              {
                description:
                  selectedWO.correctiveActionDone || selectedWO.defects || "",
              },
            ]
      )
        .map(
          (item, index) =>
            `<tr><td>${index + 1}</td><td>${escapeHtml(item.description || item || "")}</td></tr>`,
        )
        .join("");
      const displayDate = (value) => {
        if (!value) return "N/A";
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime())
          ? String(value)
          : parsed.toLocaleDateString("en-US");
      };
      win.document
        .write(`<!doctype html><html><head><title>Maintenance Log ${escapeHtml(selectedWO.sourceTaskId || selectedWO.id || "")}</title><style>
        body{font-family:Arial,sans-serif;margin:24px;color:#111;font-size:12px} h1{font-size:18px;text-align:center;margin:0 0 4px} h2{font-size:14px;margin:18px 0 8px}.meta{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #222;border-bottom:0}.meta div{border-right:1px solid #222;border-bottom:1px solid #222;padding:7px;min-height:34px}.meta div:nth-child(4n){border-right:0}.label{display:block;font-size:10px;color:#555;text-transform:uppercase;margin-bottom:3px} table{width:100%;border-collapse:collapse;margin-top:10px} th,td{border:1px solid #222;padding:7px;vertical-align:top} th{background:#f1f5f9;text-align:left}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:38px}.sig{border-top:1px solid #111;text-align:center;padding-top:6px}.muted{color:#667085}@media print{button{display:none}body{margin:12mm}}
      </style></head><body>
        <h1>WORK DONE REPORT / CERTIFICATE OF RETURN TO SERVICE</h1>
        <p class="muted" style="text-align:center">Generated ${escapeHtml(new Date().toLocaleString())}</p>
        <section class="meta">
          <div><span class="label">Aircraft</span>${escapeHtml(selectedWO.aircraft || "N/A")}</div>
          <div><span class="label">Aircraft Type</span>${escapeHtml(aircraftData?.aircraftType || selectedWO.aircraftType || "N/A")}</div>
          <div><span class="label">Serial No.</span>${escapeHtml(aircraftData?.serialNumber || selectedWO.sn || "N/A")}</div>
          <div><span class="label">Work Order</span>${escapeHtml(selectedWO.sourceTaskId || selectedWO.id || selectedWO._id || "N/A")}</div>
          <div><span class="label">Reported By</span>${escapeHtml(selectedWO.reportedBy || "N/A")}</div>
          <div><span class="label">Mechanic</span>${escapeHtml(selectedWO.mechanic || selectedWO.assignedToName || "N/A")}</div>
          <div><span class="label">Status</span>${escapeHtml(selectedWO.sourceTaskStatus || selectedWO.status || "N/A")}</div>
          <div><span class="label">Date Rectified</span>${escapeHtml(displayDate(selectedWO.dateDefectRectified || selectedWO.updatedAt))}</div>
        </section>
        <h2>Task Details</h2>
        <table><tbody>
          <tr><th>Task Title</th><td>${escapeHtml(selectedWO.taskTitle || "N/A")}</td></tr>
          <tr><th>Defects / Findings</th><td>${escapeHtml(selectedWO.defects || selectedWO.findings || "N/A")}</td></tr>
          <tr><th>Corrective Action</th><td>${escapeHtml(selectedWO.correctiveActionDone || "N/A")}</td></tr>
        </tbody></table>
        <h2>Description of Work</h2>
        <table><thead><tr><th style="width:48px">No.</th><th>Work Performed</th></tr></thead><tbody>${workRows || `<tr><td></td><td></td></tr>`}</tbody></table>
        <section class="signatures"><div class="sig">Prepared / Mechanic</div><div class="sig">Approved / Maintenance Manager</div></section>
        <script>window.onload=()=>window.print();<\/script>
      </body></html>`);
      win.document.close();
    };
    const load = async () => {
      aircraftRoot.innerHTML = `<section class="card"><p class="muted">Loading maintenance logs...</p></section>`;
      try {
        entries = normalizeRows(
          await apiFetch("/api/maintenance-logs/getAllMaintenanceLog"),
        );
        showDashboard();
      } catch (error) {
        aircraftRoot.innerHTML = `<section class="card"><p class="muted">${escapeHtml(error.message)}</p></section>`;
      }
    };
    aircraftRoot?.addEventListener("click", (event) => {
      const card = event.target.closest("[data-aircraft]");
      if (card) showAircraft(card.dataset.aircraft);
    });
    workorderTable?.addEventListener("click", (event) => {
      const row = event.target.closest("[data-workorder]");
      if (row) showReport(row.dataset.workorder);
    });
    back?.addEventListener("click", () => {
      if (view === "report") showAircraft(selectedAircraft.aircraft);
      else showDashboard();
    });
    exportButton?.addEventListener("click", () =>
      exportMaintenanceReport().catch((error) => alert(error.message)),
    );
    search?.addEventListener("input", showDashboard);
    $("[data-maintenance-refresh]")?.addEventListener("click", load);
    load();
  };

  const initPartsLifespanPage = () => {
    const page = $("[data-parts-lifespan-page]");
    if (!page) return;
    const aircraftSelect = $("[data-parts-aircraft]");
    const search = $("[data-parts-search]");
    const tableBody = $("[data-parts-table]");
    const detailsRoot = $("[data-aircraft-details]");
    let selectedAircraft = "";
    let currentDoc = null;
    let parts = [];
    let referenceData = {};
    const editablePartColumns = new Set([
      "dateCW",
      "hoursCW",
      "timeSinceInstall",
      "totalTimeSinceNew",
    ]);
    const exportColumns = [
      [
        "componentName",
        "DUE Indicates Items Due Within 30 Hours, 30 Days, or 30 Cycles/Landings",
      ],
      ["hourLimit1", "HOUR/ CYC LIMIT"],
      ["hourLimit2", "H/C/OC"],
      ["dayLimit", "DAY LIMIT"],
      ["dayType", "D/OC"],
      ["dateCW", "DATE C/W mm/dd/yr"],
      ["hoursCW", "HRS C/W"],
      ["daysRemaining", "DAYS REMAINING"],
      ["timeRemaining", "TIME/CYC REMAINING"],
      ["dateDue", "DATE DUE"],
      ["ttCycleDue", "TT/CYC DUE"],
      ["due", "DUE"],
      ["hd", "H/D"],
      ["timeSinceInstall", "TIME SINCE INSTALLATION"],
      ["totalTimeSinceNew", "TOTAL TIME SINCE NEW"],
    ];
    const defaultRefs = () => ({
      today: new Date().toISOString().slice(0, 10),
      acftTT: 0,
      engTT: 0,
      n1Cycles: 0,
      n2Cycles: 0,
      landings: 0,
    });
    const normalizePart = (part, index) => ({
      _id: part._id || part.id || `part-${index}`,
      ...part,
    });
    const toNumber = (value) => {
      if (value === null || value === undefined || value === "") return null;
      const number = Number(String(value).replace(/,/g, ""));
      return Number.isFinite(number) ? number : null;
    };
    const dateInputValue = (value) => {
      if (!value) return "";
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? String(value)
        : date.toISOString().slice(0, 10);
    };
    const computeTimeRemaining = (part) => {
      const stored = toNumber(part.timeRemaining ?? part.remainingHours);
      const limit = toNumber(
        part.hourLimit2 ?? part.hourLimit1 ?? part.ttCycleDue,
      );
      const hoursCW = toNumber(part.hoursCW);
      const acftTT = toNumber(referenceData.acftTT);
      if (limit !== null && hoursCW !== null && acftTT !== null)
        return Number((limit - (acftTT - hoursCW)).toFixed(2));
      return stored ?? "";
    };
    const remainingDays = (part) => {
      const value = Number(part.daysRemaining ?? part.remainingDays);
      if (Number.isFinite(value)) return value;
      if (part.dateDue) {
        const today = new Date(referenceData.today || Date.now());
        const diff = Math.ceil(
          (new Date(part.dateDue).getTime() - today.getTime()) / 86400000,
        );
        return Number.isFinite(diff) ? diff : "";
      }
      return "";
    };
    const dueText = (part) => {
      const days = Number(remainingDays(part));
      const hours = Number(computeTimeRemaining(part));
      const existingDue = String(part.due || "")
        .trim()
        .toUpperCase();
      if (
        (Number.isFinite(days) && days <= 0) ||
        (Number.isFinite(hours) && hours <= 0) ||
        existingDue === "DUE"
      )
        return "DUE";
      if (
        (Number.isFinite(days) && days <= 30) ||
        (Number.isFinite(hours) && hours <= 30)
      )
        return "Due Soon";
      return "";
    };
    const computedPart = (part) => ({
      ...part,
      daysRemaining: remainingDays(part),
      timeRemaining: computeTimeRemaining(part),
      due: dueText(part),
    });
    const filteredParts = () => {
      const q = String(search.value || "")
        .trim()
        .toLowerCase();
      if (!q) return parts;
      return parts.filter((part) =>
        [part.componentName, part.partName, part.component, dueText(part)]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    };
    const syncRefsToInputs = () => {
      $$("[data-ref]").forEach((input) => {
        const key = input.dataset.ref;
        input.value =
          key === "today"
            ? String(referenceData.today || new Date().toISOString()).slice(
                0,
                10,
              )
            : (referenceData[key] ?? "");
      });
    };
    const collectRefs = () => {
      $$("[data-ref]").forEach((input) => {
        referenceData[input.dataset.ref] =
          input.type === "number" ? Number(input.value || 0) : input.value;
      });
      return referenceData;
    };
    const renderDetails = () => {
      const details = {
        aircraft: selectedAircraft || "Not selected",
        dateManufactured: currentDoc?.dateManufactured
          ? new Date(currentDoc.dateManufactured).toLocaleDateString()
          : "Not available",
        aircraftType: currentDoc?.aircraftType || "Not available",
        creepDamage:
          currentDoc?.creepDamage != null
            ? `${currentDoc.creepDamage}%`
            : "Not available",
        serialNumber: currentDoc?.serialNumber || "Not available",
      };
      detailsRoot.innerHTML = Object.entries(details)
        .map(
          ([key, value]) =>
            `<dt>${escapeHtml(labelize(key))}</dt><dd>${escapeHtml(value)}</dd>`,
        )
        .join("");
    };
    const renderTable = () => {
      const rows = filteredParts();
      if (!selectedAircraft) {
        tableBody.innerHTML = `<tr><td colspan="12" class="muted">Select an aircraft.</td></tr>`;
        return;
      }
      if (!rows.length) {
        tableBody.innerHTML = `<tr><td colspan="12" class="muted">No parts rows found.</td></tr>`;
        return;
      }
      tableBody.innerHTML = rows
        .map((rawPart) => {
          const part = computedPart(rawPart);
          const due = part.due;
          const editableCell = (key, type = "text") =>
            editablePartColumns.has(key)
              ? `<input class="table-input" type="${type}" value="${escapeHtml(type === "date" ? dateInputValue(part[key]) : part[key] || "")}" data-part-edit="${escapeHtml(part._id)}" data-part-key="${key}" />`
              : escapeHtml(part[key] || "-");
          return `<tr>
          <td>${escapeHtml(part.componentName || part.partName || part.component || "-")}</td>
          <td>${escapeHtml([part.hourLimit1, part.hourLimit2].filter(Boolean).join(" / ") || "-")}</td>
          <td>${escapeHtml(part.dayLimit || "-")}</td>
          <td>${editableCell("dateCW", "date")}</td>
          <td>${editableCell("hoursCW", "number")}</td>
          <td class="${Number(remainingDays(part)) <= 30 ? "due-cell" : ""}">${escapeHtml(remainingDays(part))}</td>
          <td class="${Number(part.timeRemaining) <= 30 ? "due-cell" : ""}">${escapeHtml(part.timeRemaining ?? "-")}</td>
          <td>${escapeHtml(part.dateDue || "-")}</td>
          <td>${escapeHtml(part.ttCycleDue || "-")}</td>
          <td>${due ? renderStatus(due) : ""}</td>
          <td>${editableCell("timeSinceInstall", "number")}</td>
          <td>${editableCell("totalTimeSinceNew", "number")}</td>
        </tr>`;
        })
        .join("");
    };
    const loadAircraftList = async () => {
      const payload = await apiFetch("/api/parts-monitoring/aircraft-list");
      const aircraft = normalizeRows(payload);
      aircraftSelect.innerHTML = `<option value="">Select aircraft</option>${aircraft.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
    };
    const loadAircraft = async (aircraft) => {
      selectedAircraft = aircraft;
      if (!aircraft) {
        currentDoc = null;
        parts = [];
        referenceData = defaultRefs();
        renderDetails();
        renderTable();
        syncRefsToInputs();
        return;
      }
      tableBody.innerHTML = `<tr><td colspan="12" class="muted">Loading parts data...</td></tr>`;
      try {
        currentDoc = await apiFetch(
          `/api/parts-monitoring/${encodeURIComponent(aircraft)}`,
        ).then((payload) => payload.data || payload);
        parts = (currentDoc.parts || []).map(normalizePart);
        referenceData = {
          ...defaultRefs(),
          ...(currentDoc.referenceData || {}),
        };
      } catch {
        currentDoc = { aircraft };
        parts = [];
        referenceData = defaultRefs();
      }
      renderDetails();
      syncRefsToInputs();
      renderTable();
    };
    $("[data-parts-save]")?.addEventListener("click", async () => {
      if (!selectedAircraft) return alert("Select an aircraft first.");
      try {
        currentDoc = await apiFetch("/api/parts-monitoring/save", {
          method: "POST",
          body: JSON.stringify({
            ...(currentDoc || {}),
            aircraft: selectedAircraft,
            referenceData: collectRefs(),
            parts: parts.map(computedPart),
            confirmAction: true,
          }),
        }).then((payload) => payload.data || payload);
        alert("Parts lifespan data saved.");
      } catch (error) {
        alert(error.message);
      }
    });
    $("[data-parts-export]")?.addEventListener("click", () => {
      if (!selectedAircraft) return;
      collectRefs();
      const rows = [
        [`Aircraft: ${selectedAircraft}`],
        [
          `Date: ${referenceData.today || ""}`,
          `Acft. TT: ${referenceData.acftTT || ""}`,
          `N1: ${referenceData.n1Cycles || ""}`,
          `N2: ${referenceData.n2Cycles || ""}`,
          `Landings: ${referenceData.landings || ""}`,
        ],
        [],
        exportColumns.map(([, label]) => label),
        ...filteredParts()
          .map(computedPart)
          .map((part) => exportColumns.map(([key]) => part[key] ?? "")),
      ];
      const csv = rows
        .map((row) =>
          row
            .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedAircraft}-Parts-Lifespan-Monitoring.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
    aircraftSelect?.addEventListener("change", () =>
      loadAircraft(aircraftSelect.value),
    );
    search?.addEventListener("input", renderTable);
    tableBody?.addEventListener("input", (event) => {
      const input = event.target.closest("[data-part-edit]");
      if (!input) return;
      const row = parts.find(
        (part) => String(part._id) === String(input.dataset.partEdit),
      );
      if (!row) return;
      row[input.dataset.partKey] =
        input.type === "number" ? Number(input.value || 0) : input.value;
      renderTable();
      const nextInput = $(
        `[data-part-edit="${CSS.escape(input.dataset.partEdit)}"][data-part-key="${CSS.escape(input.dataset.partKey)}"]`,
      );
      nextInput?.focus();
    });
    $$("[data-ref]").forEach((input) =>
      input.addEventListener("input", () => {
        collectRefs();
        renderTable();
      }),
    );
    $("[data-parts-refresh]")?.addEventListener("click", () =>
      loadAircraft(selectedAircraft),
    );
    referenceData = defaultRefs();
    renderDetails();
    syncRefsToInputs();
    loadAircraftList();
  };

  const initMaintenanceTrackingPage = () => {
    const page = $("[data-maintenance-tracking-page]");
    if (!page) return;
    const aircraftFilter = $("[data-tracking-aircraft]");
    const healthRoot = $("[data-tracking-health]");
    const regenerateButton = $("[data-tracking-regenerate]");
    let insights = [];
    let health = null;
    let meta = null;
    let remaining = [];
    const selectedAircraft = () => aircraftFilter.value || "all";
    const riskCounts = () =>
      filteredInsights().reduce(
        (acc, item) => {
          const risk = item.riskLevel || item.priorityLevel || "Low";
          acc.total += 1;
          acc[risk.toLowerCase()] = (acc[risk.toLowerCase()] || 0) + 1;
          return acc;
        },
        { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
      );
    const filteredInsights = () =>
      selectedAircraft() === "all"
        ? insights
        : insights.filter((item) => item.aircraft === selectedAircraft());
    const filteredRemaining = () =>
      selectedAircraft() === "all"
        ? remaining
        : remaining.filter((item) => item.aircraft === selectedAircraft());
    const scheduledTasks = () =>
      filteredInsights().flatMap((item) =>
        (item.scheduledTasks || []).map((task) => ({
          ...task,
          aircraft: item.aircraft,
        })),
      );
    const renderAircraftOptions = () => {
      const aircraft = [
        ...new Set(
          [
            ...insights.map((item) => item.aircraft),
            ...remaining.map((item) => item.aircraft),
          ].filter(Boolean),
        ),
      ].sort();
      const current = selectedAircraft();
      aircraftFilter.innerHTML = `<option value="all">All Aircraft</option>${aircraft.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
      aircraftFilter.value = aircraft.includes(current) ? current : "all";
    };
    const renderHealth = () => {
      const source = meta?.activeModel || health?.model || "Rule-based engine";
      const configured = health?.configured ? "Configured" : "Rule-Based";
      const message = health?.cooldown?.active
        ? `${health.cooldown.message || "AI cooldown active."} Retry after ${health.cooldown.retryAfterSeconds || 0}s.`
        : health?.message ||
          meta?.llmLastResult?.message ||
          "Rule-based maintenance insights are active.";
      healthRoot.innerHTML = `<div class="card-head"><h3>AI Engine Status</h3>${renderStatus(configured)}</div><p class="muted">${escapeHtml(message)}</p><p class="muted">Source: ${escapeHtml(source)} | Summaries: ${escapeHtml(meta?.llmSummaryCount ?? 0)}</p>`;
      regenerateButton.disabled = Boolean(health?.cooldown?.active);
    };
    const insightSummary = (item) =>
      item.managerSummary ||
      item.shortFinding ||
      item.issueTitle ||
      "Maintenance review required";
    const referenceText = (item) =>
      [
        item.procedureReference,
        item.procedureTitle,
        ...(item.manualReferences || []),
      ]
        .filter(Boolean)
        .join(" | ") ||
      item.component ||
      "-";
    const renderTracking = () => {
      const counts = riskCounts();
      $("[data-tracking-stats]").innerHTML = [
        ["Aircraft", counts.total],
        ["Critical + High", (counts.critical || 0) + (counts.high || 0)],
        ["Medium + Low", (counts.medium || 0) + (counts.low || 0)],
        ["Scheduled Tasks", scheduledTasks().length],
      ]
        .map(
          ([label, value]) =>
            `<div class="card"><span class="muted">${label}</span><div class="kpi">${value}</div></div>`,
        )
        .join("");
      renderHealth();
      const highest =
        filteredInsights().find((item) =>
          ["Critical", "High"].includes(item.riskLevel),
        ) || filteredInsights()[0];
      const overdue = filteredRemaining().filter(
        (row) =>
          Number(row.remainingHours) <= 0 || Number(row.remainingDays) <= 0,
      );
      $("[data-tracking-insights]").innerHTML = [
        highest
          ? `${highest.aircraft}: ${insightSummary(highest)} (${highest.riskLevel || "Low"}).`
          : "No active maintenance findings are currently detected.",
        overdue.length
          ? `${overdue.length} inspection interval(s) are at or past remaining flight-hour/day limit.`
          : "No overdue inspection interval detected.",
      ]
        .map((text) => `<p class="muted">${escapeHtml(text)}</p>`)
        .join("");
      $("[data-tracking-findings]").innerHTML =
        filteredInsights()
          .map(
            (item, index) =>
              `<tr><td>${escapeHtml(item.aircraft || "-")}</td><td>${renderStatus(item.riskLevel || "Low")}</td><td><strong>${escapeHtml(item.issueTitle || "-")}</strong><p class="muted">${escapeHtml(insightSummary(item))}</p></td><td>${escapeHtml(item.recommendedAction || (item.recommendedActions || []).join(" | ") || "-")}</td><td>${escapeHtml(referenceText(item))}</td><td><button type="button" class="btn small ghost" data-rectify="${index}">Rectify</button></td></tr>`,
          )
          .join("") ||
        `<tr><td colspan="6" class="muted">No findings.</td></tr>`;
      $("[data-tracking-tasks]").innerHTML =
        scheduledTasks()
          .map(
            (task) =>
              `<tr><td>${escapeHtml(task.aircraft || "-")}</td><td>${escapeHtml(task.title || "-")}</td><td>${escapeHtml(task.assignedToName || "Unassigned")}</td><td>${escapeHtml(task.startDateTime || "-")}</td><td>${escapeHtml(task.endDateTime || task.dueDate || "-")}</td><td>${escapeHtml(task.priority || "Normal")}</td><td>${renderStatus(task.status || "-")}</td></tr>`,
          )
          .join("") ||
        `<tr><td colspan="7" class="muted">No scheduled tasks.</td></tr>`;
      $("[data-tracking-remaining]").innerHTML =
        filteredRemaining()
          .map(
            (row) =>
              `<tr><td>${escapeHtml(row.aircraft || "-")}</td><td>${escapeHtml(row.inspectionName || "-")}</td><td>${escapeHtml(row.remainingHours ?? "N/A")}</td><td>${escapeHtml(row.remainingDays ?? "N/A")}</td><td>${escapeHtml(row.dueDate || "N/A")}</td><td>${escapeHtml(row.dueAtHours ?? "N/A")}</td><td>${escapeHtml(row.sourceRow || "-")}</td></tr>`,
          )
          .join("") ||
        `<tr><td colspan="7" class="muted">No remaining-hours data.</td></tr>`;
    };
    const load = async (includeAiSummary = false) => {
      $("[data-tracking-findings]").innerHTML =
        `<tr><td colspan="6" class="muted">Loading AI maintenance insights...</td></tr>`;
      const url = includeAiSummary
        ? "/api/ai-insights/maintenance-tracking?includeLLMSummary=1&llmLimit=0"
        : "/api/ai-insights/maintenance-tracking";
      const [insightPayload, healthPayload, remainingPayload] =
        await Promise.all([
          apiFetch(url),
          apiFetch("/api/ai-insights/health").catch(() => null),
          apiFetch("/api/parts-monitoring/inspection-remaining-hours"),
        ]);
      insights = normalizeRows(insightPayload);
      meta = insightPayload?.meta || null;
      health = healthPayload;
      remaining = normalizeRows(remainingPayload);
      renderAircraftOptions();
      renderTracking();
    };
    aircraftFilter?.addEventListener("change", renderTracking);
    $("[data-tracking-refresh]")?.addEventListener("click", load);
    regenerateButton?.addEventListener("click", () => {
      if (health?.configured === false)
        return alert(
          health.message || "OpenAI is not configured on the server.",
        );
      if (health?.cooldown?.active)
        return alert(health.cooldown.message || "AI cooldown is active.");
      if (confirm("Regenerate maintenance summaries now?"))
        load(true).catch((error) => alert(error.message));
    });
    $("[data-tracking-findings]")?.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-rectify]");
      if (!button) return;
      const item = filteredInsights()[Number(button.dataset.rectify)];
      if (
        !item ||
        !confirm(
          `Mark this finding as rectified for ${item.aircraft || "this aircraft"}?`,
        )
      )
        return;
      button.disabled = true;
      try {
        await apiFetch("/api/ai-insights/rectification-task", {
          method: "POST",
          body: JSON.stringify({
            aircraft: item.aircraft,
            aircraftModel: item.aircraftModel || "Unknown",
            issueTitle: item.issueTitle,
            component: item.component,
            riskLevel: item.riskLevel,
            recommendedAction: item.recommendedAction,
            recommendedActions: item.recommendedActions || [],
            procedureReference: item.procedureReference,
            procedureTitle: item.procedureTitle,
            procedureSummary: item.procedureSummary,
            manualReference: (item.manualReferences || []).join(" | "),
            confirmAction: true,
          }),
        });
        item.riskLevel = "Low";
        item.issueTitle = "No maintenance issue detected";
        item.managerSummary = "Maintenance finding marked rectified.";
        item.recommendedAction = "Continue routine monitoring.";
        item.matchedRules = [];
        renderTracking();
      } catch (error) {
        alert(error.message);
        button.disabled = false;
      }
    });
    load().catch((error) => {
      $("[data-tracking-findings]").innerHTML =
        `<tr><td colspan="6" class="muted">${escapeHtml(error.message)}</td></tr>`;
    });
  };

  const initMaintenancePriorityPage = () => {
    const page = $("[data-maintenance-priority-page]");
    if (!page) return;
    const defaults = {
      criticalDueDays: 5,
      criticalRemainingHours: 14,
      highDueDays: 7,
      highRemainingHours: 24,
      mediumDueDays: 14,
      longTurnaroundHours: 5,
    };
    const search = $("[data-priority-search]");
    const rulesPanel = $("[data-priority-rules]");
    let rules = { ...defaults };
    let rows = [];
    let meta = null;
    const collectRules = () => {
      $$("[data-rule]").forEach((input) => {
        rules[input.dataset.rule] = Number(
          input.value || defaults[input.dataset.rule] || 0,
        );
      });
      return rules;
    };
    const syncRules = () =>
      $$("[data-rule]").forEach((input) => {
        input.value = rules[input.dataset.rule] ?? defaults[input.dataset.rule];
      });
    const filtered = () => {
      const q = String(search.value || "")
        .trim()
        .toLowerCase();
      if (!q) return rows;
      return rows.filter((item) =>
        [
          item.aircraft,
          item.aircraftModel,
          item.nextInspection,
          item.priorityLevel,
          item.sourceRow,
          item.priorityReason,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    };
    const render = () => {
      const data = filtered();
      const critical = rows.filter(
        (item) => item.priorityLevel === "Critical",
      ).length;
      const high = rows.filter((item) => item.priorityLevel === "High").length;
      const fastest = rows.reduce(
        (min, item) =>
          item.estimatedTurnaroundHours == null
            ? min
            : min == null
              ? item.estimatedTurnaroundHours
              : Math.min(min, item.estimatedTurnaroundHours),
        null,
      );
      $("[data-priority-stats]").innerHTML = [
        ["Aircraft Ranked", rows.length],
        ["Critical", critical],
        ["High", high],
        ["Fastest Turnaround", fastest == null ? "N/A" : `${fastest} hrs`],
      ]
        .map(
          ([label, value]) =>
            `<div class="card"><span class="muted">${label}</span><div class="kpi">${value}</div></div>`,
        )
        .join("");
      $("[data-priority-meta]").innerHTML = meta
        ? `<strong>Priority tie-break logic</strong><p class="muted">Critical <= ${meta.rules?.criticalDueDays ?? rules.criticalDueDays} day(s) or <= ${meta.rules?.criticalRemainingHours ?? rules.criticalRemainingHours} FH. High <= ${meta.rules?.highDueDays ?? rules.highDueDays} day(s) or <= ${meta.rules?.highRemainingHours ?? rules.highRemainingHours} FH.</p>`
        : "";
      $("[data-priority-table]").innerHTML =
        data
          .map(
            (item) =>
              `<tr><td>${item.rank}</td><td>${escapeHtml(item.aircraft || "-")}</td><td>${escapeHtml(item.aircraftModel || "-")}</td><td>${escapeHtml(item.nextInspection || "-")}</td><td>${escapeHtml([item.dueByHours != null ? `FH: ${item.dueByHours}` : "", item.dueByDays != null ? `Days: ${item.dueByDays}` : ""].filter(Boolean).join(" | ") || "N/A")}</td><td>${escapeHtml(item.dueDate || "N/A")}</td><td>${escapeHtml(item.dueBasis || "N/A")}</td><td>${escapeHtml(item.estimatedTurnaroundHours != null ? `${item.estimatedTurnaroundHours} hrs` : "N/A")}</td><td>${renderStatus(item.priorityLevel || "Low")}</td><td>${escapeHtml(item.priorityReason || "-")}</td><td>${escapeHtml((item.priorityTriggers || []).join(" | ") || "N/A")}</td></tr>`,
          )
          .join("") ||
        `<tr><td colspan="11" class="muted">No priority rows found.</td></tr>`;
    };
    const load = async (activeRules = rules) => {
      const params = new URLSearchParams(
        Object.fromEntries(
          Object.entries(activeRules).map(([key, value]) => [
            key,
            String(value),
          ]),
        ),
      );
      const payload = await apiFetch(
        `/api/parts-monitoring/maintenance-priority?${params}`,
      );
      rows = normalizeRows(payload);
      meta = payload.meta || null;
      render();
    };
    const loadRules = async () => {
      const payload = await apiFetch(
        "/api/parts-monitoring/maintenance-priority/rules",
      );
      rules = { ...defaults, ...(payload.data || {}) };
      syncRules();
      await load(rules);
    };
    search?.addEventListener("input", render);
    $("[data-priority-toggle-rules]")?.addEventListener("click", (event) => {
      rulesPanel.hidden = !rulesPanel.hidden;
      event.currentTarget.textContent = rulesPanel.hidden
        ? "Show Controls"
        : "Hide Controls";
    });
    $("[data-priority-apply]")?.addEventListener("click", () =>
      load(collectRules()),
    );
    $("[data-priority-save-rules]")?.addEventListener("click", async () => {
      const payload = await apiFetch(
        "/api/parts-monitoring/maintenance-priority/rules",
        { method: "PUT", body: JSON.stringify(collectRules()) },
      );
      rules = { ...defaults, ...(payload.data || {}) };
      syncRules();
      await load(rules);
    });
    $("[data-priority-reset]")?.addEventListener("click", () => {
      rules = { ...defaults };
      syncRules();
      load(rules);
    });
    $("[data-priority-refresh]")?.addEventListener("click", () => load(rules));
    loadRules().catch((error) => {
      $("[data-priority-table]").innerHTML =
        `<tr><td colspan="11" class="muted">${escapeHtml(error.message)}</td></tr>`;
    });
  };

  const initMaintenanceReportsPage = () => {
    const page = $("[data-reports-page]");
    if (!page) return;

    const search = $("[data-reports-search]", page);
    const exportType = $("[data-reports-export-type]", page);
    const kpisRoot = $("[data-report-kpis]", page);
    const groupsRoot = $("[data-report-groups]", page);
    const table = $("[data-report-drilldown-table]", page);
    const thead = $("thead", table);
    const tbody = $("tbody", table);
    const titleRoot = $("[data-drilldown-title]", page);
    const groupTitle = $("[data-report-groups-title]", page);
    const groupCopy = $("[data-report-groups-copy]", page);

    let state = {
      activeView: "dueSoon",
      tasks: [],
      parts: [],
      flightLogs: [],
      preInspections: [],
      postInspections: [],
      requisitions: [],
      baseAnalytics: null,
      aircraftBases: [],
    };

    const endpoints = {
      tasks: "/api/tasks/getAll",
      baseAnalytics: "/api/tasks/analytics/base-maintenance",
      aircraftBases: "/api/aircraft/aircraft-with-bases",
      parts: "/api/parts-monitoring?page=1&limit=1000",
      flightLogs: "/api/flightlogs?page=1&limit=500&sortBy=date&sortOrder=desc",
      preInspections: "/api/pre-inspections/getAllPreInspection",
      postInspections: "/api/post-inspections/getAllPostInspection",
      requisitions: "/api/parts-requisition/get-all-requisition",
    };

    const normalizeStatus = (value) =>
      String(value || "Unknown")
        .replace(/_/g, " ")
        .trim();
    const knownBase = (value) =>
      !["", "UNKNOWN", "N/A", "NA", "UNASSIGNED"].includes(
        String(value || "")
          .trim()
          .toUpperCase(),
      );
    const firstKnownBase = (...values) => {
      const match = values.find(knownBase);
      return match ? String(match).trim().toUpperCase() : "";
    };
    const countBy = (records, getKey) =>
      records.reduce((acc, record) => {
        const key = getKey(record) || "Unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
    const toRows = (counts) =>
      Object.entries(counts)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    const recordDate = (record = {}) =>
      record.date ||
      record.dateRequested ||
      record.dateAdded ||
      record.createdAt ||
      record.updatedAt;
    const dateLabel = (value) => {
      if (!value) return "N/A";
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
    };
    const isCompletedTask = (task = {}) => {
      const status = String(task.status || "")
        .trim()
        .toLowerCase();
      return (
        ["completed", "turned in", "approved"].includes(status) ||
        task.isApproved === true ||
        Boolean(task.completedAt)
      );
    };
    const taskDueDate = (task = {}) => {
      const value = task.dueDate || task.endDateTime || task.dateRectified;
      if (!value) return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };
    const taskCategory = (task = {}) => {
      if (isCompletedTask(task)) return "completed";
      const due = taskDueDate(task);
      if (!due) return "other";
      const now = new Date();
      const soon = new Date();
      soon.setDate(now.getDate() + 3);
      if (due < now) return "overdue";
      if (due <= soon) return "dueSoon";
      return "other";
    };
    const textHasDamage = (task = {}) =>
      [
        task.status,
        task.title,
        task.findings,
        task.defects,
        task.maintenanceType,
        task.summary?.remarks,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .match(/damage|damaged|defect|crack|fault|issue/);
    const textHasRepair = (task = {}) =>
      isCompletedTask(task) ||
      [
        task.status,
        task.title,
        task.findings,
        task.defects,
        task.maintenanceType,
        task.summary?.remarks,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .match(/repair|repaired|rectified|fixed|resolved/);
    const aircraftBaseLookup = () =>
      state.aircraftBases.reduce((lookup, aircraft) => {
        const tail = String(aircraft.tailNum || aircraft.aircraft || "")
          .trim()
          .toUpperCase();
        const base = String(aircraft.base || "")
          .trim()
          .toUpperCase();
        if (tail && knownBase(base)) lookup[tail] = base;
        return lookup;
      }, {});
    const taskBase = (task, lookup) =>
      firstKnownBase(
        task.base,
        task.locationBase,
        task.assignedBase,
        task.stationBase,
        lookup[
          String(task.aircraft || "")
            .trim()
            .toUpperCase()
        ],
      ) || "UNKNOWN";

    const baseSummary = () => {
      const analyticsRows = (state.baseAnalytics?.byBase || []).filter((row) =>
        knownBase(row.base),
      );
      if (analyticsRows.length) {
        const damageRows = analyticsRows.map((row) => ({
          label: row.base,
          value: row.damagedCount || 0,
        }));
        const repairRows = analyticsRows.map((row) => ({
          label: row.base,
          value: row.repairedCount || 0,
        }));
        return {
          damageRows,
          repairRows,
          topDamaged: damageRows.sort((a, b) => b.value - a.value)[0] || {
            label: "N/A",
            value: 0,
          },
          topRepaired: repairRows.sort((a, b) => b.value - a.value)[0] || {
            label: "N/A",
            value: 0,
          },
        };
      }
      const lookup = aircraftBaseLookup();
      const damageRows = toRows(
        countBy(state.tasks.filter(textHasDamage), (task) =>
          taskBase(task, lookup),
        ),
      );
      const repairRows = toRows(
        countBy(state.tasks.filter(textHasRepair), (task) =>
          taskBase(task, lookup),
        ),
      );
      return {
        damageRows,
        repairRows,
        topDamaged: damageRows[0] || { label: "N/A", value: 0 },
        topRepaired: repairRows[0] || { label: "N/A", value: 0 },
      };
    };

    const stats = () => ({
      completed: state.tasks.filter(isCompletedTask).length,
      dueSoon: state.tasks.filter((task) => taskCategory(task) === "dueSoon")
        .length,
      overdue: state.tasks.filter((task) => taskCategory(task) === "overdue")
        .length,
      modules: 9,
    });

    const renderMiniChart = (root, rows) => {
      const data = rows.slice(0, 6);
      const max = Math.max(1, ...data.map((row) => Number(row.value) || 0));
      root.innerHTML = data.length
        ? data
            .map(
              (row) => `
        <div class="bar-row">
          <span>${escapeHtml(row.label)}</span>
          <div class="bar-track"><i style="width:${Math.max(4, (Number(row.value || 0) / max) * 100)}%"></i></div>
          <strong>${escapeHtml(row.value)}</strong>
        </div>
      `,
            )
            .join("")
        : `<p class="muted">No base data available.</p>`;
    };

    const taskRows = (category) =>
      state.tasks
        .filter((task) => taskCategory(task) === category)
        .map((task, index) => ({
          key: getId(task) || `${task.title || "task"}-${index}`,
          aircraft: task.aircraft || "N/A",
          task:
            task.title ||
            task.task ||
            task.summary?.category ||
            "Untitled task",
          mechanic:
            task.assignedToName ||
            task.assignedMechanic ||
            task.assignedTo ||
            "Unassigned",
          type: task.maintenanceType || "N/A",
          dueDate: dateLabel(taskDueDate(task)),
          completed: dateLabel(
            task.approvedAt ||
              task.completedAt ||
              task.dateRectified ||
              task.updatedAt,
          ),
          priority: task.priority || "Normal",
          status: task.status || "Pending",
          notes: task.findings || task.defects || task.summary?.remarks || "",
        }));

    const renderTable = () => {
      const summary = baseSummary();
      const views = {
        dueSoon: {
          title: "Due Soon Tasks",
          columns: [
            "aircraft",
            "task",
            "mechanic",
            "type",
            "dueDate",
            "priority",
            "status",
            "notes",
          ],
          rows: taskRows("dueSoon"),
        },
        overdue: {
          title: "Overdue Tasks",
          columns: [
            "aircraft",
            "task",
            "mechanic",
            "type",
            "dueDate",
            "priority",
            "status",
            "notes",
          ],
          rows: taskRows("overdue"),
        },
        completed: {
          title: "Completed Tasks",
          columns: [
            "aircraft",
            "task",
            "mechanic",
            "type",
            "completed",
            "priority",
            "status",
            "notes",
          ],
          rows: taskRows("completed"),
        },
        baseDamage: {
          title: "Base Damage Reports",
          columns: ["label", "value"],
          rows: summary.damageRows,
        },
        baseRepair: {
          title: "Base Repaired Aircraft",
          columns: ["label", "value"],
          rows: summary.repairRows,
        },
      };
      const view = views[state.activeView] || views.dueSoon;
      titleRoot.textContent = view.title;
      thead.innerHTML = `<tr>${view.columns.map((column) => `<th>${escapeHtml(labelize(column))}</th>`).join("")}</tr>`;
      tbody.innerHTML = view.rows.length
        ? view.rows
            .map(
              (row) =>
                `<tr>${view.columns
                  .map((column) => {
                    const value = row[column];
                    return `<td>${column === "status" || column === "priority" ? renderStatus(value) : escapeHtml(value || "N/A")}</td>`;
                  })
                  .join("")}</tr>`,
            )
            .join("")
        : `<tr><td colspan="${view.columns.length}" class="muted">No records found for this view.</td></tr>`;
    };

    const reportModules = () => {
      const taskStatusRows = toRows(
        countBy(state.tasks, (task) => normalizeStatus(task.status)),
      );
      const partStatusRows = toRows(
        countBy(
          state.parts,
          (part) => part.priority || part.due || part.status || "Tracked",
        ),
      );
      const flightStatusRows = toRows(
        countBy(state.flightLogs, (log) => normalizeStatus(log.status)),
      );
      const preRows = toRows(
        countBy(state.preInspections, (row) => normalizeStatus(row.status)),
      );
      const postRows = toRows(
        countBy(state.postInspections, (row) => normalizeStatus(row.status)),
      );
      const reqRows = toRows(
        countBy(state.requisitions, (row) => normalizeStatus(row.status)),
      );
      return [
        {
          key: "general",
          category: "Performance",
          title: "General Reports",
          rows: [
            ["Tasks", state.tasks.length],
            ["Flight Logs", state.flightLogs.length],
            ["Pre Inspections", state.preInspections.length],
            ["Post Inspections", state.postInspections.length],
            ["Parts Requisitions", state.requisitions.length],
          ],
        },
        {
          key: "performance",
          category: "Performance",
          title: "Performance Overview",
          rows: taskStatusRows.map((row) => [row.label, row.value]),
        },
        {
          key: "history",
          category: "Performance",
          title: "Maintenance History",
          rows: state.tasks
            .slice(0, 8)
            .map((task) => [
              dateLabel(recordDate(task)),
              task.title || task.task || "Untitled task",
            ]),
        },
        {
          key: "summary",
          category: "Performance",
          title: "Maintenance Insights",
          rows: [
            ["Completed Tasks", stats().completed],
            ["Due Soon", stats().dueSoon],
            ["Overdue", stats().overdue],
          ],
        },
        {
          key: "component",
          category: "Inventory",
          title: "Component Analysis",
          rows: partStatusRows.map((row) => [row.label, row.value]),
        },
        {
          key: "flight-log",
          category: "Logbook",
          title: "Flight Log Report",
          rows: flightStatusRows.map((row) => [row.label, row.value]),
        },
        {
          key: "pre-inspection",
          category: "Logbook",
          title: "Pre-Inspection Report",
          rows: preRows.map((row) => [row.label, row.value]),
        },
        {
          key: "post-inspection",
          category: "Logbook",
          title: "Post-Inspection Report",
          rows: postRows.map((row) => [row.label, row.value]),
        },
        {
          key: "parts-requisition",
          category: "Inventory",
          title: "Parts Requisition Report",
          rows: reqRows.map((row) => [row.label, row.value]),
        },
      ];
    };

    const renderGroups = () => {
      const query = String(search?.value || "")
        .trim()
        .toLowerCase();
      const modules = reportModules().filter(
        (module) =>
          !query ||
          [module.title, module.category, module.key]
            .join(" ")
            .toLowerCase()
            .includes(query),
      );
      groupTitle.textContent = query
        ? "Search Results"
        : "Grouped Analytics Modules";
      groupCopy.textContent = query
        ? "Showing matched report modules."
        : "Related tables and charts are grouped by domain for easier review.";
      const grouped = modules.reduce((acc, module) => {
        acc[module.category] ||= [];
        acc[module.category].push(module);
        return acc;
      }, {});
      groupsRoot.innerHTML =
        Object.entries(grouped)
          .map(
            ([category, items]) => `
        <section class="card report-group">
          <h3>${escapeHtml(category)} Reports</h3>
          <div class="report-module-grid">
            ${items
              .map(
                (module) => `
              <article class="report-module">
                <h4>${escapeHtml(module.title)}</h4>
                <table class="mini-table">
                  <tbody>${(module.rows.length ? module.rows : [["No data", ""]]).map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody>
                </table>
              </article>
            `,
              )
              .join("")}
          </div>
        </section>
      `,
          )
          .join("") ||
        `<section class="card"><p class="muted">No report modules match the search.</p></section>`;
    };

    const render = () => {
      const currentStats = stats();
      const summary = baseSummary();
      kpisRoot.innerHTML = [
        ["Completed Tasks", currentStats.completed, "completed"],
        ["Due Soon (next 3 days)", currentStats.dueSoon, "dueSoon"],
        ["Overdue Tasks", currentStats.overdue, "overdue"],
        ["Module Reports", currentStats.modules, "modules"],
      ]
        .map(
          ([label, value, view]) =>
            `<button type="button" class="card report-kpi ${state.activeView === view ? "active" : ""}" data-report-view="${view === "modules" ? "dueSoon" : view}"><span class="muted">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></button>`,
        )
        .join("");
      $("[data-top-damaged-base]", page).textContent =
        `Top: ${summary.topDamaged.label} (${summary.topDamaged.value})`;
      $("[data-top-repaired-base]", page).textContent =
        `Top: ${summary.topRepaired.label} (${summary.topRepaired.value})`;
      renderMiniChart($("[data-damage-chart]", page), summary.damageRows);
      renderMiniChart($("[data-repair-chart]", page), summary.repairRows);
      $$("[data-report-view]", page).forEach((button) =>
        button.classList.toggle(
          "active",
          button.dataset.reportView === state.activeView,
        ),
      );
      renderTable();
      renderGroups();
    };

    const load = async () => {
      tbody.innerHTML = `<tr><td class="muted">Loading report data...</td></tr>`;
      const entries = await Promise.all(
        Object.entries(endpoints).map(async ([key, url]) => {
          try {
            const payload = await apiFetch(url);
            return [
              key,
              key === "baseAnalytics"
                ? payload.data || payload
                : normalizeRows(payload),
            ];
          } catch (error) {
            return [key, key === "baseAnalytics" ? null : []];
          }
        }),
      );
      const data = Object.fromEntries(entries);
      state = { ...state, ...data };
      render();
    };

    const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const exportCsv = () => {
      const rows = [["Section", "Label", "Value"]];
      reportModules().forEach((module) =>
        module.rows.forEach(([label, value]) =>
          rows.push([module.title, label, value]),
        ),
      );
      const blob = new Blob(
        [rows.map((row) => row.map(csvEscape).join(",")).join("\n")],
        { type: "text/csv;charset=utf-8" },
      );
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `reports-and-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    };
    const exportReportPrint = () => {
      const win = window.open("", "_blank", "noopener,noreferrer");
      if (!win) return;
      const currentStats = stats();
      const summary = baseSummary();
      const modules = reportModules();
      win.document
        .write(`<!doctype html><html><head><title>AirMS Reports and Analytics</title><style>
        body{font-family:Arial,sans-serif;margin:26px;color:#111;font-size:12px} h1{margin:0 0 4px} h2{margin:20px 0 8px;font-size:16px}.muted{color:#667085}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0}.kpi{border:1px solid #ccc;padding:10px}.kpi strong{display:block;font-size:22px;margin-top:4px} table{width:100%;border-collapse:collapse;margin:8px 0 16px} th,td{border:1px solid #ccc;padding:6px;text-align:left;vertical-align:top} th{background:#f3f4f6}@media print{body{margin:12mm}}
      </style></head><body>
        <h1>Maintenance Reports and Analytics</h1>
        <p class="muted">Generated ${escapeHtml(new Date().toLocaleString())}</p>
        <section class="kpis">
          <div class="kpi"><span>Completed Tasks</span><strong>${escapeHtml(currentStats.completed)}</strong></div>
          <div class="kpi"><span>Due Soon</span><strong>${escapeHtml(currentStats.dueSoon)}</strong></div>
          <div class="kpi"><span>Overdue</span><strong>${escapeHtml(currentStats.overdue)}</strong></div>
          <div class="kpi"><span>Modules</span><strong>${escapeHtml(currentStats.modules)}</strong></div>
        </section>
        <h2>Base Health</h2>
        <table><thead><tr><th>Base Damage</th><th>Count</th><th>Base Repair</th><th>Count</th></tr></thead><tbody>
          ${Array.from({
            length: Math.max(
              summary.damageRows.length,
              summary.repairRows.length,
              1,
            ),
          })
            .map(
              (_, index) =>
                `<tr><td>${escapeHtml(summary.damageRows[index]?.label || "")}</td><td>${escapeHtml(summary.damageRows[index]?.value ?? "")}</td><td>${escapeHtml(summary.repairRows[index]?.label || "")}</td><td>${escapeHtml(summary.repairRows[index]?.value ?? "")}</td></tr>`,
            )
            .join("")}
        </tbody></table>
        ${modules.map((module) => `<h2>${escapeHtml(module.title)}</h2><table><thead><tr><th>Label</th><th>Value</th></tr></thead><tbody>${(module.rows.length ? module.rows : [["No data", ""]]).map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table>`).join("")}
        <script>window.onload=()=>window.print();<\/script>
      </body></html>`);
      win.document.close();
    };

    page.addEventListener("click", (event) => {
      const button = event.target.closest("[data-report-view]");
      if (!button) return;
      state.activeView = button.dataset.reportView;
      render();
    });
    search?.addEventListener("input", renderGroups);
    $("[data-reports-refresh]", page)?.addEventListener("click", load);
    $("[data-reports-export]", page)?.addEventListener("click", () => {
      if (exportType?.value === "csv") exportCsv();
      else exportReportPrint();
    });

    load().catch((error) => {
      tbody.innerHTML = `<tr><td class="muted">${escapeHtml(error.message)}</td></tr>`;
    });
  };

  const initPartsRequisitionPage = () => {
    const page = $("[data-requisition-page]");
    if (!page) return;
    const search = $("[data-req-search]");
    const sort = $("[data-req-sort]");
    const filtersRoot = $("[data-req-filters]");
    const tableBody = $("[data-req-table]");
    const countRoot = $("[data-req-count]");
    const dialog = $("[data-req-dialog]");
    const form = $("[data-req-form]");
    const aircraftSelect = $("[data-req-aircraft]");
    const reqItems = $("[data-req-items]");
    const formStatus = $("[data-req-form-status]");
    const wrsDialog = $("[data-wrs-dialog]");
    const wrsSummary = $("[data-wrs-summary]");
    const wrsItems = $("[data-wrs-items]");
    const wrsTimeline = $("[data-wrs-timeline]");
    const wrsActionTitle = $("[data-wrs-action-title]");
    const wrsActionCopy = $("[data-wrs-action-copy]");
    const wrsStatus = $("[data-wrs-status]");
    let requisitions = [];
    let aircraftOptions = [];
    let selectedStatus = "all";
    let selectedRecord = null;
    let itemCounter = 0;

    const normalizeReqStatus = (value) => {
      const raw = String(value || "")
        .trim()
        .toLowerCase();
      if (raw === "pending") return "Parts Requested";
      if (raw === "in progress") return "Ordered";
      if (raw === "completed") return "Delivered";
      if (raw === "rejected") return "Cancelled";
      return raw ? labelize(raw) : "Parts Requested";
    };
    const effectiveStatus = (record) => {
      const status = normalizeReqStatus(record?.status);
      return status === "Parts Requested" && record?.dateWarehouseReviewed
        ? "Availability Checked"
        : status;
    };
    const statusBucket = (record) => {
      const status = effectiveStatus(record).toLowerCase();
      if (status === "approved") return "approved";
      if (["delivered", "cancelled"].includes(status)) return "closed";
      return "pending";
    };
    const isManager = () =>
      ["superadmin", "maintenance manager", "officer-in-charge"].includes(
        getUserRole(),
      );
    const isWarehouse = () => getUserRole() === "warehouse department";
    const canRequestParts = () =>
      ![
        "superadmin",
        "maintenance manager",
        "officer-in-charge",
        "warehouse department",
      ].includes(getUserRole());
    const staffName = () =>
      [getUser()?.firstName, getUser()?.lastName].filter(Boolean).join(" ") ||
      getUser()?.username ||
      "AirMS User";
    const dateText = (value) => {
      if (!value) return "";
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? String(value)
        : `${date.getMonth() + 1}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
    };
    const normalizeRecord = (record = {}) => ({
      ...record,
      wrsNo:
        record.wrsNo ||
        record.requestNumber ||
        `WRS-${String(getId(record) || "").slice(-3)}`,
      status: normalizeReqStatus(record.status),
      dateRequested: dateText(record.dateRequested || record.createdAt),
      staff: {
        ...(record.staff || {}),
        employeeName:
          record.staff?.employeeName ||
          record.staff?.requisitioner ||
          record.requestedBy ||
          "",
      },
      items:
        Array.isArray(record.items) && record.items.length
          ? record.items
          : [
              {
                _id: "item-1",
                particular: record.partName || record.part || "Part",
                quantity: Number(record.quantity || 1),
                unitOfMeasure: record.unitOfMeasure || "pcs",
                purpose: record.purpose || "",
                availableQty: Number(record.availableQty || 0),
                stockStatus:
                  record.stockStatus || record.status || "Parts Requested",
              },
            ],
    });
    const totalQty = (record) =>
      (record.items || []).reduce(
        (sum, item) => sum + (Number(item.quantity) || 0),
        0,
      );
    const parseReqDate = (record) => {
      const date = new Date(record.dateRequested || record.createdAt || 0);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };
    const nextWrsNo = () => {
      const highest = requisitions.reduce(
        (max, item) =>
          Math.max(
            max,
            Number(String(item.wrsNo || "").replace(/\D/g, "")) || 0,
          ),
        0,
      );
      return `WRS-${String(highest + 1).padStart(3, "0")}`;
    };
    const filtered = () => {
      const query = String(search.value || "")
        .trim()
        .toLowerCase();
      let rows = requisitions.filter((record) => {
        const haystack = [
          record.wrsNo,
          record.aircraft,
          effectiveStatus(record),
          record.staff?.employeeName,
        ]
          .join(" ")
          .toLowerCase();
        if (query && !haystack.includes(query)) return false;
        if (selectedStatus === "all") return true;
        if (selectedStatus === "for_review")
          return ["availability checked", "ordered"].includes(
            effectiveStatus(record).toLowerCase(),
          );
        if (selectedStatus === "completed")
          return ["delivered", "cancelled"].includes(
            effectiveStatus(record).toLowerCase(),
          );
        return statusBucket(record) === selectedStatus;
      });
      rows = [...rows].sort((a, b) =>
        sort.value === "oldest"
          ? parseReqDate(a) - parseReqDate(b)
          : parseReqDate(b) - parseReqDate(a),
      );
      return rows;
    };
    const statusFilters = () => {
      if (isManager())
        return [
          ["all", "All", requisitions.length],
          [
            "for_review",
            "For Review",
            requisitions.filter((record) =>
              ["availability checked", "ordered"].includes(
                effectiveStatus(record).toLowerCase(),
              ),
            ).length,
          ],
          [
            "closed",
            "Closed",
            requisitions.filter((record) =>
              ["delivered", "cancelled", "approved"].includes(
                effectiveStatus(record).toLowerCase(),
              ),
            ).length,
          ],
        ];
      if (isWarehouse())
        return [
          ["all", "All", requisitions.length],
          [
            "pending",
            "Pending",
            requisitions.filter(
              (record) =>
                !["delivered", "cancelled"].includes(
                  effectiveStatus(record).toLowerCase(),
                ),
            ).length,
          ],
          [
            "completed",
            "Completed",
            requisitions.filter((record) =>
              ["delivered", "cancelled"].includes(
                effectiveStatus(record).toLowerCase(),
              ),
            ).length,
          ],
        ];
      return [
        ["all", "All", requisitions.length],
        [
          "pending",
          "Pending",
          requisitions.filter((record) => statusBucket(record) === "pending")
            .length,
        ],
        [
          "approved",
          "Approved",
          requisitions.filter((record) => statusBucket(record) === "approved")
            .length,
        ],
        [
          "closed",
          "Closed",
          requisitions.filter((record) => statusBucket(record) === "closed")
            .length,
        ],
      ];
    };
    const renderFilters = () => {
      filtersRoot.innerHTML = statusFilters()
        .map(
          ([key, title, count]) =>
            `<button type="button" class="btn ${selectedStatus === key ? "" : "ghost"}" data-req-filter="${key}">${escapeHtml(title)} (${count})</button>`,
        )
        .join("");
    };
    const renderTable = () => {
      const rows = filtered();
      countRoot.textContent = `Showing ${rows.length} requisition(s)`;
      renderFilters();
      tableBody.innerHTML = rows.length
        ? rows
            .map(
              (record) => `
        <tr>
          <td><strong>${escapeHtml(record.wrsNo)}</strong></td>
          <td>${escapeHtml(record.aircraft || "N/A")}</td>
          <td>${escapeHtml(record.staff?.employeeName || "N/A")}</td>
          <td>${escapeHtml(record.dateRequested || "N/A")}</td>
          <td>${escapeHtml((record.items || []).length)}</td>
          <td>${escapeHtml(totalQty(record))}</td>
          <td>${renderStatus(effectiveStatus(record))}</td>
          <td><button type="button" class="btn small ghost" data-wrs-open="${escapeHtml(getId(record))}">Open WRS</button></td>
        </tr>
      `,
            )
            .join("")
        : `<tr><td colspan="8" class="muted">No requisitions found.</td></tr>`;
    };
    const addItemRow = (item = {}) => {
      const index = itemCounter++;
      const row = document.createElement("section");
      row.className = "req-item-row";
      row.dataset.reqItemRow = String(index);
      row.innerHTML = `
        <div class="field"><label>Particular</label><input name="particular" value="${escapeHtml(item.particular || "")}" required /></div>
        <div class="field"><label>Quantity</label><input name="quantity" type="number" min="1" value="${escapeHtml(item.quantity || "")}" required /></div>
        <div class="field"><label>Unit</label><select name="unit"><option value="pcs">pcs</option><option value="kg">kg</option><option value="ft">ft</option><option value="L">L</option></select></div>
        <div class="field"><label>Purpose</label><input name="purpose" value="${escapeHtml(item.purpose || "")}" /></div>
        <button type="button" class="btn danger small" data-remove-req-item>Remove</button>
      `;
      row.querySelector("[name='unit']").value = item.unit || "pcs";
      reqItems.appendChild(row);
    };
    const openCreate = () => {
      form.reset();
      reqItems.innerHTML = "";
      itemCounter = 0;
      addItemRow();
      formStatus.textContent = "";
      dialog.showModal();
    };
    const collectItems = () =>
      $$("[data-req-item-row]", reqItems)
        .map((row, index) => ({
          itemNo: index + 1,
          particular: row.querySelector("[name='particular']").value.trim(),
          quantity: Number(row.querySelector("[name='quantity']").value || 0),
          unitOfMeasure: row.querySelector("[name='unit']").value || "pcs",
          purpose: row.querySelector("[name='purpose']").value.trim(),
          availableQty: 0,
          stockStatus: "Parts Requested",
        }))
        .filter((item) => item.particular && item.quantity > 0);
    const loadAircraft = async () => {
      aircraftOptions = normalizeRows(
        await apiFetch("/api/parts-monitoring/aircraft-list").catch(() => []),
      );
      aircraftSelect.innerHTML = `<option value="">Choose Aircraft</option>${aircraftOptions.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
    };
    const load = async () => {
      tableBody.innerHTML = `<tr><td colspan="8" class="muted">Loading requisitions...</td></tr>`;
      requisitions = normalizeRows(
        await apiFetch("/api/parts-requisition/get-all-requisition"),
      ).map(normalizeRecord);
      renderTable();
    };
    const itemStockStatus = (item, availableQty) => {
      const current = normalizeReqStatus(item.stockStatus);
      if (["Approved", "Delivered", "Cancelled"].includes(current))
        return current;
      if (current === "To Be Ordered" || current === "Ordered")
        return availableQty >= Number(item.quantity || 0)
          ? "Ordered"
          : "To Be Ordered";
      return availableQty >= Number(item.quantity || 0)
        ? "In Stock"
        : "Out of Stock";
    };
    const currentAction = () => {
      const status = effectiveStatus(selectedRecord);
      const hasOut = (selectedRecord.items || []).some(
        (item) => Number(item.availableQty || 0) < Number(item.quantity || 0),
      );
      if (status === "Approved")
        return isWarehouse()
          ? [
              "Delivery",
              "Warehouse can mark this approved requisition as delivered.",
              "Mark Delivered",
              false,
            ]
          : [
              "Awaiting Delivery",
              "Approved requisition is waiting for warehouse delivery.",
              "Waiting",
              true,
            ];
      if (["Delivered", "Cancelled"].includes(status))
        return ["Completed", "No further action is needed.", "Done", true];
      if (status === "Availability Checked")
        return isManager()
          ? [
              hasOut ? "Order Decision" : "Approval Decision",
              hasOut
                ? "Some items are short. Send to ordering."
                : "All requested quantities are available.",
              hasOut ? "Mark To Be Ordered" : "Approve",
              false,
            ]
          : [
              "Awaiting Maintenance Review",
              "Warehouse submitted availability.",
              "Waiting",
              true,
            ];
      if (status === "To Be Ordered")
        return isWarehouse()
          ? [
              "Confirm Restock",
              "Update available quantities, then mark as restocked.",
              "Mark as Restocked",
              false,
            ]
          : [
              "Awaiting Warehouse Restock",
              "Warehouse is confirming restocked quantities.",
              "Waiting",
              true,
            ];
      if (status === "Ordered")
        return isManager()
          ? ["Final Approval", "Warehouse confirmed restock.", "Approve", false]
          : [
              "Awaiting Approval",
              "Waiting for maintenance approval.",
              "Waiting",
              true,
            ];
      return isWarehouse()
        ? [
            "Stock Review",
            "Enter available quantities for all items.",
            "Submit Stock Review",
            false,
          ]
        : [
            "Awaiting Warehouse Review",
            "Warehouse is reviewing stock availability.",
            "Waiting",
            true,
          ];
    };
    const renderWrs = () => {
      if (!selectedRecord) return;
      const status = effectiveStatus(selectedRecord);
      const [title, copy, button, disabled] = currentAction();
      wrsSummary.innerHTML = `<dl class="profile-list"><dt>WRS No.</dt><dd>${escapeHtml(selectedRecord.wrsNo)}</dd><dt>Status</dt><dd>${renderStatus(status)}</dd><dt>Aircraft</dt><dd>${escapeHtml(selectedRecord.aircraft || "N/A")}</dd><dt>Requested By</dt><dd>${escapeHtml(selectedRecord.staff?.employeeName || "N/A")}</dd><dt>Date Requested</dt><dd>${escapeHtml(selectedRecord.dateRequested || "N/A")}</dd><dt>Total Qty</dt><dd>${escapeHtml(totalQty(selectedRecord))}</dd></dl>`;
      wrsItems.innerHTML = (selectedRecord.items || [])
        .map(
          (item, index) => `
        <tr>
          <td>${escapeHtml(item.particular || item.partName || item.part || "-")}</td>
          <td>${escapeHtml(item.quantity || 0)}</td>
          <td>${escapeHtml(item.unitOfMeasure || item.unit || "pcs")}</td>
          <td>${escapeHtml(item.purpose || "-")}</td>
          <td><input class="table-input" type="number" min="0" value="${escapeHtml(item.availableQty ?? "")}" data-wrs-qty="${index}" ${isWarehouse() && ["Parts Requested", "To Be Ordered"].includes(status) ? "" : "disabled"} /></td>
          <td>${renderStatus(item.stockStatus || "Parts Requested")}</td>
        </tr>
      `,
        )
        .join("");
      const steps = ["Parts Requested", "Availability Checked"];
      const hasOut = (selectedRecord.items || []).some(
        (item) => Number(item.availableQty || 0) < Number(item.quantity || 0),
      );
      if (
        hasOut ||
        selectedRecord.dateOrdered ||
        ["To Be Ordered", "Ordered"].includes(status)
      )
        steps.push("To Be Ordered", "Ordered");
      steps.push("Approved", "Delivered");
      const currentIndex = steps.indexOf(status);
      wrsTimeline.innerHTML = steps
        .map(
          (step, index) =>
            `<li class="${index < currentIndex ? "done" : index === currentIndex ? "active" : ""}">${escapeHtml(step)}</li>`,
        )
        .join("");
      wrsActionTitle.textContent = title;
      wrsActionCopy.textContent = copy;
      $("[data-wrs-submit]").textContent = button;
      $("[data-wrs-submit]").disabled = disabled;
      wrsStatus.textContent = "";
    };
    const updateSelected = async (updates) => {
      await apiFetch(
        `/api/parts-requisition/update-requisition/${encodeURIComponent(getId(selectedRecord))}`,
        {
          method: "POST",
          body: JSON.stringify({ ...updates, confirmAction: true }),
        },
      );
      await load();
      selectedRecord =
        requisitions.find(
          (record) => getId(record) === getId(selectedRecord),
        ) || null;
      if (selectedRecord) renderWrs();
    };
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const items = collectItems();
      if (!items.length) {
        formStatus.textContent = "Add at least one valid item.";
        return;
      }
      try {
        const wrsNo = nextWrsNo();
        await apiFetch("/api/parts-requisition/create-requisition", {
          method: "POST",
          body: JSON.stringify({
            wrsNo,
            aircraft: form.aircraft.value,
            staff: {
              requisitioner: staffName(),
              employeeName: staffName(),
              approvedBy: "",
              receiver: "",
              notedBy: "",
              warehouseBy: "",
              deliveredBy: "",
            },
            items,
            dateRequested: new Date().toISOString(),
            status: "Parts Requested",
            confirmAction: true,
          }),
        });
        dialog.close();
        await load();
      } catch (error) {
        formStatus.textContent = error.message;
      }
    });
    tableBody?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-wrs-open]");
      if (!button) return;
      selectedRecord = requisitions.find(
        (record) => getId(record) === button.dataset.wrsOpen,
      );
      renderWrs();
      wrsDialog.showModal();
    });
    wrsItems?.addEventListener("input", (event) => {
      const input = event.target.closest("[data-wrs-qty]");
      if (!input || !selectedRecord) return;
      const item = selectedRecord.items[Number(input.dataset.wrsQty)];
      item.availableQty = Number(input.value || 0);
      item.stockStatus = itemStockStatus(item, item.availableQty);
      renderWrs();
    });
    $("[data-wrs-submit]")?.addEventListener("click", async () => {
      if (!selectedRecord) return;
      const status = effectiveStatus(selectedRecord);
      const reviewer = staffName();
      const warehouse = staffName();
      try {
        if (status === "Parts Requested") {
          await updateSelected({
            status: "Parts Requested",
            dateWarehouseReviewed: new Date().toISOString(),
            warehouseBy: warehouse,
            items: selectedRecord.items,
          });
        } else if (status === "Availability Checked") {
          const hasOut = selectedRecord.items.some(
            (item) =>
              Number(item.availableQty || 0) < Number(item.quantity || 0),
          );
          await updateSelected(
            hasOut
              ? { status: "To Be Ordered" }
              : {
                  status: "Approved",
                  approvedBy: reviewer,
                  approvedAt: new Date().toISOString(),
                },
          );
        } else if (status === "To Be Ordered") {
          await updateSelected({
            status: "Ordered",
            dateOrdered: new Date().toISOString(),
            warehouseBy: warehouse,
            items: selectedRecord.items.map((item) => ({
              ...item,
              stockStatus: itemStockStatus(
                item,
                Number(item.availableQty || 0),
              ),
            })),
          });
        } else if (status === "Ordered") {
          await updateSelected({
            status: "Approved",
            approvedBy: reviewer,
            approvedAt: new Date().toISOString(),
          });
        } else if (status === "Approved") {
          await updateSelected({
            status: "Delivered",
            dateDelivered: new Date().toISOString(),
            dateReceived: new Date().toISOString(),
            deliveredBy: warehouse,
            warehouseBy: warehouse,
            items: selectedRecord.items.map((item) => ({
              ...item,
              stockStatus: "Delivered",
            })),
          });
        }
      } catch (error) {
        wrsStatus.textContent = error.message;
      }
    });
    filtersRoot?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-req-filter]");
      if (!button) return;
      selectedStatus = button.dataset.reqFilter;
      renderTable();
    });
    reqItems?.addEventListener("click", (event) => {
      if (event.target.closest("[data-remove-req-item]")) {
        event.target.closest("[data-req-item-row]")?.remove();
      }
    });
    $("[data-req-add-item]")?.addEventListener("click", () => addItemRow());
    $("[data-req-new]")?.addEventListener("click", openCreate);
    $("[data-req-refresh]")?.addEventListener("click", load);
    search?.addEventListener("input", renderTable);
    sort?.addEventListener("change", renderTable);
    $$("[data-req-close]").forEach((button) =>
      button.addEventListener("click", () => dialog.close()),
    );
    $$("[data-wrs-close]").forEach((button) =>
      button.addEventListener("click", () => wrsDialog.close()),
    );
    if (isManager()) $("[data-req-new]")?.setAttribute("hidden", "hidden");
    Promise.all([loadAircraft(), load()]).catch((error) => {
      tableBody.innerHTML = `<tr><td colspan="8" class="muted">${escapeHtml(error.message)}</td></tr>`;
    });
  };

  const initMessages = () => {
    if (!$("[data-messages-page]")) return;
    const convRoot = $("[data-conversations]");
    const threadRoot = $("[data-thread]");
    const threadTitle = $("[data-thread-title]");
    const threadSubtitle = $("[data-thread-subtitle]");
    const sendForm = $("[data-send-message]");
    const search = $("[data-message-search]");
    const filesInput = $("[data-message-files]");
    const attachmentsRoot = $("[data-attachment-preview]");
    const groupDialog = $("[data-group-dialog]");
    const groupForm = $("[data-group-form]");
    const groupMembers = $("[data-group-members]");
    const groupStatus = $("[data-group-status]");
    const membersDialog = $("[data-members-dialog]");
    const membersList = $("[data-members-list]");
    const membersTitle = $("[data-members-title]");
    const membersButton = $("[data-open-members]");
    let users = [];
    let conversations = [];
    let activeConversation = null;
    let selectedFiles = [];
    let syncTimer = null;

    const entityId = (value) => value?._id || value?.id || value;
    const currentUserId = () => String(getUser()?.id || getUser()?._id || "");
    const fullName = (user = {}) =>
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.username ||
      "User";
    const imageUrl = (image) =>
      image ? (String(image).startsWith("http") ? image : image) : "";
    const initials = (name) =>
      String(name || "U")
        .split(/\s+/)
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase() || "U";
    const formatTime = (value) => {
      if (!value) return "";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return date.toDateString() === new Date().toDateString()
        ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : date.toLocaleDateString([], { month: "short", day: "numeric" });
    };
    const attachmentUrl = (url) =>
      !url
        ? ""
        : String(url).startsWith("http") || String(url).startsWith("blob:")
          ? url
          : url;
    const attachmentLabel = (attachments = []) => {
      const first = attachments[0];
      if (!first) return "";
      const prefix = first.kind === "image" ? "Photo" : "File";
      return attachments.length > 1
        ? `${prefix}: ${first.name} +${attachments.length - 1}`
        : `${prefix}: ${first.name}`;
    };
    const conversationTitle = (conversation) =>
      conversation?.type === "group"
        ? conversation.group?.name || conversation.name || "Group chat"
        : fullName(conversation.user || conversation);
    const conversationSubtitle = (conversation) =>
      conversation?.type === "group"
        ? `${conversation.group?.members?.length || 0} members`
        : conversation.user?.jobTitle || conversation.jobTitle || "User";
    const conversationId = (conversation) =>
      String(
        conversation.id ||
          entityId(conversation.group) ||
          entityId(conversation.user) ||
          entityId(conversation),
      );

    const avatarMarkup = (user, fallbackName, group = false) => {
      const image = imageUrl(user?.image);
      return `<span class="message-avatar ${group ? "group" : ""}">${image ? `<img src="${escapeHtml(image)}" alt="">` : escapeHtml(group ? "G" : initials(fallbackName))}</span>`;
    };

    const mergeConversationItems = () => {
      const directIds = new Set();
      const items = conversations.map((conversation) => {
        if (conversation.type === "group") {
          return {
            ...conversation,
            id: conversationId(conversation),
            title: conversationTitle(conversation),
            subtitle: conversationSubtitle(conversation),
          };
        }
        const id = String(conversation.id || entityId(conversation.user));
        directIds.add(id);
        return {
          ...conversation,
          type: "direct",
          id,
          title: conversationTitle(conversation),
          subtitle: conversationSubtitle(conversation),
        };
      });
      users.forEach((user) => {
        const id = String(entityId(user));
        if (!id || directIds.has(id) || id === currentUserId()) return;
        items.push({
          type: "direct",
          id,
          user,
          title: fullName(user),
          subtitle: user.jobTitle || "User",
          unreadCount: 0,
        });
      });
      const query = String(search?.value || "")
        .trim()
        .toLowerCase();
      return items
        .filter(
          (item) =>
            !query ||
            [item.title, item.subtitle, item.user?.username, item.user?.email]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(query),
        )
        .sort(
          (a, b) =>
            new Date(b.lastMessage?.createdAt || b.updatedAt || 0) -
            new Date(a.lastMessage?.createdAt || a.updatedAt || 0),
        );
    };

    const renderConversations = () => {
      const items = mergeConversationItems();
      if (!items.length) {
        convRoot.innerHTML = `<p class="muted">No conversations found.</p>`;
        return;
      }
      convRoot.innerHTML = "";
      items.forEach((item) => {
        const preview =
          item.lastMessage?.body ||
          attachmentLabel(item.lastMessage?.attachments || []) ||
          item.subtitle ||
          "";
        const button = document.createElement("button");
        button.type = "button";
        button.className = `message-item ${activeConversation?.type === item.type && activeConversation?.id === item.id ? "active" : ""}`;
        button.innerHTML = `
          ${avatarMarkup(item.user, item.title, item.type === "group")}
          <span class="message-item-copy">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(preview)}</span>
          </span>
          <span class="message-item-meta">
            ${item.lastMessage?.createdAt ? `<small>${escapeHtml(formatTime(item.lastMessage.createdAt))}</small>` : ""}
            ${item.unreadCount ? `<i>${escapeHtml(item.unreadCount)}</i>` : ""}
          </span>
        `;
        button.addEventListener("click", () => selectConversation(item));
        convRoot.appendChild(button);
      });
    };

    const renderGroupMembers = () => {
      const members = activeConversation?.group?.members || [];
      membersTitle.textContent = `${activeConversation?.title || "Group chat"} members`;
      membersList.innerHTML = members.length
        ? members
            .map(
              (member) => `
        <div class="member-row">
          ${avatarMarkup(member, fullName(member))}
          <span><strong>${escapeHtml(fullName(member))}</strong><small>${escapeHtml(member.jobTitle || "User")}</small></span>
        </div>
      `,
            )
            .join("")
        : `<p class="muted">No members listed.</p>`;
    };

    const renderAttachments = (message) =>
      (message.attachments || [])
        .map((attachment) => {
          const url = attachmentUrl(attachment.url);
          const isImage =
            attachment.kind === "image" ||
            String(attachment.mimeType || "").startsWith("image/");
          if (isImage && url)
            return `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer" class="message-attachment image"><img src="${escapeHtml(url)}" alt="${escapeHtml(attachment.name || "Attachment")}"></a>`;
          return `<a href="${escapeHtml(url || "#")}" target="${url ? "_blank" : ""}" rel="noreferrer" class="message-attachment"><span>File</span>${escapeHtml(attachment.name || "Attachment")}</a>`;
        })
        .join("");

    const loadThread = async (silent = false) => {
      if (!activeConversation?.id) return;
      if (!silent)
        threadRoot.innerHTML = `<p class="muted">Loading thread...</p>`;
      const rows = normalizeRows(
        await apiFetch(
          `/api/messages/${encodeURIComponent(activeConversation.id)}`,
        ),
      );
      threadRoot.innerHTML = rows.length
        ? ""
        : `<p class="muted">No messages yet.</p>`;
      rows.forEach((message) => {
        const mine =
          String(message.from || message.sender || "") === currentUserId();
        const bubble = document.createElement("div");
        bubble.className = `bubble ${mine ? "mine" : ""}`;
        bubble.innerHTML = `
          ${message.body ? `<div class="message-body">${escapeHtml(message.body)}</div>` : ""}
          ${renderAttachments(message)}
          <small>${escapeHtml(formatTime(message.createdAt))}${mine ? " Sent" : ""}</small>
        `;
        threadRoot.appendChild(bubble);
      });
      threadRoot.scrollTop = threadRoot.scrollHeight;
    };

    const selectConversation = async (item) => {
      activeConversation = item;
      sendForm.recipientId.value = item.type === "group" ? "" : item.id;
      sendForm.conversationId.value = item.type === "group" ? item.id : "";
      threadTitle.textContent = item.title || "Conversation";
      threadSubtitle.textContent = item.subtitle || "Conversation";
      membersButton.hidden = item.type !== "group";
      document.body.classList.add("message-chat-open");
      renderConversations();
      await loadThread();
    };

    const loadAll = async (silent = false) => {
      if (!silent)
        convRoot.innerHTML = `<p class="muted">Loading conversations...</p>`;
      const [usersPayload, conversationsPayload] = await Promise.all([
        apiFetch("/api/messages/users").catch(() => []),
        apiFetch("/api/messages/conversations").catch(() => []),
      ]);
      users = normalizeRows(usersPayload);
      conversations = normalizeRows(conversationsPayload);
      groupMembers.innerHTML = users
        .filter((user) => String(entityId(user)) !== currentUserId())
        .map(
          (user) =>
            `<option value="${escapeHtml(entityId(user))}">${escapeHtml(fullName(user))} - ${escapeHtml(user.jobTitle || "User")}</option>`,
        )
        .join("");
      renderConversations();
      if (activeConversation?.id) {
        const refreshed = mergeConversationItems().find(
          (item) =>
            item.type === activeConversation.type &&
            item.id === activeConversation.id,
        );
        if (refreshed) activeConversation = refreshed;
        await loadThread(true);
      }
    };

    const renderSelectedFiles = () => {
      attachmentsRoot.innerHTML = selectedFiles.length
        ? selectedFiles
            .map(
              (file, index) => `
        <span class="attachment-chip">
          ${file.type?.startsWith("image/") ? "Image" : "File"}: ${escapeHtml(file.name)}
          <button type="button" data-remove-attachment="${index}" aria-label="Remove attachment">x</button>
        </span>
      `,
            )
            .join("")
        : "";
    };

    sendForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!activeConversation?.id) return;
      const body = sendForm.body.value.trim();
      if (!body && !selectedFiles.length) return;
      const formData = new FormData();
      if (sendForm.recipientId.value)
        formData.append("recipientId", sendForm.recipientId.value);
      if (sendForm.conversationId.value)
        formData.append("conversationId", sendForm.conversationId.value);
      formData.append("body", body);
      selectedFiles.forEach((file) => formData.append("attachments", file));
      const nextHeaders = headers();
      delete nextHeaders["Content-Type"];
      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: nextHeaders,
          body: formData,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(data.message || "Failed to send message");
        sendForm.body.value = "";
        selectedFiles = [];
        filesInput.value = "";
        renderSelectedFiles();
        await loadAll(true);
      } catch (error) {
        alert(error.message);
      }
    });

    filesInput?.addEventListener("change", (event) => {
      selectedFiles = [
        ...selectedFiles,
        ...Array.from(event.target.files || []),
      ].slice(0, 5);
      renderSelectedFiles();
    });
    attachmentsRoot?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-attachment]");
      if (!button) return;
      selectedFiles.splice(Number(button.dataset.removeAttachment), 1);
      renderSelectedFiles();
    });
    $("[data-pick-attachments]")?.addEventListener("click", () =>
      filesInput?.click(),
    );
    search?.addEventListener("input", renderConversations);
    $("[data-message-back]")?.addEventListener("click", () =>
      document.body.classList.remove("message-chat-open"),
    );
    $("[data-open-group-modal]")?.addEventListener("click", () => {
      groupStatus.textContent = "";
      groupDialog.showModal();
    });
    $$("[data-close-group]").forEach((button) =>
      button.addEventListener("click", () => groupDialog.close()),
    );
    groupForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const memberIds = Array.from(groupMembers.selectedOptions).map(
        (option) => option.value,
      );
      try {
        const payload = await apiFetch("/api/messages/groups", {
          method: "POST",
          body: JSON.stringify({ name: groupForm.name.value, memberIds }),
        });
        groupDialog.close();
        groupForm.reset();
        await loadAll(true);
        const group = payload.data?.group;
        if (group?._id || group?.id) {
          const id = String(group._id || group.id);
          const item = mergeConversationItems().find(
            (conversation) =>
              conversation.type === "group" && conversation.id === id,
          );
          if (item) await selectConversation(item);
        }
      } catch (error) {
        groupStatus.textContent = error.message;
      }
    });
    membersButton?.addEventListener("click", () => {
      renderGroupMembers();
      membersDialog.showModal();
    });
    $$("[data-close-members]").forEach((button) =>
      button.addEventListener("click", () => membersDialog.close()),
    );
    if (window.EventSource) {
      const stream = new EventSource("/api/events/stream");
      stream.addEventListener("airms:data-changed", (event) => {
        try {
          const payload = JSON.parse(event.data || "{}");
          if (String(payload.url || "").startsWith("/api/messages"))
            loadAll(true);
        } catch {
          loadAll(true);
        }
      });
      stream.addEventListener("data-changed", () => loadAll(true));
    }
    syncTimer = window.setInterval(() => {
      if (document.visibilityState !== "hidden") loadAll(true);
    }, 5000);
    window.addEventListener("beforeunload", () => clearInterval(syncTimer));
    loadAll();
  };

  const initProfile = () => {
    const page = $("[data-profile-page]");
    const root = $("[data-profile-details]");
    if (!root) return;
    let user = getUser();
    const settingsKey = "webProfileSettings";
    const fontRecommended = 1;
    const fontMax = 1.3;

    const profileImage = (path) =>
      path ? (String(path).startsWith("http") ? path : path) : "";
    const renderAvatar = () => {
      const avatar = $("[data-profile-avatar]");
      if (!avatar || !user) return;
      const image = profileImage(user.image);
      if (image) avatar.innerHTML = `<img src="${escapeHtml(image)}" alt="" />`;
      else
        avatar.textContent =
          `${String(user.firstName || "U").charAt(0)}${String(user.lastName || "").charAt(0)}`.toUpperCase();
    };
    const renderDetails = () => {
      if (!user) {
        root.innerHTML = `<dt>Status</dt><dd>No stored session. Login first.</dd>`;
        return;
      }
      const details = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        jobTitle: user.jobTitle,
        lastLogin: user.lastLogin
          ? new Date(user.lastLogin).toLocaleString("en-PH")
          : "Never",
      };
      root.innerHTML = Object.entries(details)
        .map(
          ([key, value]) =>
            `<dt>${escapeHtml(labelize(key))}</dt><dd>${escapeHtml(value || "-")}</dd>`,
        )
        .join("");
      renderAvatar();
    };
    const setProfileTab = (tab) => {
      $$("[data-profile-tab]").forEach((button) =>
        button.classList.toggle("active", button.dataset.profileTab === tab),
      );
      $$("[data-profile-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.profilePanel !== tab;
      });
    };
    const setSecurityTab = (tab) => {
      $$("[data-security-tab]").forEach((button) =>
        button.classList.toggle("active", button.dataset.securityTab === tab),
      );
      $$("[data-security-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.securityPanel !== tab;
      });
    };
    const applyFontScale = (scale) => {
      const clamped = Math.min(
        Math.max(Number(scale) || fontRecommended, fontRecommended),
        fontMax,
      );
      document.documentElement.style.fontSize = `${(16 * clamped).toFixed(1)}px`;
      const label = $("[data-font-scale-label]");
      if (label) label.textContent = `Current: ${clamped.toFixed(2)}x`;
      return clamped;
    };
    const loadSettings = () => {
      let stored = {};
      try {
        stored = JSON.parse(localStorage.getItem(settingsKey) || "{}");
      } catch {
        stored = {};
      }
      const fontScale =
        typeof stored.fontSizePreference === "number"
          ? stored.fontSizePreference
          : fontRecommended;
      const notifications =
        typeof stored.notificationsEnabled === "boolean"
          ? stored.notificationsEnabled
          : true;
      const range = $("[data-font-scale]");
      const toggle = $("[data-browser-notifications]");
      if (range) range.value = String(applyFontScale(fontScale));
      if (toggle) toggle.checked = notifications;
      const permission = $("[data-notification-permission]");
      if (permission)
        permission.textContent = `Browser permission: ${typeof Notification === "undefined" ? "Unavailable" : Notification.permission}`;
    };
    const saveSettings = (next) => {
      let stored = {};
      try {
        stored = JSON.parse(localStorage.getItem(settingsKey) || "{}");
      } catch {
        stored = {};
      }
      localStorage.setItem(settingsKey, JSON.stringify({ ...stored, ...next }));
      window.dispatchEvent(new Event("web-settings-updated"));
    };
    const updateStoredUser = (next) => {
      user = { ...user, ...next, id: next?.id || next?._id || user?.id };
      saveStoredUser(user);
      renderDetails();
    };
    const submitImage = async (file) => {
      if (!user?.id || !file) return;
      const status = $("[data-profile-image-status]");
      const formData = new FormData();
      formData.append("image", file);
      const nextHeaders = headers();
      delete nextHeaders["Content-Type"];
      try {
        const response = await fetch(
          `/api/user/update-user-image/${encodeURIComponent(user.id)}`,
          { method: "PUT", headers: nextHeaders, body: formData },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(data.message || "Failed to upload image");
        updateStoredUser(data.user || {});
        if (status) status.textContent = "Image updated!";
      } catch (error) {
        if (status) status.textContent = error.message;
      }
    };

    renderDetails();
    if (!page || !user) return;
    loadSettings();
    $$("[data-profile-tab]").forEach((button) =>
      button.addEventListener("click", () =>
        setProfileTab(button.dataset.profileTab),
      ),
    );
    $$("[data-security-tab]").forEach((button) =>
      button.addEventListener("click", () =>
        setSecurityTab(button.dataset.securityTab),
      ),
    );
    $("[data-profile-pick-image]")?.addEventListener("click", () =>
      $("[data-profile-image]")?.click(),
    );
    $("[data-profile-image]")?.addEventListener("change", (event) =>
      submitImage(event.target.files?.[0]),
    );
    $("[data-profile-remove-image]")?.addEventListener("click", async () => {
      if (!confirm("Delete profile picture?")) return;
      const status = $("[data-profile-image-status]");
      try {
        const data = await apiFetch(
          `/api/user/update-user-image/${encodeURIComponent(user.id)}`,
          { method: "DELETE" },
        );
        updateStoredUser(data.user || { image: "" });
        if (status) status.textContent = "Profile picture removed!";
      } catch (error) {
        if (status) status.textContent = error.message;
      }
    });
    const passwordForm = $("[data-password-form]");
    const strength = $("[data-password-strength]");
    passwordForm?.addEventListener("input", () => {
      const password = passwordForm.newPassword.value;
      const passed = [
        password.length >= 8,
        /[A-Z]/.test(password),
        /\d/.test(password),
        /[a-z]/.test(password),
      ].filter(Boolean).length;
      if (!password) strength.textContent = "";
      else if (passed <= 2) {
        strength.textContent = "Weak Password";
        strength.style.color = "#ff4d4f";
      } else if (passed === 3) {
        strength.textContent = "Moderate Password";
        strength.style.color = "#b7791f";
      } else {
        strength.textContent = "Strong Password";
        strength.style.color = "#087443";
      }
    });
    passwordForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = $("[data-password-status]");
      const body = Object.fromEntries(new FormData(passwordForm).entries());
      if (body.newPassword !== body.confirmPassword) {
        if (status) status.textContent = "Passwords do not match.";
        return;
      }
      try {
        const data = await apiFetch(
          `/api/user/change-password/${encodeURIComponent(user.id)}`,
          { method: "PUT", body: JSON.stringify(body) },
        );
        if (status)
          status.textContent = data.message || "Password updated successfully!";
        passwordForm.reset();
      } catch (error) {
        if (status) status.textContent = error.message;
      }
    });
    $("[data-pin-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = $("[data-pin-status]");
      const body = Object.fromEntries(
        new FormData(event.currentTarget).entries(),
      );
      if (body.newPin !== body.confirmPin) {
        if (status) status.textContent = "PIN values do not match.";
        return;
      }
      try {
        const data = await apiFetch(
          `/api/user/update-pin/${encodeURIComponent(user.id)}`,
          { method: "PUT", body: JSON.stringify(body) },
        );
        if (status) status.textContent = data.message || "PIN updated!";
        event.currentTarget.reset();
      } catch (error) {
        if (status) status.textContent = error.message;
      }
    });
    const pinResetForm = $("[data-pin-reset-form]");
    let pinResetToken = "";
    const setPinResetStep = (step) =>
      $$("[data-pin-reset-step]").forEach((panel) => {
        panel.hidden = panel.dataset.pinResetStep !== step;
      });
    $("[data-forgot-pin]")?.addEventListener("click", () => {
      $("[data-pin-form]").hidden = true;
      pinResetForm.hidden = false;
      setPinResetStep("password");
    });
    $("[data-cancel-pin-reset]")?.addEventListener("click", () => {
      pinResetForm.hidden = true;
      $("[data-pin-form]").hidden = false;
      pinResetToken = "";
    });
    $$("[data-send-pin-otp]").forEach((button) =>
      button.addEventListener("click", async () => {
        const status = $("[data-pin-status]");
        try {
          const data = await apiFetch(
            `/api/user/request-pin-reset/${encodeURIComponent(user.id)}`,
            {
              method: "POST",
              body: JSON.stringify({
                currentPassword: pinResetForm.currentPassword.value,
              }),
            },
          );
          pinResetToken = data.token;
          if (status)
            status.textContent = data.message || "Verification OTP sent.";
          setPinResetStep("otp");
        } catch (error) {
          if (status) status.textContent = error.message;
        }
      }),
    );
    $("[data-verify-pin-otp]")?.addEventListener("click", async () => {
      const status = $("[data-pin-status]");
      try {
        const data = await apiFetch("/api/user/verify-pin-otp", {
          method: "POST",
          body: JSON.stringify({
            token: pinResetToken,
            otp: pinResetForm.otp.value,
          }),
        });
        if (status) status.textContent = data.message || "OTP verified.";
        setPinResetStep("new");
      } catch (error) {
        if (status) status.textContent = error.message;
      }
    });
    $("[data-reset-pin]")?.addEventListener("click", async () => {
      const status = $("[data-pin-status]");
      if (pinResetForm.newPin.value !== pinResetForm.confirmPin.value) {
        if (status) status.textContent = "PIN values do not match.";
        return;
      }
      try {
        const data = await apiFetch("/api/user/reset-pin", {
          method: "POST",
          body: JSON.stringify({
            token: pinResetToken,
            newPin: pinResetForm.newPin.value,
          }),
        });
        if (status)
          status.textContent = data.message || "PIN reset successfully!";
        pinResetForm.reset();
        pinResetForm.hidden = true;
        $("[data-pin-form]").hidden = false;
      } catch (error) {
        if (status) status.textContent = error.message;
      }
    });
    $("[data-font-scale]")?.addEventListener("input", (event) => {
      const value = applyFontScale(event.target.value);
      saveSettings({ fontSizePreference: value });
    });
    $("[data-browser-notifications]")?.addEventListener(
      "change",
      async (event) => {
        let enabled = event.target.checked;
        if (enabled && typeof Notification !== "undefined") {
          const permission = await Notification.requestPermission();
          enabled = permission === "granted";
          event.target.checked = enabled;
        }
        saveSettings({ notificationsEnabled: enabled });
        const permission = $("[data-notification-permission]");
        if (permission)
          permission.textContent = `Browser permission: ${typeof Notification === "undefined" ? "Unavailable" : Notification.permission}`;
      },
    );
  };

  initSessionGuards();
  initLayout();
  initLogin();
  initOtpForm();
  initApiForms();
  initNotifications();
  initActivityLogs();
  initUserManagement();
  initFlightLogPage();
  initInspectionPage();
  initTaskAssignmentPage();
  initMechanicsPage();
  initMaintenanceLogPage();
  initPartsLifespanPage();
  initMaintenanceTrackingPage();
  initMaintenancePriorityPage();
  initMaintenanceReportsPage();
  initPartsRequisitionPage();
  initCrudPage();
  initMessages();
  initProfile();
})();
