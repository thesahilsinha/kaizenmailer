const API_URL = "/api/send";
const PIN = "210403";

// ── AUTH ────────────────────────────────────────────────
const inputs = document.querySelectorAll(".pin-input");

inputs.forEach((input, i) => {
  input.addEventListener("input", (e) => {
    const val = e.target.value.replace(/\D/g, "");
    e.target.value = val;
    if (val && i < inputs.length - 1) inputs[i + 1].focus();
    checkPin();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !input.value && i > 0) inputs[i - 1].focus();
  });
  input.addEventListener("paste", (e) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    paste.split("").forEach((char, j) => { if (inputs[j]) inputs[j].value = char; });
    checkPin();
    e.preventDefault();
  });
});

function checkPin() {
  const entered = Array.from(inputs).map((i) => i.value).join("");
  if (entered.length < 6) return;
  if (entered === PIN) {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("app").style.display = "flex";
    document.getElementById("app").style.width = "100%";
  } else {
    inputs.forEach((i) => { i.value = ""; i.classList.add("error"); });
    document.getElementById("pinError").textContent = "Wrong code. Try again.";
    setTimeout(() => {
      inputs.forEach((i) => i.classList.remove("error"));
      inputs[0].focus();
    }, 600);
  }
}

inputs[0].focus();

// ── STATE ───────────────────────────────────────────────
let sentLog = [];
let templates = JSON.parse(localStorage.getItem("kz_templates") || "[]");
let clients = JSON.parse(localStorage.getItem("kz_clients") || "[]");
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
    if (view === "clients") renderClients();
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

// ── VARIABLES ───────────────────────────────────────────
function applyVars(html) {
  return html
    .replace(/\{\{name\}\}/gi, document.getElementById("varName").value || "{{name}}")
    .replace(/\{\{company\}\}/gi, document.getElementById("varCompany").value || "{{company}}")
    .replace(/\{\{email\}\}/gi, document.getElementById("varEmail").value || "{{email}}")
    .replace(/\{\{phone\}\}/gi, document.getElementById("varPhone").value || "{{phone}}")
    .replace(/\{\{city\}\}/gi, document.getElementById("varCity").value || "{{city}}")
    .replace(/\{\{custom\}\}/gi, document.getElementById("varCustom").value || "{{custom}}");
}

// ── STATUS ──────────────────────────────────────────────
function showStatus(type, msg) {
  const box = document.getElementById("statusBox");
  box.style.display = "flex";
  box.className = `status-box ${type}`;
  box.textContent = msg;
}

// ── PREVIEW ─────────────────────────────────────────────
function switchToPreview() {
  const html = document.getElementById("htmlBody").value.trim();
  if (!html) { showStatus("error", "Paste your HTML first."); return; }

  previewOpen = true;
  document.getElementById("previewPanel").classList.add("open");
  document.querySelector(".compose-grid").classList.add("preview-open");

  const to = document.getElementById("to").value || "client@example.com";
  const subject = document.getElementById("subject").value || "(no subject)";
  document.getElementById("previewMeta").innerHTML = `<strong>To:</strong> ${to} &nbsp;|&nbsp; <strong>Subject:</strong> ${subject}`;

  const frame = document.getElementById("previewFrame");
  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(applyVars(html));
  doc.close();
}

function closePreview() {
  previewOpen = false;
  document.getElementById("previewPanel").classList.remove("open");
  document.querySelector(".compose-grid").classList.remove("preview-open");
}

["to", "subject", "htmlBody", "varName", "varCompany", "varEmail", "varPhone", "varCity", "varCustom"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", () => { if (previewOpen) switchToPreview(); });
});

// ── TEMPLATES ───────────────────────────────────────────
function saveAsTemplate() {
  const html = document.getElementById("htmlBody").value.trim();
  if (!html) { showStatus("error", "Nothing to save — paste HTML first."); return; }
  document.getElementById("modalOverlay").classList.add("open");
  document.getElementById("templateName").value = "";
  setTimeout(() => document.getElementById("templateName").focus(), 100);
}

function confirmSaveTemplate() {
  const name = document.getElementById("templateName").value.trim();
  if (!name) return;
  templates.push({ id: Date.now(), name, html: document.getElementById("htmlBody").value.trim() });
  localStorage.setItem("kz_templates", JSON.stringify(templates));
  updateTemplatePicker();
  closeModal();
  showStatus("success", `Template "${name}" saved.`);
}

