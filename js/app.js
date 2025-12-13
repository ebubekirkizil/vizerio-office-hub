const SUPABASE_URL = 'https://dgvxzlfeagwzmyjqhupu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndnh6bGZlYWd3em15anFodXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDEyNDEsImV4cCI6MjA3OTU3NzI0MX0.rwVR89JBTeue0cAtbujkoIBbqg3VjAEsLesXPlcr078';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const translations = {
  en: {
    'login.title': 'Vizerio Office Hub',
    'login.subtitle': 'Internal operations panel',
    'login.emailLabel': 'Email',
    'login.passwordLabel': 'Password',
    'login.signIn': 'Sign in',
    'login.error': 'Invalid email or password.',
    'login.errorTechnical': 'Login temporarily unavailable. Please try again later.',
    'nav.dashboard': 'Dashboard',
    'nav.clients': 'Clients & Cases',
    'nav.visa': 'Visa Appointments',
    'nav.accounting': 'Accounting',
    'nav.marketing': 'Marketing',
    'nav.activity': 'Activity Logs',
    'nav.settings': 'Settings',
    'nav.logout': 'Log out',
    'top.subtitle': 'Fullstack visa consultancy management panel',
    'kpi.today': 'Today',
    'kpi.openCases': 'Open Cases',
    'kpi.pendingVisa': 'Pending Visas',
    'dashboard.pipelineTitle': 'Pipeline Overview',
    'dashboard.pipelineSubtitle': 'High-level summary of clients, active cases, visa stages and revenue.',
    'dashboard.statClients': 'Active Clients',
    'dashboard.statCases': 'Active Cases',
    'dashboard.statInvoices': 'This Month Invoices',
    'dashboard.statAdspend': 'Ad Spend (₺)',
    'dashboard.agendaTitle': 'Today’s Agenda',
    'dashboard.agendaSubtitle': 'Visa appointments and tasks scheduled for today.',
    'clients.title': 'Clients & Cases',
    'clients.subtitle': 'Manage client records and link them to visa cases.',
    'clients.addClient': '+ Add Client',
    'clients.addCase': '+ Add Case',
    'clients.clientsTable': 'Clients',
    'clients.casesTable': 'Cases',
    'clients.colName': 'Name',
    'clients.colCountry': 'Country',
    'clients.colPhone': 'Phone',
    'clients.colStatus': 'Status',
    'clients.colClient': 'Client',
    'clients.colVisaType': 'Visa Type',
    'clients.colStage': 'Stage',
    'clients.colOwner': 'Owner',
    'visa.title': 'Visa Appointments & Tracking',
    'visa.subtitle': 'Track embassy appointments and visa decisions.',
    'visa.addAppointment': '+ Add Appointment',
    'visa.tableTitle': 'Upcoming Appointments',
    'visa.colDate': 'Date',
    'visa.colClient': 'Client',
    'visa.colCountry': 'Country',
    'visa.colCenter': 'Center',
    'visa.colStatus': 'Status',
    'accounting.title': 'Accounting',
    'accounting.subtitle': 'Invoices, payments and commission tracking for each client.',
    'accounting.addInvoice': '+ Add Invoice',
    'accounting.invoicesTable': 'Invoices',
    'accounting.summaryTitle': 'Summary',
    'accounting.colDate': 'Date',
    'accounting.colClient': 'Client',
    'accounting.colAmount': 'Amount (₺)',
    'accounting.colStatus': 'Status',
    'marketing.title': 'Marketing & Ad Campaigns',
    'marketing.subtitle': 'Track campaign performance across Google, Meta and YouTube.',
    'marketing.addCampaign': '+ Add Campaign',
    'marketing.campaignsTable': 'Campaigns',
    'marketing.summaryTitle': 'Funnel Snapshot',
    'marketing.colChannel': 'Channel',
    'marketing.colName': 'Name',
    'marketing.colSpend': 'Spend (₺)',
    'marketing.colLeads': 'Leads',
    'marketing.colSource': 'Source',
    'activity.title': 'Activity Logs',
    'activity.subtitle': 'Automatic log of key operations (created client, case, invoice, visa, etc.).',
    'settings.title': 'Settings',
    'settings.subtitle': 'Localization, defaults and security preferences. (Demo only, no real backend yet.)',
    'settings.localizationTitle': 'Localization',
    'settings.langLabel': 'Default language',
    'settings.currencyLabel': 'Currency',
    'settings.saveBtn': 'Save settings',
    'settings.securityTitle': 'Security',
    'settings.securityHint': 'In a real system this section would control user permissions, 2FA and API keys.',
    'settings.securityItem1': 'Role based access (Admin / Case Manager / Accountant / Marketing)',
    'settings.securityItem2': 'Audit logs & export',
    'settings.securityItem3': 'API access for external automations (Zapier, Make, custom scripts)',
    'footer.demoNote': 'Built for internal use – demo version (no real data).'
  },
  tr: {
    'login.title': 'Vizerio Office Hub',
    'login.subtitle': 'İç operasyon paneli',
    'login.emailLabel': 'E-posta',
    'login.passwordLabel': 'Şifre',
    'login.signIn': 'Giriş yap',
    'login.error': 'E-posta veya şifre hatalı.',
    'login.errorTechnical': 'Giriş şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
    'nav.dashboard': 'Kontrol Paneli',
    'nav.clients': 'Müşteriler & Dosyalar',
    'nav.visa': 'Vize Randevuları',
    'nav.accounting': 'Muhasebe',
    'nav.marketing': 'Marketing',
    'nav.activity': 'Hareket Kayıtları',
    'nav.settings': 'Ayarlar',
    'nav.logout': 'Çıkış yap',
    'top.subtitle': 'Tam kapsamlı vize danışmanlığı yönetim paneli',
    'kpi.today': 'Bugün',
    'kpi.openCases': 'Açık Dosya',
    'kpi.pendingVisa': 'Bekleyen Vize',
    'dashboard.pipelineTitle': 'Pipeline Özeti',
    'dashboard.pipelineSubtitle': 'Aktif müşteri, dosya, vize süreçleri ve gelir özetini gösterir.',
    'dashboard.statClients': 'Aktif Müşteri',
    'dashboard.statCases': 'Aktif Dosya',
    'dashboard.statInvoices': 'Bu Ay Fatura',
    'dashboard.statAdspend': 'Reklam Harcaması (₺)',
    'dashboard.agendaTitle': 'Bugünün Ajandası',
    'dashboard.agendaSubtitle': 'Bugün planlanan vize randevuları ve görevler.',
    'clients.title': 'Müşteriler & Dosyalar',
    'clients.subtitle': 'Müşteri kayıtlarını ve ilgili vize dosyalarını yönetin.',
    'clients.addClient': '+ Müşteri Ekle',
    'clients.addCase': '+ Dosya Ekle',
    'clients.clientsTable': 'Müşteriler',
    'clients.casesTable': 'Dosyalar',
    'clients.colName': 'İsim',
    'clients.colCountry': 'Ülke',
    'clients.colPhone': 'Telefon',
    'clients.colStatus': 'Durum',
    'clients.colClient': 'Müşteri',
    'clients.colVisaType': 'Vize Türü',
    'clients.colStage': 'Aşama',
    'clients.colOwner': 'Sorumlu',
    'visa.title': 'Vize Randevu & Takip',
    'visa.subtitle': 'Konsolosluk randevularını ve karar süreçlerini takip edin.',
    'visa.addAppointment': '+ Randevu Ekle',
    'visa.tableTitle': 'Yaklaşan Randevular',
    'visa.colDate': 'Tarih',
    'visa.colClient': 'Müşteri',
    'visa.colCountry': 'Ülke',
    'visa.colCenter': 'Merkez',
    'visa.colStatus': 'Durum',
    'accounting.title': 'Muhasebe',
    'accounting.subtitle': 'Her müşteri için fatura, ödeme ve komisyon takibi.',
    'accounting.addInvoice': '+ Fatura Ekle',
    'accounting.invoicesTable': 'Faturalar',
    'accounting.summaryTitle': 'Özet',
    'accounting.colDate': 'Tarih',
    'accounting.colClient': 'Müşteri',
    'accounting.colAmount': 'Tutar (₺)',
    'accounting.colStatus': 'Durum',
    'marketing.title': 'Marketing & Reklam Kampanyaları',
    'marketing.subtitle': 'Google, Meta ve YouTube kampanya performansını takip edin.',
    'marketing.addCampaign': '+ Kampanya Ekle',
    'marketing.campaignsTable': 'Kampanyalar',
    'marketing.summaryTitle': 'Funnel Özeti',
    'marketing.colChannel': 'Kanal',
    'marketing.colName': 'İsim',
    'marketing.colSpend': 'Harcama (₺)',
    'marketing.colLeads': 'Lead',
    'marketing.colSource': 'Kaynak',
    'activity.title': 'Hareket Kayıtları',
    'activity.subtitle': 'Önemli işlemlerin otomatik log kaydı (müşteri, dosya, fatura, vize vb.).',
    'settings.title': 'Ayarlar',
    'settings.subtitle': 'Dil, varsayılanlar ve güvenlik tercihleri. (Şu an demo, gerçek backend yok.)',
    'settings.localizationTitle': 'Yerelleştirme',
    'settings.langLabel': 'Varsayılan dil',
    'settings.currencyLabel': 'Para birimi',
    'settings.saveBtn': 'Ayarları kaydet',
    'settings.securityTitle': 'Güvenlik',
    'settings.securityHint': 'Gerçek sistemde kullanıcı yetkileri, 2FA ve API anahtarları buradan yönetilir.',
    'settings.securityItem1': 'Rol bazlı erişim (Admin / Case Manager / Accountant / Marketing)',
    'settings.securityItem2': 'Log kayıtları & dışa aktarma',
    'settings.securityItem3': 'Harici otomasyonlar için API erişimi (Zapier, Make, özel scriptler)',
    'footer.demoNote': 'Sadece dahili kullanım için – demo sürüm (gerçek veri içermez).'
  }
};

