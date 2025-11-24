// ========== TRANSLATIONS ==========

let currentLang = "en";

const translations = {
  en: {
    // Login
    "login.title": "Vizerio Office Hub",
    "login.subtitle": "Internal operations panel",
    "login.emailLabel": "Email",
    "login.passwordLabel": "Password",
    "login.signIn": "Sign in",
    "login.hint": "Demo user: any email – password: admin123",
    "login.error.fill": "Please fill in both fields.",
    "login.error.password": "Invalid password (demo: admin123).",
    "login.success": "Login successful, redirecting…",

    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.clients": "Clients & Cases",
    "nav.visa": "Visa Appointments",
    "nav.accounting": "Accounting",
    "nav.marketing": "Marketing",
    "nav.activity": "Activity Logs",
    "nav.settings": "Settings",
    "nav.logout": "Log out",

    // Top bar
    "top.subtitle": "Fullstack visa consultancy management panel",
    "kpi.today": "Today",
    "kpi.openCases": "Open Cases",
    "kpi.pendingVisa": "Pending Visas",

    // Dashboard
    "dashboard.pipelineTitle": "Pipeline Overview",
    "dashboard.pipelineSubtitle":
      "High-level summary of clients, active cases, visa stages and revenue.",
    "dashboard.statClients": "Active Clients",
    "dashboard.statCases": "Active Cases",
    "dashboard.statInvoices": "This Month Invoices",
    "dashboard.statAdspend": "Ad Spend (₺)",
    "dashboard.agendaTitle": "Today’s Agenda",
    "dashboard.agendaSubtitle": "Visa appointments and tasks scheduled for today.",
    "dashboard.noAgenda": "No visa appointments today.",

    // Clients & cases
    "clients.title": "Clients & Cases",
    "clients.subtitle": "Manage client records and link them to visa cases.",
    "clients.addClient": "+ Add Client",
    "clients.addCase": "+ Add Case",
    "clients.clientsTable": "Clients",
    "clients.casesTable": "Cases",
    "clients.colName": "Name",
    "clients.colCountry": "Country",
    "clients.colPhone": "Phone",
    "clients.colStatus": "Status",
    "clients.colClient": "Client",
    "clients.colVisaType": "Visa Type",
    "clients.colStage": "Stage",
    "clients.colOwner": "Owner",

    // Visa
    "visa.title": "Visa Appointments & Tracking",
    "visa.subtitle": "Track embassy appointments and visa decisions.",
    "visa.addAppointment": "+ Add Appointment",
    "visa.tableTitle": "Upcoming Appointments",
    "visa.colDate": "Date",
    "visa.colClient": "Client",
    "visa.colCountry": "Country",
    "visa.colCenter": "Center",
    "visa.colStatus": "Status",

    // Accounting
    "accounting.title": "Accounting",
    "accounting.subtitle":
      "Invoices, payments and commission tracking for each client.",
    "accounting.addInvoice": "+ Add Invoice",
    "accounting.invoicesTable": "Invoices",
    "accounting.summaryTitle": "Summary",
    "accounting.colDate": "Date",
    "accounting.colClient": "Client",
    "accounting.colAmount": "Amount (₺)",
    "accounting.colStatus": "Status",
    "accounting.summaryTotal": "Total",
    "accounting.summaryPaid": "Paid",
    "accounting.summaryPending": "Pending",

    // Marketing
    "marketing.title": "Marketing & Ad Campaigns",
    "marketing.subtitle":
      "Track campaign performance across Google, Meta and YouTube.",
    "marketing.addCampaign": "+ Add Campaign",
    "marketing.campaignsTable": "Campaigns",
    "marketing.summaryTitle": "Funnel Snapshot",
    "marketing.colChannel": "Channel",
    "marketing.colName": "Name",
    "marketing.colSpend": "Spend (₺)",
    "marketing.colLeads": "Leads",
    "marketing.colSource": "Source",
    "marketing.summarySpend": "Total spend",
    "marketing.summaryLeads": "Total leads",
    "marketing.summaryCpl": "Avg CPL",

    // Activity
    "activity.title": "Activity Logs",
    "activity.subtitle":
      "Automatic log of key operations (created client, case, invoice, visa, etc.).",
    "activity.empty":
      "No activity yet. Add a client, case, invoice or visa to see logs here.",

    // Settings
    "settings.title": "Settings",
    "settings.subtitle":
      "Localization, defaults and security preferences. (Demo only, no real backend yet.)",
    "settings.localizationTitle": "Localization",
    "settings.langLabel": "Default language",
    "settings.currencyLabel": "Currency",
    "settings.saveBtn": "Save settings",
    "settings.securityTitle": "Security",
    "settings.securityHint":
      "In a real system this section would control user permissions, 2FA and API keys.",
    "settings.securityItem1":
      "Role based access (Admin / Case Manager / Accountant / Marketing)",
    "settings.securityItem2": "Audit logs & export",
    "settings.securityItem3":
      "API access for external automations (Zapier, Make, custom scripts)",
    "settings.saved": "Settings saved (demo only).",

    // Footer
    "footer.demoNote": "Built for internal use – demo version (no real data).",

    // Titles for top bar
    "title.dashboard": "Dashboard",
    "title.clients": "Clients & Cases",
    "title.visa": "Visa Appointments",
    "title.accounting": "Accounting",
    "title.marketing": "Marketing",
    "title.activity": "Activity Logs",
    "title.settings": "Settings",

    // Prompts
    "prompt.clientName": "Client name:",
    "prompt.clientCountry": "Target country (e.g. Germany):",
    "prompt.clientPhone": "Phone:",
    "prompt.clientStatus": "Status (Active/Prospect):",
    "prompt.caseClientName":
      "Client name for this case (must exist exactly as in client table):",
    "prompt.caseVisaType": "Visa type (e.g. Work, Student):",
    "prompt.caseStage": "Stage (Documents/Embassy/Completed):",
    "prompt.caseOwner": "Case owner (e.g. Ebubekir):",
    "prompt.noClientFirst": "You must create a client first.",
    "prompt.visaClientName": "Client name:",
    "prompt.visaDate": "Appointment date (YYYY-MM-DD):",
    "prompt.visaCountry": "Visa country:",
    "prompt.visaCenter": "Application center:",
    "prompt.visaStatus": "Status (Scheduled/Issued/Rejected):",
    "prompt.invoiceClientName": "Client name:",
    "prompt.invoiceDate": "Invoice date (YYYY-MM-DD):",
    "prompt.invoiceAmount": "Amount (TRY):",
    "prompt.invoiceStatus": "Status (Paid/Pending):",
    "prompt.campaignChannel": "Channel (Google/Meta/YouTube):",
    "prompt.campaignName": "Campaign name:",
    "prompt.campaignSpend": "Spend (TRY):",
    "prompt.campaignLeads": "Leads:",
    "prompt.campaignSource": "Source (Search/Reels/etc.):",
    "prompt.clientNotFound": "Client not found."
  },

  tr: {
    // Login
    "login.title": "Vizerio Office Hub",
    "login.subtitle": "İç operasyon yönetim paneli",
    "login.emailLabel": "E-posta",
    "login.passwordLabel": "Şifre",
    "login.signIn": "Giriş yap",
    "login.hint": "Demo kullanıcı: herhangi bir e-posta – şifre: admin123",
    "login.error.fill": "Lütfen e-posta ve şifre alanlarını doldurun.",
    "login.error.password": "Hatalı şifre (demo şifre: admin123).",
    "login.success": "Giriş başarılı, yönlendiriliyorsunuz…",

    // Navigation
    "nav.dashboard": "Kontrol Paneli",
    "nav.clients": "Müşteri & Dosyalar",
    "nav.visa": "Vize Randevuları",
    "nav.accounting": "Muhasebe",
    "nav.marketing": "Marketing",
    "nav.activity": "Aktivite Kayıtları",
    "nav.settings": "Ayarlar",
    "nav.logout": "Çıkış yap",

    // Top bar
    "top.subtitle": "Fullstack vize danışmanlığı yönetim paneli",
    "kpi.today": "Bugün",
    "kpi.openCases": "Açık Dosya",
    "kpi.pendingVisa": "Bekleyen Vize",

    // Dashboard
    "dashboard.pipelineTitle": "Genel Boru Hattı Görünümü",
    "dashboard.pipelineSubtitle":
      "Müşteri, aktif dosya, vize aşaması ve gelir özetini gösterir.",
    "dashboard.statClients": "Aktif Müşteri",
    "dashboard.statCases": "Aktif Dosya",
    "dashboard.statInvoices": "Bu Ay Fatura",
    "dashboard.statAdspend": "Reklam Harcaması (₺)",
    "dashboard.agendaTitle": "Bugünkü Ajanda",
    "dashboard.agendaSubtitle":
      "Bugün için planlanan vize randevuları ve görevler.",
    "dashboard.noAgenda": "Bugün için vize randevusu yok.",

    // Clients & cases
    "clients.title": "Müşteri & Dosyalar",
    "clients.subtitle": "Müşteri kayıtlarını ve onlara bağlı vize dosyalarını yönetin.",
    "clients.addClient": "+ Müşteri Ekle",
    "clients.addCase": "+ Dosya Ekle",
    "clients.clientsTable": "Müşteriler",
    "clients.casesTable": "Dosyalar",
    "clients.colName": "Ad Soyad",
    "clients.colCountry": "Hedef Ülke",
    "clients.colPhone": "Telefon",
    "clients.colStatus": "Durum",
    "clients.colClient": "Müşteri",
    "clients.colVisaType": "Vize Tipi",
    "clients.colStage": "Aşama",
    "clients.colOwner": "Sorumlu",

    // Visa
    "visa.title": "Vize Randevuları & Takip",
    "visa.subtitle": "Konsolosluk randevularını ve vize sonuçlarını takip edin.",
    "visa.addAppointment": "+ Randevu Ekle",
    "visa.tableTitle": "Yaklaşan Randevular",
    "visa.colDate": "Tarih",
    "visa.colClient": "Müşteri",
    "visa.colCountry": "Ülke",
    "visa.colCenter": "Merkez",
    "visa.colStatus": "Durum",

    // Accounting
    "accounting.title": "Muhasebe",
    "accounting.subtitle":
      "Her müşteri için fatura, ödeme ve komisyon takibi.",
    "accounting.addInvoice": "+ Fatura Ekle",
    "accounting.invoicesTable": "Faturalar",
    "accounting.summaryTitle": "Özet",
    "accounting.colDate": "Tarih",
    "accounting.colClient": "Müşteri",
    "accounting.colAmount": "Tutar (₺)",
    "accounting.colStatus": "Durum",
    "accounting.summaryTotal": "Toplam",
    "accounting.summaryPaid": "Tahsil Edilen",
    "accounting.summaryPending": "Bekleyen",

    // Marketing
    "marketing.title": "Marketing & Reklam Kampanyaları",
    "marketing.subtitle":
      "Google, Meta ve YouTube kampanya performansını takip edin.",
    "marketing.addCampaign": "+ Kampanya Ekle",
    "marketing.campaignsTable": "Kampanyalar",
    "marketing.summaryTitle": "Funnel Özeti",
    "marketing.colChannel": "Kanal",
    "marketing.colName": "Kampanya",
    "marketing.colSpend": "Harcama (₺)",
    "marketing.colLeads": "Lead",
    "marketing.colSource": "Kaynak",
    "marketing.summarySpend": "Toplam harcama",
    "marketing.summaryLeads": "Toplam lead",
    "marketing.summaryCpl": "Ort. Maliyet / Lead",

    // Activity
    "activity.title": "Aktivite Kayıtları",
    "activity.subtitle":
      "Oluşturulan müşteri, dosya, fatura, vize vb. önemli işlemlerin log kaydı.",
    "activity.empty":
      "Henüz aktivite yok. Müşteri, dosya, fatura veya vize eklediğinizde burada görünecek.",

    // Settings
    "settings.title": "Ayarlar",
    "settings.subtitle":
      "Dil, para birimi ve güvenlik tercihleri. (Şu an demo, gerçek backend yok.)",
    "settings.localizationTitle": "Yerelleştirme",
    "settings.langLabel": "Varsayılan dil",
    "settings.currencyLabel": "Para birimi",
    "settings.saveBtn": "Ayarları kaydet",
    "settings.securityTitle": "Güvenlik",
    "settings.securityHint":
      "Gerçek sistemde kullanıcı yetkileri, 2FA ve API anahtarları burada yönetilir.",
    "settings.securityItem1":
      "Rol tabanlı erişim (Admin / Dosya Sorumlusu / Muhasebe / Marketing)",
    "settings.securityItem2": "Log kayıtları & dışa aktarma",
    "settings.securityItem3":
      "Zapier, Make vb. otomasyonlar için API erişimi",
    "settings.saved": "Ayarlar kaydedildi (şu an sadece demo).",

    // Footer
    "footer.demoNote":
      "Sadece dahili kullanım için – demo sürüm (gerçek veri içermez).",

    // Titles
    "title.dashboard": "Kontrol Paneli",
    "title.clients": "Müşteri & Dosyalar",
    "title.visa": "Vize Randevuları",
    "title.accounting": "Muhasebe",
    "title.marketing": "Marketing",
    "title.activity": "Aktivite Kayıtları",
    "title.settings": "Ayarlar",

    // Prompts
    "prompt.clientName": "Müşteri adı soyadı:",
    "prompt.clientCountry": "Hedef ülke (örn. Almanya):",
    "prompt.clientPhone": "Telefon:",
    "prompt.clientStatus": "Durum (Active/Prospect):",
    "prompt.caseClientName":
      "Bu dosyanın bağlı olacağı müşteri adı (listede aynısı olmalı):",
    "prompt.caseVisaType": "Vize tipi (örn. Çalışma, Öğrenci):",
    "prompt.caseStage": "Aşama (Documents/Embassy/Completed):",
    "prompt.caseOwner": "Dosya sorumlusu (örn. Ebubekir):",
    "prompt.noClientFirst": "Önce en az bir müşteri oluşturmalısınız.",
    "prompt.visaClientName": "Müşteri adı:",
    "prompt.visaDate": "Randevu tarihi (YYYY-MM-DD):",
    "prompt.visaCountry": "Vize ülkesi:",
    "prompt.visaCenter": "Başvuru merkezi:",
    "prompt.visaStatus": "Durum (Scheduled/Issued/Rejected):",
    "prompt.invoiceClientName": "Müşteri adı:",
    "prompt.invoiceDate": "Fatura tarihi (YYYY-MM-DD):",
    "prompt.invoiceAmount": "Tutar (TRY):",
    "prompt.invoiceStatus": "Durum (Paid/Pending):",
    "prompt.campaignChannel": "Kanal (Google/Meta/YouTube):",
    "prompt.campaignName": "Kampanya adı:",
    "prompt.campaignSpend": "Harcama (TRY):",
    "prompt.campaignLeads": "Lead sayısı:",
    "prompt.campaignSource": "Kaynak (Search/Reels/vb.):",
    "prompt.clientNotFound": "Müşteri bulunamadı."
  }
};