function closeModal() { document.getElementById("modalOverlay").classList.remove("open"); }

function loadTemplate() {
  const picker = document.getElementById("templatePicker");
  const id = parseInt(picker.value);
  if (!id) return;
  const tmpl = templates.find((t) => t.id === id);
  if (tmpl) { document.getElementById("htmlBody").value = tmpl.html; if (previewOpen) switchToPreview(); }
  picker.value = "";
}

function renderTemplates() {
  const list = document.getElementById("templatesList");
  const empty = document.getElementById("noTemplates");
  if (!templates.length) { list.innerHTML = ""; empty.style.display = "flex"; return; }
  empty.style.display = "none";
  list.innerHTML = templates.map((t) => `
    <div class="template-card">
      <div class="template-card-name">${escHtml(t.name)}</div>
      <div class="template-card-preview">${escHtml(t.html.substring(0, 80))}…</div>
      <div class="template-card-actions">
        <button class="tc-btn tc-load" onclick="loadTemplateById(${t.id})">Load</button>
        <button class="tc-btn tc-del" onclick="deleteTemplate(${t.id})">Delete</button>
      </div>
    </div>`).join("");
}

function loadTemplateById(id) {
  const tmpl = templates.find((t) => t.id === id);
  if (!tmpl) return;
  document.getElementById("htmlBody").value = tmpl.html;
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

// ── CLIENTS ─────────────────────────────────────────────
function renderClients() {
  const list = document.getElementById("clientsList");
  const empty = document.getElementById("noClients");
  const q = (document.getElementById("clientSearch")?.value || "").toLowerCase();

  const filtered = clients.filter((c) =>
    (c.name + c.company + c.email).toLowerCase().includes(q)
  );

  if (!filtered.length) { list.innerHTML = ""; empty.style.display = "flex"; return; }
  empty.style.display = "none";

  list.innerHTML = filtered.map((c) => `
    <div class="client-card">
      <div class="client-card-top">
        <div class="client-avatar">${initials(c.name)}</div>
        <div>
          <div class="client-name">${escHtml(c.name)}</div>
          <div class="client-company">${escHtml(c.company || "")}</div>
        </div>
      </div>
      ${c.custom ? `<div class="client-tag">${escHtml(c.custom)}</div>` : ""}
      <div class="client-meta">
        ${c.email ? `<div class="client-meta-row">Email &nbsp;<span>${escHtml(c.email)}</span></div>` : ""}
        ${c.phone ? `<div class="client-meta-row">Phone &nbsp;<span>${escHtml(c.phone)}</span></div>` : ""}
        ${c.city ? `<div class="client-meta-row">City &nbsp;<span>${escHtml(c.city)}</span></div>` : ""}
        ${c.notes ? `<div class="client-meta-row" style="margin-top:6px;color:var(--text3);font-size:11px;line-height:1.6;">${escHtml(c.notes)}</div>` : ""}
      </div>
      <div class="client-actions">
        <button class="cc-btn cc-compose" onclick="loadClientIntoComposeById(${c.id})">Compose</button>
        <button class="cc-btn cc-edit" onclick="openEditClientModal(${c.id})">Edit</button>
        <button class="cc-btn cc-del" onclick="deleteClient(${c.id})">Delete</button>
      </div>
    </div>`).join("");

  updateClientQuickLoad();
}

function openAddClientModal() {
  document.getElementById("clientModalTitle").textContent = "Add Client";
  document.getElementById("cEditId").value = "";
  ["cName","cCompany","cEmail","cPhone","cCity","cCustom","cNotes"].forEach((id) => document.getElementById(id).value = "");
  document.getElementById("clientModalOverlay").classList.add("open");
  setTimeout(() => document.getElementById("cName").focus(), 100);
}

function openEditClientModal(id) {
  const c = clients.find((x) => x.id === id);
  if (!c) return;
  document.getElementById("clientModalTitle").textContent = "Edit Client";
  document.getElementById("cEditId").value = id;
  document.getElementById("cName").value = c.name || "";
  document.getElementById("cCompany").value = c.company || "";
  document.getElementById("cEmail").value = c.email || "";
  document.getElementById("cPhone").value = c.phone || "";
  document.getElementById("cCity").value = c.city || "";
  document.getElementById("cCustom").value = c.custom || "";
  document.getElementById("cNotes").value = c.notes || "";
  document.getElementById("clientModalOverlay").classList.add("open");
}

function confirmSaveClient() {
  const name = document.getElementById("cName").value.trim();
  const email = document.getElementById("cEmail").value.trim();
  if (!name || !email) { alert("Name and email are required."); return; }

  const editId = document.getElementById("cEditId").value;
  const data = {
    id: editId ? parseInt(editId) : Date.now(),
    name,
    company: document.getElementById("cCompany").value.trim(),
    email,
    phone: document.getElementById("cPhone").value.trim(),
    city: document.getElementById("cCity").value.trim(),
    custom: document.getElementById("cCustom").value.trim(),
    notes: document.getElementById("cNotes").value.trim(),
  };

  if (editId) {
    clients = clients.map((c) => c.id === parseInt(editId) ? data : c);
  } else {
    clients.push(data);
  }

  localStorage.setItem("kz_clients", JSON.stringify(clients));
  closeClientModal();
  renderClients();
}

function saveCurrentAsClient() {
  const name = document.getElementById("varName").value.trim();
  const email = document.getElementById("varEmail").value.trim() || document.getElementById("to").value.trim();
  if (!name) { showStatus("error", "Fill in {{name}} first."); return; }
  document.getElementById("clientModalTitle").textContent = "Save as Client";
  document.getElementById("cEditId").value = "";
  document.getElementById("cName").value = name;
  document.getElementById("cCompany").value = document.getElementById("varCompany").value;
  document.getElementById("cEmail").value = email;
  document.getElementById("cPhone").value = document.getElementById("varPhone").value;
  document.getElementById("cCity").value = document.getElementById("varCity").value;
  document.getElementById("cCustom").value = document.getElementById("varCustom").value;
  document.getElementById("cNotes").value = "";
  document.getElementById("clientModalOverlay").classList.add("open");
}

function deleteClient(id) {
  clients = clients.filter((c) => c.id !== id);
  localStorage.setItem("kz_clients", JSON.stringify(clients));
  renderClients();
}

function closeClientModal() { document.getElementById("clientModalOverlay").classList.remove("open"); }

function loadClientIntoComposeById(id) {
  const c = clients.find((x) => x.id === id);
  if (!c) return;
  document.getElementById("to").value = c.email || "";
  document.getElementById("varName").value = c.name || "";
  document.getElementById("varCompany").value = c.company || "";
  document.getElementById("varEmail").value = c.email || "";
  document.getElementById("varPhone").value = c.phone || "";
  document.getElementById("varCity").value = c.city || "";
  document.getElementById("varCustom").value = c.custom || "";
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.querySelector('[data-view="compose"]').classList.add("active");
  document.getElementById("view-compose").classList.add("active");
  if (previewOpen) switchToPreview();
}

function loadClientIntoCompose() {
  const picker = document.getElementById("clientQuickLoad");
  const id = parseInt(picker.value);
  if (!id) return;
  loadClientIntoComposeById(id);
  picker.value = "";
}

function updateClientQuickLoad() {
  const picker = document.getElementById("clientQuickLoad");
  picker.innerHTML = `<option value="">Load a saved client…</option>` +
    clients.map((c) => `<option value="${c.id}">${escHtml(c.name)}${c.company ? " — " + escHtml(c.company) : ""}</option>`).join("");
}

// ── SENT LOG ────────────────────────────────────────────
function renderSentLog() {
  const list = document.getElementById("sentList");
  const empty = document.getElementById("noSent");
  if (!sentLog.length) { list.innerHTML = ""; empty.style.display = "flex"; return; }
  empty.style.display = "none";
  list.innerHTML = sentLog.map((s) => `
    <div class="sent-item">
      <div class="sent-dot"></div>
      <div class="sent-info">
        <div class="sent-to">${escHtml(s.to)}</div>
        <div class="sent-subject">${escHtml(s.subject)}</div>
      </div>
      <div class="sent-time">${s.date}<br/>${s.time}</div>
    </div>`).join("");
}

// ── UTILS ───────────────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function initials(name) {
  return name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

// ── INIT ────────────────────────────────────────────────
updateTemplatePicker();
updateClientQuickLoad();