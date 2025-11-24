// ========== BASIC STATE (DEMO DATA) ==========

const state = {
  clients: [
    { id: 1, name: "Ahmet Yılmaz", country: "Germany", phone: "+90 555 111 22 33", status: "Active" },
    { id: 2, name: "Zeynep Demir", country: "Canada", phone: "+90 555 444 55 66", status: "Active" },
    { id: 3, name: "Ali Kurt", country: "UK", phone: "+90 532 000 11 22", status: "Prospect" }
  ],
  cases: [
    { id: 1, clientId: 1, visaType: "Work Visa", stage: "Documents", owner: "Ebubekir" },
    { id: 2, clientId: 2, visaType: "Student Visa", stage: "Embassy", owner: "Ebubekir" }
  ],
  visas: [
    { id: 1, date: "2025-11-26", clientId: 1, country: "Germany", center: "İstanbul", status: "Scheduled" },
    { id: 2, date: "2025-11-27", clientId: 2, country: "Canada", center: "Ankara", status: "Scheduled" }
  ],
  invoices: [
    { id: 1, date: "2025-11-01", clientId: 1, amount: 18000, status: "Paid" },
    { id: 2, date: "2025-11-10", clientId: 2, amount: 23000, status: "Pending" }
  ],
  campaigns: [
    { id: 1, channel: "Google", name: "Schengen Lead Gen", spend: 4200, leads: 38, source: "Search" },
    { id: 2, channel: "Meta", name: "Canada Student", spend: 3100, leads: 27, source: "IG Reels" },
    { id: 3, channel: "YouTube", name: "Vizerio Brand", spend: 1900, leads: 12, source: "In-Stream" }
  ],
  activity: []
};

let nextIds = {
  client: 4,
  case: 3,
  visa: 3,
  invoice: 3,
  campaign: 4
};

// Persist some things lightly
const settingsKey = "vizerio_settings";
const authKey = "vizerio_auth";

// ========== HELPERS ==========

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function logActivity(text) {
  const entry = {
    text,
    time: new Date().toLocaleString()
  };
  state.activity.unshift(entry);
  renderActivity();
}

function getClientName(id) {
  const c = state.clients.find((x) => x.id === id);
  return c ? c.name : "Unknown";
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// ========== LOGIN LOGIC ==========

const loginForm = document.getElementById("loginForm");
const statusEl = document.getElementById("status");
const loginScreen = document.getElementById("login-screen");
const appShell = document.getElementById("app-shell");
const logoutBtn = document.getElementById("logoutBtn");

function setStatus(message, type) {
  statusEl.textContent = message || "";
  statusEl.classList.remove("ok", "error");
  if (type) statusEl.classList.add(type);
}

function handleLogin() {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const pwd = document.getElementById("password").value.trim();

    if (!email || !pwd) {
      setStatus("Please fill in both fields.", "error");
      return;
    }

    if (pwd !== "admin123") {
      setStatus("Invalid password (demo: admin123).", "error");
      return;
    }

    localStorage.setItem(authKey, JSON.stringify({ email, ts: Date.now() }));
    setStatus("Login successful, redirecting…", "ok");

    setTimeout(() => {
      loginScreen.classList.add("hidden");
      appShell.classList.remove("hidden");
      initApp();
    }, 500);
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(authKey);
    appShell.classList.add("hidden");
    loginScreen.classList.remove("hidden");
  });
}

function checkAuthOnLoad() {
  const auth = localStorage.getItem(authKey);
  if (auth) {
    loginScreen.classList.add("hidden");
    appShell.classList.remove("hidden");
    initApp();
  } else {
    loginScreen.classList.remove("hidden");
  }
}

// ========== NAVIGATION (PAGES) ==========

function setupNavigation() {
  const navButtons = $$(".nav-item");
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.getAttribute("data-page");

      navButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      $$(".page").forEach((p) => p.classList.remove("active"));
      $(`#page-${page}`).classList.add("active");

      const titleMap = {
        dashboard: "Dashboard",
        clients: "Clients & Cases",
        visa: "Visa Appointments",
        accounting: "Accounting",
        marketing: "Marketing",
        activity: "Activity Logs",
        settings: "Settings"
      };
      $("#page-title").textContent = titleMap[page] || "Vizerio Office Hub";
    });
  });
}

// ========== RENDER FUNCTIONS ==========

