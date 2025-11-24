const SUPABASE_URL = "https://dgvxzlfeagwzmyjqhupu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndnh6bGZlYWd3em15anFodXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDEyNDEsImV4cCI6MjA3OTU3NzI0MX0.rwVR89JBTeue0cAtbujkoIBbqg3VjAEsLesXPlcr078";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =====================================
// 1) Login DEMO mantığı (senin eskisi)
// =====================================

// Footer'da yıl gösterimi (varsa)
const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

const loginForm = document.getElementById("loginForm");
const statusEl = document.getElementById("status");

if (loginForm) {
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    // Basit validasyon
    if (!email || !password) {
      showStatus(i18n("login_fill_both") || "Please fill in both email and password.", "error");
      return;
    }

    // Şimdilik DEMO login
    setTimeout(() => {
      showStatus(
        (i18n("login_demo_ok_prefix") || "Demo login successful. Welcome, ") + email + "!",
        "ok"
      );
    }, 400);
  });
}

function showStatus(message, type) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.remove("ok", "error");
  if (type) statusEl.classList.add(type);
}

// =====================================
// 2) Çok dilli yapı (TR / EN)
// =====================================

// --- ÇEVİRİ TABLOSU ---
// Buraya istediğin kadar key ekleyebilirsin.
// HTML'de data-i18n="KEY_ADI" dersen, bu tabloya bakıp metin çeker.

const TRANSLATIONS = {
  tr: {
    // Genel
    lang_tr: "TR",
    lang_en: "EN",

    // Örnek dashboard / login metinleri
    app_name: "Vizerio Office Hub",
    dashboard_title: "Gösterge Paneli",
    clients_menu: "Müşteriler & Dosyalar",
    visa_appointments_menu: "Vize Randevuları",
    accounting_menu: "Muhasebe",
    marketing_menu: "Marketing & Reklam",
    activity_logs_menu: "Aktivite Kayıtları",
    settings_menu: "Ayarlar",

    // Login ekranı örnekleri
    login_title: "Vizerio Office Hub'a Hoş Geldin",
    login_email_placeholder: "E-posta",
    login_password_placeholder: "Şifre",
    login_button: "Giriş Yap",
    login_fill_both: "Lütfen e-posta ve şifre alanlarını doldurun.",
    login_demo_ok_prefix: "Demo giriş başarılı. Hoş geldin, ",

    // Dashboard örnekleri
    pipeline_overview: "Pipeline Özeti",
    active_clients: "Aktif Müşteriler",
    active_cases: "Aktif Dosyalar",
    this_month_invoices: "Bu Ayki Faturalar",
    ad_spend: "Reklam Harcaması (₺)",
    todays_agenda: "Bugünün Ajandası",
    no_appointments: "Bugün için vize randevusu yok.",
  },

  en: {
    // General
    lang_tr: "TR",
    lang_en: "EN",

    app_name: "Vizerio Office Hub",
    dashboard_title: "Dashboard",
    clients_menu: "Clients & Cases",
    visa_appointments_menu: "Visa Appointments",
    accounting_menu: "Accounting",
    marketing_menu: "Marketing & Ads",
    activity_logs_menu: "Activity Logs",
    settings_menu: "Settings",

    // Login screen examples
    login_title: "Welcome to Vizerio Office Hub",
    login_email_placeholder: "Email",
    login_password_placeholder: "Password",
    login_button: "Sign In",
    login_fill_both: "Please fill in both email and password.",
    login_demo_ok_prefix: "Demo login successful. Welcome, ",

    // Dashboard examples
    pipeline_overview: "Pipeline Overview",
    active_clients: "Active Clients",
    active_cases: "Active Cases",
    this_month_invoices: "This Month Invoices",
    ad_spend: "Ad Spend (₺)",
    todays_agenda: "Today’s Agenda",
    no_appointments: "No visa appointments today.",
  },
};

// Varsayılan dil
const DEFAULT_LANG = "tr";

// LocalStorage'dan dili oku
let currentLang = (localStorage.getItem("vizerio_lang") || DEFAULT_LANG);
if (!["tr", "en"].includes(currentLang)) currentLang = DEFAULT_LANG;

// Kısayol fonksiyonu
function i18n(key) {
  return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || "";
}

// Metinleri uygula
function applyTranslations() {
  const nodes = document.querySelectorAll("[data-i18n]");
  nodes.forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const text = i18n(key);
    if (!text) return;

    // input/textarea placeholder desteği
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      if (el.hasAttribute("placeholder")) {
        el.setAttribute("placeholder", text);
      } else {
        el.value = text;
      }
    } else {
      el.textContent = text;
    }
  });

  // Dil butonu text
  const langBtn = document.getElementById("langToggle");
  if (langBtn) {
    langBtn.textContent = currentLang === "tr" ? "TR" : "EN";
  }
}