let currentLang = localStorage.getItem('vizerio_lang') || 'tr';

function t(key) {
  return translations[currentLang]?.[key] || translations.en[key] || '';
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const value = t(key);
    if (value) el.textContent = value;
  });
  const langToggle = document.getElementById('langToggle');
  if (langToggle) langToggle.textContent = currentLang.toUpperCase();
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('vizerio_lang', lang);
  applyTranslations();
}

const rolePages = {
  admin: ['dashboard', 'clients', 'visa', 'accounting', 'marketing', 'activity', 'settings'],
  marketing: ['dashboard', 'marketing'],
  accounting: ['dashboard', 'accounting'],
  case_manager: ['dashboard', 'clients', 'visa']
};

function applyRolePermissions(role) {
  const allowed = rolePages[role] || rolePages.case_manager;
  document.querySelectorAll('.nav-item').forEach((btn) => {
    const page = btn.getAttribute('data-page');
    if (!allowed.includes(page)) {
      btn.classList.add('hidden');
    } else {
      btn.classList.remove('hidden');
    }
  });
  if (!allowed.includes(getActivePage())) {
    switchPage(allowed[0]);
  }
  const roleLabel = document.querySelector('.user-role');
  if (roleLabel) roleLabel.textContent = role === 'admin' ? 'Admin' : role.replace('_', ' ');
}

