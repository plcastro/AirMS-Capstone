async function fetchHealth() {
  const el = document.getElementById("health-status");
  if (!el) return;
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    el.textContent = `${data.status} (${data.service})`;
  } catch {
    el.textContent = "Unavailable";
  }
}

function initSSE() {
  const list = document.getElementById("event-feed");
  if (!list) return;
  const es = new EventSource("/api/events/stream");
  es.addEventListener("airms:data-changed", (evt) => {
    const li = document.createElement("li");
    li.textContent = evt.data;
    list.prepend(li);
    while (list.children.length > 8) list.removeChild(list.lastChild);
  });
}

function initLogin() {
  const form = document.getElementById("login-form");
  if (!form) return;
  const result = document.getElementById("login-result");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());
    const res = await fetch("/api/user/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    result.textContent = JSON.stringify(data, null, 2);
    if (data.accessToken) localStorage.setItem("airms_token", data.accessToken);
  });
}

function initReports() {
  const pdf = document.getElementById("download-pdf");
  const docx = document.getElementById("download-docx");
  const note = document.getElementById("report-note");
  if (!pdf || !docx || !note) return;
  note.textContent = "Use backend utility functions in endpoints to return files.";
}

function initMessages() {
  const btn = document.getElementById("load-messages");
  const out = document.getElementById("messages-result");
  if (!btn || !out) return;
  btn.addEventListener("click", async () => {
    const token = localStorage.getItem("airms_token");
    if (!token) {
      out.textContent = "Login first to store a token.";
      return;
    }
    const res = await fetch("/api/messages/conversations", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    out.textContent = JSON.stringify(data, null, 2);
  });
}

fetchHealth();
initSSE();
initLogin();
initReports();
initMessages();