function t(key) {
  const langTable = translations[currentLang] || {};
  if (langTable[key]) return langTable[key];
  const base = translations.en || {};
  return base[key] || key;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });

  // Top bar title, nav'a göre ayrı yönetiliyor – burada sadece mevcut sayfayı güncelle.
  const activeNav = document.querySelector(".nav-item.active");
  if (activeNav) {
    const page = activeNav.getAttribute("data-page");
    const titleKey = titleKeyMap[page] || "title.dashboard";
    const pageTitleEl = document.getElementById("page-title");
    if (pageTitleEl) pageTitleEl.textContent = t(titleKey);
  }
}

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
      setStatus(t("login.error.fill"), "error");
      return;
    }

    if (pwd !== "admin123") {
      setStatus(t("login.error.password"), "error");
      return;
    }

    localStorage.setItem(authKey, JSON.stringify({ email, ts: Date.now() }));
    setStatus(t("login.success"), "ok");

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
    // Login ekranı yüklenirken de çeviri uygula
    applyTranslations();
  }
}

// ========== NAVIGATION (PAGES) ==========

const titleKeyMap = {
  dashboard: "title.dashboard",
  clients: "title.clients",
  visa: "title.visa",
  accounting: "title.accounting",
  marketing: "title.marketing",
  activity: "title.activity",
  settings: "title.settings"
};