function getActivePage() {
  const active = document.querySelector('.page.active');
  if (!active) return 'dashboard';
  return active.id.replace('page-', '');
}

function switchPage(page) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-page') === page);
  });
  const titleEl = document.getElementById('page-title');
  if (titleEl) {
    const navKey = `nav.${page}`;
    const translated = t(navKey);
    titleEl.textContent = translated || page.charAt(0).toUpperCase() + page.slice(1);
  }
}

function showStatus(message, type) {
  const el = document.getElementById('status');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('ok', 'error');
  if (type) el.classList.add(type);
}

function showLogin() {
  const login = document.getElementById('login-screen');
  const app = document.getElementById('app-shell');
  if (login) login.classList.remove('hidden');
  if (app) app.classList.add('hidden');
  const status = document.getElementById('status');
  if (status) {
    status.textContent = '';
    status.classList.remove('ok', 'error');
  }
}

function showAppShell(role, user) {
  const login = document.getElementById('login-screen');
  const app = document.getElementById('app-shell');
  if (login) login.classList.add('hidden');
  if (app) app.classList.remove('hidden');
  const nameEl = document.querySelector('.user-name');
  if (nameEl && user?.email) nameEl.textContent = user.email.split('@')[0];
  applyRolePermissions(role);
  switchPage('dashboard');
}