function renderDashboard() {
  $("#todayDate").textContent = new Date().toLocaleDateString();

  $("#stat-clients").textContent = state.clients.length;
  $("#stat-cases").textContent = state.cases.length;
  $("#stat-invoices").textContent = state.invoices.length;
  $("#stat-adspend").textContent = state.campaigns.reduce((sum, c) => sum + c.spend, 0);

  const openCases = state.cases.filter((c) => c.stage !== "Completed").length;
  const pendingVisas = state.visas.filter((v) => v.status !== "Issued" && v.status !== "Rejected").length;
  $("#kpi-open-cases").textContent = openCases;
  $("#kpi-pending-visa").textContent = pendingVisas;

  const tags = [
    `Clients: ${state.clients.length}`,
    `Cases: ${state.cases.length}`,
    `Pending visas: ${pendingVisas}`,
    `Invoices: ${state.invoices.length}`,
    `Campaigns: ${state.campaigns.length}`
  ];
  const ul = $("#dashboard-tags");
  ul.innerHTML = "";
  tags.forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t;
    ul.appendChild(li);
  });

  const today = todayISO();
  const agenda = state.visas.filter((v) => v.date === today);
  const list = $("#todayAgenda");
  list.innerHTML = "";
  if (agenda.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No visa appointments today.";
    list.appendChild(li);
  } else {
    agenda.forEach((v) => {
      const li = document.createElement("li");
      li.textContent = `${v.date} – ${getClientName(v.clientId)} – ${v.country} (${v.center}) – ${v.status}`;
      list.appendChild(li);
    });
  }
}

function renderClients() {
  const tbody = $("#tbl-clients");
  tbody.innerHTML = "";
  state.clients.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.name}</td>
      <td>${c.country}</td>
      <td>${c.phone}</td>
      <td>${c.status}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderCases() {
  const tbody = $("#tbl-cases");
  tbody.innerHTML = "";
  state.cases.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${getClientName(c.clientId)}</td>
      <td>${c.visaType}</td>
      <td>${c.stage}</td>
      <td>${c.owner}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderVisas() {
  const tbody = $("#tbl-visas");
  tbody.innerHTML = "";
  state.visas
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((v) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${v.date}</td>
        <td>${getClientName(v.clientId)}</td>
        <td>${v.country}</td>
        <td>${v.center}</td>
        <td>${v.status}</td>
      `;
      tbody.appendChild(tr);
    });
}

function renderInvoices() {
  const tbody = $("#tbl-invoices");
  tbody.innerHTML = "";
  state.invoices
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((inv) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${inv.date}</td>
        <td>${getClientName(inv.clientId)}</td>
        <td>${inv.amount.toLocaleString("tr-TR")}</td>
        <td>${inv.status}</td>
      `;
      tbody.appendChild(tr);
    });

  const total = state.invoices.reduce((s, i) => s + i.amount, 0);
  const paid = state.invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const pending = total - paid;

  const ul = $("#accounting-summary");
  ul.innerHTML = "";
  ["Total: " + total.toLocaleString("tr-TR") + " ₺",
   "Paid: " + paid.toLocaleString("tr-TR") + " ₺",
   "Pending: " + pending.toLocaleString("tr-TR") + " ₺"
  ].forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t;
    ul.appendChild(li);
  });
}

