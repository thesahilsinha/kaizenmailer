// ── CONFIG ──────────────────────────────────────────────
// When deployed on Vercel, this will automatically point to /api/send
// For local testing, set this to your deployed Vercel URL:
// e.g. "https://kaizen-mailer.vercel.app/api/send"
const API_URL = "/api/send";

// ── STATE ───────────────────────────────────────────────
let sentLog = [];
let templates = JSON.parse(localStorage.getItem("kz_templates") || "[]");
let previewOpen = false;

// ── NAVIGATION ──────────────────────────────────────────
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`view-${view}`).classList.add("active");
    if (view === "templates") renderTemplates();
    if (view === "sent") renderSentLog();
  });
});

// ── SEND EMAIL ──────────────────────────────────────────
async function sendEmail() {
  const to = document.getElementById("to").value.trim();
  const subject = document.getElementById("subject").value.trim();
  const htmlRaw = document.getElementById("htmlBody").value.trim();
  const previewText = document.getElementById("previewText").value.trim();

  if (!to || !subject || !htmlRaw) {
    showStatus("error", "Please fill in: To, Subject, and HTML Body.");
    return;
  }

  const html = applyVars(htmlRaw);

  const btn = document.getElementById("sendBtn");
  btn.disabled = true;
  showStatus("loading", "Sending…");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html, previewText }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showStatus("success", `✓ Sent to ${to}`);
      sentLog.unshift({
        to,
        subject,
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        date: new Date().toLocaleDateString("en-IN"),
      });
    } else {
      showStatus("error", `Error: ${data.error || "Unknown error"}`);
    }
  } catch (err) {
    showStatus("error", `Network error: ${err.message}`);
  }

  btn.disabled = false;
}

// ── VARIABLE SUBSTITUTION ───────────────────────────────
function applyVars(html) {
  const vars = {
    name: document.getElementById("varName").value || "{{name}}",
    company: document.getElementById("varCompany").value || "{{company}}",
    email: document.getElementById("varEmail").value || "{{email}}",
    phone: document.getElementById("varPhone").value || "{{phone}}",
    city: document.getElementById("varCity").value || "{{city}}",
    custom: document.getElementById("varCustom").value || "{{custom}}",
  };
  return html
    .replace(/\{\{name\}\}/gi, vars.name)
    .replace(/\{\{company\}\}/gi, vars.company)
    .replace(/\{\{email\}\}/gi, vars.email)
    .replace(/\{\{phone\}\}/gi, vars.phone)
    .replace(/\{\{city\}\}/gi, vars.city)
    .replace(/\{\{custom\}\}/gi, vars.custom);
}

// ── STATUS BOX ──────────────────────────────────────────
function showStatus(type, msg) {
  const box = document.getElementById("statusBox");
  box.style.display = "flex";
  box.className = `status-box ${type}`;
  const icons = {
    loading: "⏳",
    success: "✓",
    error: "✗",
  };
  box.textContent = `${icons[type] || ""} ${msg}`;
}

// ── PREVIEW ─────────────────────────────────────────────
function switchToPreview() {
  const html = document.getElementById("htmlBody").value.trim();
  if (!html) {
    showStatus("error", "Paste your HTML first.");
    return;
  }

  previewOpen = true;
  document.getElementById("previewPanel").classList.add("open");
  document.querySelector(".compose-grid").classList.add("preview-open");

  const to = document.getElementById("to").value || "client@example.com";
  const subject = document.getElementById("subject").value || "(no subject)";
  document.getElementById("previewMeta").innerHTML =
    `<strong>To:</strong> ${to} &nbsp;|&nbsp; <strong>Subject:</strong> ${subject}`;

  const frame = document.getElementById("previewFrame");
  const rendered = applyVars(html);
  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(rendered);
  doc.close();
}

function closePreview() {
  previewOpen = false;
  document.getElementById("previewPanel").classList.remove("open");
  document.querySelector(".compose-grid").classList.remove("preview-open");
}