async function handleInitialSession() {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    showLogin();
    return;
  }
  const user = data.user;
  const role = user.app_metadata?.role || 'case_manager';
  localStorage.setItem('vizerio_user', JSON.stringify({ id: user.id, email: user.email, role }));
  showAppShell(role, user);
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value;
  if (!email || !password) {
    showStatus(t('login.error'), 'error');
    return;
  }
  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;
  showStatus('', null);
  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      showStatus(t('login.error'), 'error');
      if (btn) btn.disabled = false;
      return;
    }
    const user = data.user;
    const role = user.app_metadata?.role || 'case_manager';
    localStorage.setItem('vizerio_user', JSON.stringify({ id: user.id, email: user.email, role }));
    showAppShell(role, user);
  } catch {
    showStatus(t('login.errorTechnical'), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function handleLogout() {
  await client.auth.signOut();
  localStorage.removeItem('vizerio_user');
  showLogin();
}

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const page = btn.getAttribute('data-page');
      switchPage(page);
    });
  });
}

function setupLanguageControls() {
  const select = document.getElementById('langSelect');
  if (select) {
    select.value = currentLang;
    select.addEventListener('change', () => {
      setLanguage(select.value);
    });
  }
  const toggle = document.getElementById('langToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const next = currentLang === 'tr' ? 'en' : 'tr';
      setLanguage(next);
      if (select) select.value = next;
    });
  }
}

function setupSettingsSave() {
  const btn = document.getElementById('btn-save-settings');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const status = document.getElementById('settings-status');
    if (status) {
      status.textContent = currentLang === 'tr' ? 'Ayarlar kaydedildi (lokal).' : 'Settings saved locally.';
      status.classList.remove('error');
      status.classList.add('ok');
      setTimeout(() => {
        status.textContent = '';
        status.classList.remove('ok');
      }, 2000);
    }
  });
}