function renderCampaigns() {
  const tbody = $("#tbl-campaigns");
  tbody.innerHTML = "";
  state.campaigns.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.channel}</td>
      <td>${c.name}</td>
      <td>${c.spend.toLocaleString("tr-TR")}</td>
      <td>${c.leads}</td>
      <td>${c.source}</td>
    `;
    tbody.appendChild(tr);
  });

  const totalSpend = state.campaigns.reduce((s, x) => s + x.spend, 0);
  const totalLeads = state.campaigns.reduce((s, x) => s + x.leads, 0);
  const cpl = totalLeads ? (totalSpend / totalLeads).toFixed(1) : "–";

  const ul = $("#marketing-summary");
  ul.innerHTML = "";
  [
    `Total spend: ${totalSpend.toLocaleString("tr-TR")} ₺`,
    `Total leads: ${totalLeads}`,
    `Avg CPL: ${cpl} ₺`
  ].forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t;
    ul.appendChild(li);
  });
}

function renderActivity() {
  const list = $("#activity-list");
  list.innerHTML = "";
  if (!state.activity.length) {
    const li = document.createElement("li");
    li.textContent = "No activity yet. Add a client, case, invoice or visa to see logs here.";
    list.appendChild(li);
    return;
  }
  state.activity.forEach((a) => {
    const li = document.createElement("li");
    li.textContent = `[${a.time}] ${a.text}`;
    list.appendChild(li);
  });
}

// ========== ADD ITEM HANDLERS (PROMPT-BASED DEMO) ==========

function setupActions() {
  $("#btn-add-client").addEventListener("click", () => {
    const name = prompt("Client name:");
    if (!name) return;
    const country = prompt("Target country (e.g. Germany):") || "Unknown";
    const phone = prompt("Phone:") || "";
    const status = prompt("Status (Active/Prospect):") || "Active";

    state.clients.push({ id: nextIds.client++, name, country, phone, status });
    renderClients();
    renderDashboard();
    logActivity(`New client created: ${name}`);
  });

  $("#btn-add-case").addEventListener("click", () => {
    if (!state.clients.length) {
      alert("You must create a client first.");
      return;
    }
    const clientName = prompt("Client name for this case (must exist):");
    const client = state.clients.find((c) => c.name.toLowerCase() === (clientName || "").toLowerCase());
    if (!client) {
      alert("Client not found.");
      return;
    }
    const visaType = prompt("Visa type (e.g. Work, Student):") || "Visa";
    const stage = prompt("Stage (Documents/Embassy/Completed):") || "Documents";
    const owner = prompt("Case owner (e.g. Ebubekir):") || "Ebubekir";

    state.cases.push({ id: nextIds.case++, clientId: client.id, visaType, stage, owner });
    renderCases();
    renderDashboard();
    logActivity(`New case for ${client.name}, type: ${visaType}`);
  });

  $("#btn-add-visa").addEventListener("click", () => {
    if (!state.clients.length) {
      alert("You must create a client first.");
      return;
    }
    const clientName = prompt("Client name:") || "";
    const client = state.clients.find((c) => c.name.toLowerCase() === clientName.toLowerCase());
    if (!client) {
      alert("Client not found.");
      return;
    }
    const date = prompt("Appointment date (YYYY-MM-DD):", todayISO()) || todayISO();
    const country = prompt("Visa country:", "Germany") || "Unknown";
    const center = prompt("Application center:", "İstanbul") || "";
    const status = prompt("Status (Scheduled/Issued/Rejected):", "Scheduled") || "Scheduled";

    state.visas.push({ id: nextIds.visa++, date, clientId: client.id, country, center, status });
    renderVisas();
    renderDashboard();
    logActivity(`New visa appointment: ${client.name} – ${country} on ${date}`);
  });

  $("#btn-add-invoice").addEventListener("click", () => {
    if (!state.clients.length) {
      alert("You must create a client first.");
      return;
    }
    const clientName = prompt("Client name:") || "";
    const client = state.clients.find((c) => c.name.toLowerCase() === clientName.toLowerCase());
    if (!client) {
      alert("Client not found.");
      return;
    }
    const date = prompt("Invoice date (YYYY-MM-DD):", todayISO()) || todayISO();
    const amountStr = prompt("Amount (TRY):", "15000") || "0";
    const amount = parseFloat(amountStr.replace(",", ".")) || 0;
    const status = prompt("Status (Paid/Pending):", "Paid") || "Paid";

    state.invoices.push({ id: nextIds.invoice++, date, clientId: client.id, amount, status });
    renderInvoices();
    renderDashboard();
    logActivity(`Invoice created for ${client.name}, amount ${amount.toLocaleString("tr-TR")} ₺`);
  });

  $("#btn-add-campaign").addEventListener("click", () => {
    const channel = prompt("Channel (Google/Meta/YouTube):", "Google") || "Google";
    const name = prompt("Campaign name:", "New Campaign") || "Campaign";
    const spendStr = prompt("Spend (TRY):", "1000") || "0";
    const spend = parseFloat(spendStr.replace(",", ".")) || 0;
    const leadsStr = prompt("Leads:", "10") || "0";
    const leads = parseInt(leadsStr, 10) || 0;
    const source = prompt("Source (Search/Reels/etc.):", "Search") || "Search";

    state.campaigns.push({ id: nextIds.campaign++, channel, name, spend, leads, source });
    renderCampaigns();
    renderDashboard();
    logActivity(`Campaign added: ${channel} – ${name}`);
  });
}

// ========== SETTINGS PERSISTENCE ==========

function loadSettings() {
  const raw = localStorage.getItem(settingsKey);
  if (!raw) return;
  try {
    const s = JSON.parse(raw);
    if (s.lang) $("#langSelect").value = s.lang;
    if (s.currency) $("#currencySelect").value = s.currency;
  } catch (_) {}
}

function setupSettings() {
  $("#btn-save-settings").addEventListener("click", () => {
    const lang = $("#langSelect").value;
    const currency = $("#currencySelect").value;
    localStorage.setItem(settingsKey, JSON.stringify({ lang, currency }));
    const el = $("#settings-status");
    el.textContent = "Settings saved (demo only).";
    el.classList.add("ok");
    setTimeout(() => {
      el.textContent = "";
      el.classList.remove("ok");
    }, 1500);
  });
}

// ========== INIT APP ==========

function initApp() {
  $("#year").textContent = new Date().getFullYear();

  setupNavigation();
  setupActions();
  setupSettings();
  loadSettings();

  renderDashboard();
  renderClients();
  renderCases();
  renderVisas();
  renderInvoices();
  renderCampaigns();
  renderActivity();
}

// ========== BOOTSTRAP ==========

handleLogin();
checkAuthOnLoad();
