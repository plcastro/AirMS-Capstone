(() => {
  const TOKEN_KEY = "airms_flask_token";
  const USER_KEY = "airms_flask_user";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const getToken = () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || "";
  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  };

  const storeSession = (data, remember) => {
    const storage = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    const token = data.token || data.accessToken;
    if (token) storage.setItem(TOKEN_KEY, token);
    if (data.user) storage.setItem(USER_KEY, JSON.stringify(data.user));
    other.removeItem(TOKEN_KEY);
    other.removeItem(USER_KEY);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    window.location.href = "/web/login";
  };

  const headers = (extra = {}) => {
    const token = getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    };
  };

  const apiFetch = async (url, options = {}) => {
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
    if (!response.ok) {
      const message = data?.message || data?.detail || response.statusText || "Request failed";
      throw new Error(message);
    }
    return data;
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
      return Object.entries(payload).map(([metric, value]) => ({ metric, value }));
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
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);

  const fillTemplate = (template, row) => String(template || "").replace("{id}", encodeURIComponent(getId(row)));

  const initLayout = () => {
    const user = getUser();
    const pill = $("#current-user-pill");
    if (pill && user) {
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "AirMS User";
      pill.textContent = `${name} - ${user.jobTitle || user.access || "web"}`;
    }
    $$("[data-logout]").forEach((button) => button.addEventListener("click", logout));
  };

  const initLogin = () => {
    const form = $("[data-login-form]");
    if (!form) return;
    const result = $("[data-login-result]");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(form).entries());
      body.rememberMe = Boolean(form.querySelector("[name='rememberMe']")?.checked);
      body.client = "web";
      try {
        const data = await apiFetch(form.action, {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "x-base": body.base || "" },
        });
        storeSession(data, body.rememberMe);
        if (result) result.textContent = "Login successful. Redirecting...";
        window.location.href = "/web/dashboard/maintenance-dashboard";
      } catch (error) {
        if (result) result.textContent = error.message;
      }
    });
  };

  const initApiForms = () => {
    $$("[data-api-form]").forEach((form) => {
      const result = form.querySelector("[data-form-result]") || $(`[data-form-result="${form.dataset.result || ""}"]`);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const body = Object.fromEntries(new FormData(form).entries());
        try {
          const data = await apiFetch(form.action, {
            method: form.method || "POST",
            body: JSON.stringify(body),
          });
          if (result) result.textContent = data?.message || JSON.stringify(data, null, 2);
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
      const filtered = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query));
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
          td.innerHTML = col.toLowerCase().includes("status") || col.toLowerCase().includes("priority")
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
            btn.className = status === "deactivated" ? "btn danger small" : "btn ghost small";
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
      (config.fields || []).forEach((field) => fieldsRoot.appendChild(buildInput(field, row?.[field.name] || "")));
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
      const url = isEditing ? fillTemplate(config.update, editingRow) : config.create;
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
        await apiFetch(fillTemplate(action.url, row), { method: action.method || "POST", body: JSON.stringify({}) });
        await load();
      } catch (error) {
        alert(error.message);
      }
    };

    const updateStatus = async (row, status) => {
      try {
        await apiFetch(fillTemplate(config.status, row), { method: "PUT", body: JSON.stringify({ status }) });
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
    $$("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => dialog?.close()));
    load();
  };

  const initMessages = () => {
    if (!$("[data-messages-page]")) return;
    const usersRoot = $("[data-message-users]");
    const convRoot = $("[data-conversations]");
    const threadRoot = $("[data-thread]");
    const threadTitle = $("[data-thread-title]");
    const sendForm = $("[data-send-message]");

    const renderList = (root, rows, onClick) => {
      root.innerHTML = "";
      if (!rows.length) {
        root.innerHTML = `<p class="muted">No records found.</p>`;
        return;
      }
      rows.forEach((row) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "list-item";
        item.innerHTML = `<strong>${escapeHtml(row.username || row.name || row.title || getId(row))}</strong><br><span class="muted">${escapeHtml(row.jobTitle || row.email || row.lastMessage || "")}</span>`;
        item.addEventListener("click", () => onClick(row));
        root.appendChild(item);
      });
    };

    const loadUsers = async () => {
      try {
        const users = normalizeRows(await apiFetch("/api/messages/users"));
        renderList(usersRoot, users, (row) => loadThread(getId(row), row.username));
      } catch (error) {
        usersRoot.textContent = error.message;
      }
    };

    const loadConversations = async () => {
      try {
        const conversations = normalizeRows(await apiFetch("/api/messages/conversations"));
        renderList(convRoot, conversations, (row) => loadThread(getId(row), row.title || "Conversation"));
      } catch (error) {
        convRoot.textContent = error.message;
      }
    };

    const loadThread = async (id, label) => {
      if (!id) return;
      sendForm.to.value = id;
      threadTitle.textContent = label || "Thread";
      try {
        const rows = normalizeRows(await apiFetch(`/api/messages/${encodeURIComponent(id)}`));
        threadRoot.innerHTML = rows.length ? "" : `<p class="muted">No messages yet.</p>`;
        rows.forEach((message) => {
          const bubble = document.createElement("div");
          bubble.className = `bubble ${message.from === getUser()?.id ? "mine" : ""}`;
          bubble.textContent = message.body || message.message || message.text || JSON.stringify(message);
          threadRoot.appendChild(bubble);
        });
      } catch (error) {
        threadRoot.textContent = error.message;
      }
    };

    sendForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(sendForm).entries());
      try {
        await apiFetch("/api/messages", { method: "POST", body: JSON.stringify(body) });
        await loadThread(body.to, "Thread");
        sendForm.body.value = "";
      } catch (error) {
        alert(error.message);
      }
    });
    $("[data-load-message-users]")?.addEventListener("click", loadUsers);
    $("[data-load-conversations]")?.addEventListener("click", loadConversations);
    loadUsers();
    loadConversations();
  };

  const initProfile = () => {
    const root = $("[data-profile-details]");
    if (!root) return;
    const user = getUser();
    if (!user) {
      root.innerHTML = `<dt>Status</dt><dd>No stored session. Login first.</dd>`;
      return;
    }
    const fields = ["id", "username", "email", "firstName", "lastName", "jobTitle", "access", "status", "base", "sessionId"];
    root.innerHTML = fields.map((key) => `<dt>${escapeHtml(labelize(key))}</dt><dd>${escapeHtml(valueAt(user, key))}</dd>`).join("");
  };

  initLayout();
  initLogin();
  initApiForms();
  initCrudPage();
  initMessages();
  initProfile();
})();