function seedDemoData() {
  const today = new Date();
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = today.getFullYear();
  const todayEl = document.getElementById('todayDate');
  if (todayEl) todayEl.textContent = today.toLocaleDateString(currentLang === 'tr' ? 'tr-TR' : 'en-GB');
  const stats = {
    clients: 3,
    cases: 4,
    invoices: 2,
    adspend: 9200,
    openCases: 2,
    pendingVisa: 2
  };
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setVal('stat-clients', stats.clients);
  setVal('stat-cases', stats.cases);
  setVal('stat-invoices', stats.invoices);
  setVal('stat-adspend', stats.adspend.toLocaleString('tr-TR'));
  setVal('kpi-open-cases', stats.openCases);
  setVal('kpi-pending-visa', stats.pendingVisa);
  const tagsEl = document.getElementById('dashboard-tags');
  if (tagsEl) {
    tagsEl.innerHTML = '';
    ['UK Student Visa', 'Schengen Touristic', 'US B1/B2'].forEach((label) => {
      const li = document.createElement('li');
      li.textContent = label;
      tagsEl.appendChild(li);
    });
  }
  const agendaEl = document.getElementById('todayAgenda');
  if (agendaEl) {
    agendaEl.innerHTML = '';
    ['UK – biometrics at 10:30', 'Germany – VFS appointment', 'Reminder: check missing documents'].forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      agendaEl.appendChild(li);
    });
  }
  const clientsBody = document.getElementById('tbl-clients');
  if (clientsBody) {
    clientsBody.innerHTML = '';
    const rows = [
      ['Ahmet Yılmaz', 'Türkiye', '+90 5xx xxx xx xx', 'Active'],
      ['Maria Rossi', 'Italy', '+39 xxx xxx', 'Active'],
      ['John Smith', 'UK', '+44 xxx xxx', 'Prospect']
    ];
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      r.forEach((c) => {
        const td = document.createElement('td');
        td.textContent = c;
        tr.appendChild(td);
      });
      clientsBody.appendChild(tr);
    });
  }
  const casesBody = document.getElementById('tbl-cases');
  if (casesBody) {
    casesBody.innerHTML = '';
    const rows = [
      ['Ahmet Yılmaz', 'UK Student', 'Documents', 'Musa'],
      ['Maria Rossi', 'Schengen', 'Biometrics', 'Nurullah'],
      ['John Smith', 'US B1/B2', 'Consultation', 'Ebubekir'],
      ['Company X', 'Work Permit', 'Application', 'Muhammed Ali']
    ];
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      r.forEach((c) => {
        const td = document.createElement('td');
        td.textContent = c;
        tr.appendChild(td);
      });
      casesBody.appendChild(tr);
    });
  }
  const visasBody = document.getElementById('tbl-visas');
  if (visasBody) {
    visasBody.innerHTML = '';
    const rows = [
      ['24.11.2025', 'Ahmet Yılmaz', 'UK', 'VFS Istanbul', 'Scheduled'],
      ['25.11.2025', 'Maria Rossi', 'Germany', 'TLS Roma', 'Scheduled']
    ];
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      r.forEach((c) => {
        const td = document.createElement('td');
        td.textContent = c;
        tr.appendChild(td);
      });
      visasBody.appendChild(tr);
    });
  }
  const invoicesBody = document.getElementById('tbl-invoices');
  if (invoicesBody) {
    invoicesBody.innerHTML = '';
    const rows = [
      ['01.11.2025', 'Ahmet Yılmaz', '18.000', 'Paid'],
      ['10.11.2025', 'Maria Rossi', '12.500', 'Pending']
    ];
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      r.forEach((c) => {
        const td = document.createElement('td');
        td.textContent = c;
        tr.appendChild(td);
      });
      invoicesBody.appendChild(tr);
    });
  }
  const accSummary = document.getElementById('accounting-summary');
  if (accSummary) {
    accSummary.innerHTML = '';
    ['Total revenue this month: 30.500 ₺', 'Pending invoices: 1', 'Average commission: 18%'].forEach((t) => {
      const li = document.createElement('li');
      li.textContent = t;
      accSummary.appendChild(li);
    });
  }
  const campaignsBody = document.getElementById('tbl-campaigns');
  if (campaignsBody) {
    campaignsBody.innerHTML = '';
    const rows = [
      ['Google Ads', 'UK Student Lead Gen', '4.500', '120', 'Search'],
      ['Meta Ads', 'Schengen Remarketing', '2.800', '90', 'Instagram'],
      ['YouTube', 'Brand Awareness', '900', '40', 'Video']
    ];
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      r.forEach((c) => {
        const td = document.createElement('td');
        td.textContent = c;
        tr.appendChild(td);
      });
      campaignsBody.appendChild(tr);
    });
  }
  const marketingSummary = document.getElementById('marketing-summary');
  if (marketingSummary) {
    marketingSummary.innerHTML = '';
    ['Total leads: 250', 'Avg. cost per lead: 28 ₺', 'Best performing channel: Google Ads'].forEach((t) => {
      const li = document.createElement('li');
      li.textContent = t;
      marketingSummary.appendChild(li);
    });
  }
  const activityList = document.getElementById('activity-list');
  if (activityList) {
    activityList.innerHTML = '';
    ['[System] Imported legacy clients.', '[Musa] Created case for Ahmet Yılmaz.', '[Ebubekir] Updated campaign budget.', '[Nurullah] Logged visa appointment for Maria Rossi.'].forEach((t) => {
      const li = document.createElement('li');
      li.textContent = t;
      activityList.appendChild(li);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
  seedDemoData();
  setupNavigation();
  setupLanguageControls();
  setupSettingsSave();

  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  handleInitialSession();
});
```0