function setupNavigation() {
  const navButtons = $$(".nav-item");
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.getAttribute("data-page");

      navButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      $$(".page").forEach((p) => p.classList.remove("active"));
      $(`#page-${page}`).classList.add("active");

      const titleKey = titleKeyMap[page] || "title.dashboard";
      $("#page-title").textContent = t(titleKey);
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
    `${t("clients.clientsTable")}: ${state.clients.length}`,
    `${t("clients.casesTable")}: ${state.cases.length}`,
    `${t("kpi.pendingVisa")}: ${pendingVisas}`,
    `${t("accounting.invoicesTable")}: ${state.invoices.length}`,
    `${t("marketing.campaignsTable")}: ${state.campaigns.length}`
  ];
  const ul = $("#dashboard-tags");
  ul.innerHTML = "";
  tags.forEach((txt) => {
    const li = document.createElement("li");
    li.textContent = txt;
    ul.appendChild(li);
  });

  const today = todayISO();
  const agenda = state.visas.filter((v) => v.date === today);
  const list = $("#todayAgenda");
  list.innerHTML = "";
  if (agenda.length === 0) {
    const li = document.createElement("li");
    li.textContent = t("dashboard.noAgenda");
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

  [
    `${t("accounting.summaryTotal")}: ${total.toLocaleString("tr-TR")} ₺`,
    `${t("accounting.summaryPaid")}: ${paid.toLocaleString("tr-TR")} ₺`,
    `${t("accounting.summaryPending")}: ${pending.toLocaleString("tr-TR")} ₺`
  ].forEach((txt) => {
    const li = document.createElement("li");
    li.textContent = txt;
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
    `${t("marketing.summarySpend")}: ${totalSpend.toLocaleString("tr-TR")} ₺`,
    `${t("marketing.summaryLeads")}: ${totalLeads}`,
    `${t("marketing.summaryCpl")}: ${cpl} ₺`
  ].forEach((txt) => {
    const li = document.createElement("li");
    li.textContent = txt;
    ul.appendChild(li);
  });
}

function renderActivity() {
  const list = $("#activity-list");
  list.innerHTML = "";
  if (!state.activity.length) {
    const li = document.createElement("li");
    li.textContent = t("activity.empty");
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
    const name = prompt(t("prompt.clientName"));
    if (!name) return;
    const country = prompt(t("prompt.clientCountry")) || "Unknown";
    const phone = prompt(t("prompt.clientPhone")) || "";
    const status = prompt(t("prompt.clientStatus")) || "Active";

    state.clients.push({ id: nextIds.client++, name, country, phone, status });
    renderClients();
    renderDashboard();
    logActivity(`New client created: ${name}`);
  });

  $("#btn-add-case").addEventListener("click", () => {
    if (!state.clients.length) {
      alert(t("prompt.noClientFirst"));
      return;
    }
    const clientName = prompt(t("prompt.caseClientName"));
    const client = state.clients.find(
      (c) => c.name.toLowerCase() === (clientName || "").toLowerCase()
    );
    if (!client) {
      alert(t("prompt.clientNotFound"));
      return;
    }
    const visaType = prompt(t("prompt.caseVisaType")) || "Visa";
    const stage = prompt(t("prompt.caseStage")) || "Documents";
    const owner = prompt(t("prompt.caseOwner")) || "Ebubekir";

    state.cases.push({
      id: nextIds.case++,
      clientId: client.id,
      visaType,
      stage,
      owner
    });
    renderCases();
    renderDashboard();
    logActivity(`New case for ${client.name}, type: ${visaType}`);
  });

  $("#btn-add-visa").addEventListener("click", () => {
    if (!state.clients.length) {
      alert(t("prompt.noClientFirst"));
      return;
    }
    const clientName = prompt(t("prompt.visaClientName")) || "";
    const client = state.clients.find(
      (c) => c.name.toLowerCase() === clientName.toLowerCase()
    );
    if (!client) {
      alert(t("prompt.clientNotFound"));
      return;
    }
    const date = prompt(t("prompt.visaDate"), todayISO()) || todayISO();
    const country = prompt(t("prompt.visaCountry"), "Germany") || "Unknown";
    const center = prompt(t("prompt.visaCenter"), "İstanbul") || "";
    const status = prompt(t("prompt.visaStatus"), "Scheduled") || "Scheduled";

    state.visas.push({
      id: nextIds.visa++,
      date,
      clientId: client.id,
      country,
      center,
      status
    });
    renderVisas();
    renderDashboard();
    logActivity(
      `New visa appointment: ${client.name} – ${country} on ${date}`
    );
  });

  $("#btn-add-invoice").addEventListener("click", () => {
    if (!state.clients.length) {
      alert(t("prompt.noClientFirst"));
      return;
    }
    const clientName = prompt(t("prompt.invoiceClientName")) || "";
    const client = state.clients.find(
      (c) => c.name.toLowerCase() === clientName.toLowerCase()
    );
    if (!client) {
      alert(t("prompt.clientNotFound"));
      return;
    }
    const date = prompt(t("prompt.invoiceDate"), todayISO()) || todayISO();
    const amountStr =
      prompt(t("prompt.invoiceAmount"), "15000") || "0";
    const amount = parseFloat(amountStr.replace(",", ".")) || 0;
    const status =
      prompt(t("prompt.invoiceStatus"), "Paid") || "Paid";

    state.invoices.push({
      id: nextIds.invoice++,
      date,
      clientId: client.id,
      amount,
      status
    });
    renderInvoices();
    renderDashboard();
    logActivity(
      `Invoice created for ${client.name}, amount ${amount.toLocaleString(
        "tr-TR"
      )} ₺`
    );
  });

  $("#btn-add-campaign").addEventListener("click", () => {
    const channel =
      prompt(t("prompt.campaignChannel"), "Google") || "Google";
    const name =
      prompt(t("prompt.campaignName"), "New Campaign") || "Campaign";
    const spendStr =
      prompt(t("prompt.campaignSpend"), "1000") || "0";
    const spend = parseFloat(spendStr.replace(",", ".")) || 0;
    const leadsStr = prompt(t("prompt.campaignLeads"), "10") || "0";
    const leads = parseInt(leadsStr, 10) || 0;
    const source =
      prompt(t("prompt.campaignSource"), "Search") || "Search";

    state.campaigns.push({
      id: nextIds.campaign++,
      channel,
      name,
      spend,
      leads,
      source
    });
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
    if (s.lang) {
      currentLang = s.lang;
      const langSelect = $("#langSelect");
      if (langSelect) langSelect.value = s.lang;
    }
    if (s.currency) {
      const currencySelect = $("#currencySelect");
      if (currencySelect) currencySelect.value = s.currency;
    }
  } catch (_) {}
}

function setupSettings() {
  $("#btn-save-settings").addEventListener("click", () => {
    const lang = $("#langSelect").value;
    const currency = $("#currencySelect").value;
    currentLang = lang;
    localStorage.setItem(settingsKey, JSON.stringify({ lang, currency }));
    applyTranslations();
    const el = $("#settings-status");
    el.textContent = t("settings.saved");
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

  loadSettings();
  applyTranslations();
  setupNavigation();
  setupActions();
  setupSettings();

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