// Dil değiştir
function toggleLanguage() {
  currentLang = currentLang === "tr" ? "en" : "tr";
  localStorage.setItem("vizerio_lang", currentLang);
  applyTranslations();
}

// Sayfa yüklendiğinde
document.addEventListener("DOMContentLoaded", () => {
  // Butonu bağla
  const langBtn = document.getElementById("langToggle");
  if (langBtn) {
    langBtn.addEventListener("click", toggleLanguage);
  }

  // İlk çeviriyi uygula
  applyTranslations();
});
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vizerio Office Hub</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
<div class="app-wrapper">

  <!-- LOGIN SCREEN -->
  <div id="login-screen" class="login-screen">
    <div class="login-card">
      <div class="login-logo" data-i18n="login.title">Vizerio Office Hub</div>
      <div class="login-subtitle" data-i18n="login.subtitle">Internal operations panel</div>

      <form id="loginForm">
        <div class="field">
          <label for="email" data-i18n="login.emailLabel">Email</label>
          <input type="email" id="email" placeholder="you@vizeriooffice.com" required />
        </div>

        <div class="field">
          <label for="password" data-i18n="login.passwordLabel">Password</label>
          <input type="password" id="password" placeholder="********" required />
        </div>

        <button type="submit" class="btn-primary">
          <span data-i18n="login.signIn">Sign in</span>
        </button>
        <p id="status" class="status"></p>

        <p class="hint" data-i18n="login.hint">
          Demo user: any email – password: <b>admin123</b>
        </p>
      </form>
    </div>
  </div>
  <!-- /LOGIN SCREEN -->

  <!-- MAIN LAYOUT -->
  <div id="app-shell" class="app-shell hidden">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">Vizerio</div>
        <div class="sidebar-tagline">Office Hub</div>
      </div>

      <nav class="sidebar-nav">
        <button class="nav-item active" data-page="dashboard">
          <span data-i18n="nav.dashboard">Dashboard</span>
        </button>
        <button class="nav-item" data-page="clients">
          <span data-i18n="nav.clients">Clients & Cases</span>
        </button>
        <button class="nav-item" data-page="visa">
          <span data-i18n="nav.visa">Visa Appointments</span>
        </button>
        <button class="nav-item" data-page="accounting">
          <span data-i18n="nav.accounting">Accounting</span>
        </button>
        <button class="nav-item" data-page="marketing">
          <span data-i18n="nav.marketing">Marketing</span>
        </button>
        <button class="nav-item" data-page="activity">
          <span data-i18n="nav.activity">Activity Logs</span>
        </button>
        <button class="nav-item" data-page="settings">
          <span data-i18n="nav.settings">Settings</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <div class="user-mini">
          <div class="user-avatar">E</div>
          <div class="user-meta">
            <div class="user-name">Ebubekir</div>
            <div class="user-role">Admin</div>
          </div>
        </div>
        <button id="logoutBtn" class="btn-ghost" data-i18n="nav.logout">Log out</button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="main">
      <!-- Top bar -->
      <header class="top-bar">
        <div class="top-left">
          <h1 id="page-title">Dashboard</h1>
          <p class="top-subtitle" data-i18n="top.subtitle">
            Fullstack visa consultancy management panel
          </p>
        </div>
        <div class="top-right">
          <div class="kpi">
            <div class="kpi-label" data-i18n="kpi.today">Today</div>
            <div class="kpi-value" id="todayDate"></div>
          </div>
          <div class="kpi">
            <div class="kpi-label" data-i18n="kpi.openCases">Open Cases</div>
            <div class="kpi-value" id="kpi-open-cases">0</div>
          </div>
          <div class="kpi">
            <div class="kpi-label" data-i18n="kpi.pendingVisa">Pending Visas</div>
            <div class="kpi-value" id="kpi-pending-visa">0</div>
          </div>
        </div>
      </header>

      <!-- PAGES CONTAINER -->
      <main class="pages">

        <!-- DASHBOARD PAGE -->
        <section id="page-dashboard" class="page active">
          <div class="grid-2">
            <div class="card">
              <h2 data-i18n="dashboard.pipelineTitle">Pipeline Overview</h2>
              <p class="card-subtitle" data-i18n="dashboard.pipelineSubtitle">
                High-level summary of clients, active cases, visa stages and revenue.
              </p>

              <div class="stats-row">
                <div class="stat">
                  <div class="stat-label" data-i18n="dashboard.statClients">Active Clients</div>
                  <div class="stat-value" id="stat-clients">0</div>
                </div>
                <div class="stat">
                  <div class="stat-label" data-i18n="dashboard.statCases">Active Cases</div>
                  <div class="stat-value" id="stat-cases">0</div>
                </div>
                <div class="stat">
                  <div class="stat-label" data-i18n="dashboard.statInvoices">This Month Invoices</div>
                  <div class="stat-value" id="stat-invoices">0</div>
                </div>
                <div class="stat">
                  <div class="stat-label" data-i18n="dashboard.statAdspend">Ad Spend (₺)</div>
                  <div class="stat-value" id="stat-adspend">0</div>
                </div>
              </div>

              <ul class="tag-list" id="dashboard-tags"></ul>
            </div>

            <div class="card">
              <h2 data-i18n="dashboard.agendaTitle">Today’s Agenda</h2>
              <p class="card-subtitle" data-i18n="dashboard.agendaSubtitle">
                Visa appointments and tasks scheduled for today.
              </p>
              <ul id="todayAgenda" class="simple-list"></ul>
            </div>
          </div>
        </section>

        <!-- CLIENTS & CASES -->
        <section id="page-clients" class="page">
          <div class="page-header-row">
            <div>
              <h2 data-i18n="clients.title">Clients & Cases</h2>
              <p class="card-subtitle" data-i18n="clients.subtitle">
                Manage client records and link them to visa cases.
              </p>
            </div>
            <div class="btn-group">
              <button id="btn-add-client" class="btn-primary-sm">
                <span data-i18n="clients.addClient">+ Add Client</span>
              </button>
              <button id="btn-add-case" class="btn-secondary-sm">
                <span data-i18n="clients.addCase">+ Add Case</span>
              </button>
            </div>
          </div>

          <div class="grid-2">
            <div class="card">
              <h3 data-i18n="clients.clientsTable">Clients</h3>
              <table class="data-table">
                <thead>
                  <tr>
                    <th data-i18n="clients.colName">Name</th>
                    <th data-i18n="clients.colCountry">Country</th>
                    <th data-i18n="clients.colPhone">Phone</th>
                    <th data-i18n="clients.colStatus">Status</th>
                  </tr>
                </thead>
                <tbody id="tbl-clients"></tbody>
              </table>
            </div>

            <div class="card">
              <h3 data-i18n="clients.casesTable">Cases</h3>
              <table class="data-table">
                <thead>
                  <tr>
                    <th data-i18n="clients.colClient">Client</th>
                    <th data-i18n="clients.colVisaType">Visa Type</th>
                    <th data-i18n="clients.colStage">Stage</th>
                    <th data-i18n="clients.colOwner">Owner</th>
                  </tr>
                </thead>
                <tbody id="tbl-cases"></tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- VISA APPOINTMENTS -->
        <section id="page-visa" class="page">
          <div class="page-header-row">
            <div>
              <h2 data-i18n="visa.title">Visa Appointments & Tracking</h2>
              <p class="card-subtitle" data-i18n="visa.subtitle">
                Track embassy appointments and visa decisions.
              </p>
            </div>
            <button id="btn-add-visa" class="btn-primary-sm">
              <span data-i18n="visa.addAppointment">+ Add Appointment</span>
            </button>
          </div>

          <div class="card">
            <h3 data-i18n="visa.tableTitle">Upcoming Appointments</h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th data-i18n="visa.colDate">Date</th>
                  <th data-i18n="visa.colClient">Client</th>
                  <th data-i18n="visa.colCountry">Country</th>
                  <th data-i18n="visa.colCenter">Center</th>
                  <th data-i18n="visa.colStatus">Status</th>
                </tr>
              </thead>
              <tbody id="tbl-visas"></tbody>
            </table>
          </div>
        </section>

        <!-- ACCOUNTING -->
        <section id="page-accounting" class="page">
          <div class="page-header-row">
            <div>
              <h2 data-i18n="accounting.title">Accounting</h2>
              <p class="card-subtitle" data-i18n="accounting.subtitle">
                Invoices, payments and commission tracking for each client.
              </p>
            </div>
            <button id="btn-add-invoice" class="btn-primary-sm">
              <span data-i18n="accounting.addInvoice">+ Add Invoice</span>
            </button>
          </div>

          <div class="grid-2">
            <div class="card">
              <h3 data-i18n="accounting.invoicesTable">Invoices</h3>
              <table class="data-table">
                <thead>
                  <tr>
                    <th data-i18n="accounting.colDate">Date</th>
                    <th data-i18n="accounting.colClient">Client</th>
                    <th data-i18n="accounting.colAmount">Amount (₺)</th>
                    <th data-i18n="accounting.colStatus">Status</th>
                  </tr>
                </thead>
                <tbody id="tbl-invoices"></tbody>
              </table>
            </div>

            <div class="card">
              <h3 data-i18n="accounting.summaryTitle">Summary</h3>
              <ul class="simple-list" id="accounting-summary"></ul>
            </div>
          </div>
        </section>

        <!-- MARKETING -->
        <section id="page-marketing" class="page">
          <div class="page-header-row">
            <div>
              <h2 data-i18n="marketing.title">Marketing & Ad Campaigns</h2>
              <p class="card-subtitle" data-i18n="marketing.subtitle">
                Track campaign performance across Google, Meta and YouTube.
              </p>
            </div>
            <button id="btn-add-campaign" class="btn-primary-sm">
              <span data-i18n="marketing.addCampaign">+ Add Campaign</span>
            </button>
          </div>

          <div class="grid-2">
            <div class="card">
              <h3 data-i18n="marketing.campaignsTable">Campaigns</h3>
              <table class="data-table">
                <thead>
                  <tr>
                    <th data-i18n="marketing.colChannel">Channel</th>
                    <th data-i18n="marketing.colName">Name</th>
                    <th data-i18n="marketing.colSpend">Spend (₺)</th>
                    <th data-i18n="marketing.colLeads">Leads</th>
                    <th data-i18n="marketing.colSource">Source</th>
                  </tr>
                </thead>
                <tbody id="tbl-campaigns"></tbody>
              </table>
            </div>

            <div class="card">
              <h3 data-i18n="marketing.summaryTitle">Funnel Snapshot</h3>
              <ul class="simple-list" id="marketing-summary"></ul>
            </div>
          </div>
        </section>

        <!-- ACTIVITY LOGS -->
        <section id="page-activity" class="page">
          <h2 data-i18n="activity.title">Activity Logs</h2>
          <p class="card-subtitle" data-i18n="activity.subtitle">
            Automatic log of key operations (created client, case, invoice, visa, etc.).
          </p>

          <div class="card">
            <ul id="activity-list" class="activity-list"></ul>
          </div>
        </section>

        <!-- SETTINGS -->
        <section id="page-settings" class="page">
          <h2 data-i18n="settings.title">Settings</h2>
          <p class="card-subtitle" data-i18n="settings.subtitle">
            Localization, defaults and security preferences. (Demo only, no real backend yet.)
          </p>

          <div class="grid-2">
            <div class="card">
              <h3 data-i18n="settings.localizationTitle">Localization</h3>
              <div class="field">
                <label data-i18n="settings.langLabel">Default language</label>
                <select id="langSelect">
                  <option value="en">English</option>
                  <option value="tr">Türkçe</option>
                </select>
              </div>
              <div class="field">
                <label data-i18n="settings.currencyLabel">Currency</label>
                <select id="currencySelect">
                  <option value="TRY">TRY (₺)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              <button id="btn-save-settings" class="btn-primary-sm">
                <span data-i18n="settings.saveBtn">Save settings</span>
              </button>
              <p id="settings-status" class="status"></p>
            </div>

            <div class="card">
              <h3 data-i18n="settings.securityTitle">Security</h3>
              <p class="hint" data-i18n="settings.securityHint">
                In a real system this section would control user permissions, 2FA and API keys.
              </p>
              <ul class="simple-list">
                <li data-i18n="settings.securityItem1">
                  Role based access (Admin / Case Manager / Accountant / Marketing)
                </li>
                <li data-i18n="settings.securityItem2">Audit logs &amp; export</li>
                <li data-i18n="settings.securityItem3">
                  API access for external automations (Zapier, Make, custom scripts)
                </li>
              </ul>
            </div>
          </div>
        </section>

      </main>

      <!-- FOOTER -->
      <footer class="footer">
        <span>© <span id="year"></span> Vizerio Office Hub</span>
        <span class="footer-right" data-i18n="footer.demoNote">
          Built for internal use – demo version (no real data).
        </span>
      </footer>
    </div>
  </div>
  <!-- /MAIN LAYOUT -->

</div>

    <!-- Dil değiştirme butonu (sağ alt köşe) -->
    <button id="langToggle" class="lang-toggle">TR</button>

    <!-- Uygulama scriptleri -->
    <script src="app.js"></script>
  </body>
</html>
applyRolePermissions('marketing');