// Auto-refresh preview if open on any input change
["to", "subject", "htmlBody", "varName", "varCompany", "varEmail", "varPhone", "varCity", "varCustom"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("input", () => {
      if (previewOpen) switchToPreview();
    });
  }
});

// ── TEMPLATES ───────────────────────────────────────────
function saveAsTemplate() {
  const html = document.getElementById("htmlBody").value.trim();
  if (!html) {
    showStatus("error", "Nothing to save — paste HTML first.");
    return;
  }
  document.getElementById("modalOverlay").classList.add("open");
  document.getElementById("templateName").value = "";
  setTimeout(() => document.getElementById("templateName").focus(), 100);
}

function confirmSaveTemplate() {
  const name = document.getElementById("templateName").value.trim();
  if (!name) return;
  const html = document.getElementById("htmlBody").value.trim();
  templates.push({ id: Date.now(), name, html });
  localStorage.setItem("kz_templates", JSON.stringify(templates));
  updateTemplatePicker();
  closeModal();
  showStatus("success", `Template "${name}" saved.`);
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
}

function loadTemplate() {
  const picker = document.getElementById("templatePicker");
  const id = parseInt(picker.value);
  if (!id) return;
  const tmpl = templates.find((t) => t.id === id);
  if (tmpl) {
    document.getElementById("htmlBody").value = tmpl.html;
    if (previewOpen) switchToPreview();
  }
  picker.value = "";
}

function renderTemplates() {
  const list = document.getElementById("templatesList");
  const empty = document.getElementById("noTemplates");

  if (!templates.length) {
    list.innerHTML = "";
    empty.style.display = "flex";
    return;
  }

  empty.style.display = "none";
  list.innerHTML = templates
    .map(
      (t) => `
    <div class="template-card" id="tmpl-${t.id}">
      <div class="template-card-name">${escHtml(t.name)}</div>
      <div class="template-card-preview">${escHtml(t.html.substring(0, 80))}…</div>
      <div class="template-card-actions">
        <button class="tc-btn tc-load" onclick="loadTemplateById(${t.id})">Load into Composer</button>
        <button class="tc-btn tc-del" onclick="deleteTemplate(${t.id})">Delete</button>
      </div>
    </div>`
    )
    .join("");
}

function loadTemplateById(id) {
  const tmpl = templates.find((t) => t.id === id);
  if (!tmpl) return;
  document.getElementById("htmlBody").value = tmpl.html;
  // Switch to compose view
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.querySelector('[data-view="compose"]').classList.add("active");
  document.getElementById("view-compose").classList.add("active");
  showStatus("success", `Template "${tmpl.name}" loaded.`);
}

function deleteTemplate(id) {
  templates = templates.filter((t) => t.id !== id);
  localStorage.setItem("kz_templates", JSON.stringify(templates));
  updateTemplatePicker();
  renderTemplates();
}

function updateTemplatePicker() {
  const picker = document.getElementById("templatePicker");
  picker.innerHTML = `<option value="">Load a saved template…</option>` +
    templates.map((t) => `<option value="${t.id}">${escHtml(t.name)}</option>`).join("");
}

// ── SENT LOG ────────────────────────────────────────────
function renderSentLog() {
  const list = document.getElementById("sentList");
  const empty = document.getElementById("noSent");

  if (!sentLog.length) {
    list.innerHTML = "";
    empty.style.display = "flex";
    return;
  }

  empty.style.display = "none";
  list.innerHTML = sentLog
    .map(
      (s) => `
    <div class="sent-item">
      <div class="sent-dot"></div>
      <div class="sent-info">
        <div class="sent-to">${escHtml(s.to)}</div>
        <div class="sent-subject">${escHtml(s.subject)}</div>
      </div>
      <div class="sent-time">${s.date}<br>${s.time}</div>
    </div>`
    )
    .join("");
}

// ── UTILS ───────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── INIT ────────────────────────────────────────────────
updateTemplatePicker();
