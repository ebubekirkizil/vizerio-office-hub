// ===============================================
// VIZERIO OFFICE HUB - APP.JS (YETKİSİZ / TAM ERİŞİM)
// Özellik: Tüm kullanıcılar tüm menülere erişebilir.
// ===============================================

// 1. SUPABASE BAĞLANTISI
const SUPABASE_URL = "https://dgvxzlfeagwzmyjqhupu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndnh6bGZlYWd3em15anFodXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDEyNDEsImV4cCI6MjA3OTU3NzI0MX0.rwVR89JBTeue0cAtbujkoIBbqg3VjAEsLesXPlcr078";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. DOM ELEMENTLERİ
const loginForm = document.getElementById("loginForm");
const statusEl = document.getElementById("status");
const loginScreen = document.getElementById("login-screen");
const appShell = document.getElementById("app-shell");
const logoutBtn = document.getElementById("logoutBtn");
const userRoleEl = document.querySelector('.user-role');
const userNameEl = document.querySelector('.user-name');
const pageTitleEl = document.getElementById('page-title');
const langToggleBtn = document.getElementById("langToggle"); 

// Tablo ve KPI Elementleri
const casesTableBody = document.getElementById('tbl-cases'); 
const statClientsEl = document.getElementById('stat-clients');
const statCasesEl = document.getElementById('stat-cases');
const statAdspendEl = document.getElementById('stat-adspend');

let currentUser = null;

// ===============================================
// 3. ÇEVİRİ SİSTEMİ (TR / EN)
// ===============================================

const TRANSLATIONS = {
  tr: {
    app_name: "Vizerio Office Hub",
    nav_dashboard: "Gösterge Paneli",
    nav_clients: "Müşteriler & Randevular",
    nav_visa: "Vize Randevuları",
    nav_accounting: "Muhasebe",
    nav_marketing: "Pazarlama & Reklam",
    nav_activity: "Aktivite Kayıtları",
    nav_settings: "Ayarlar",
    nav_logout: "Çıkış Yap",
    login_subtitle: "Dahili Operasyon Paneli",
    login_emailLabel: "E-posta",
    login_passwordLabel: "Şifre",
    login_signIn: "Giriş Yap",
    login_error_credentials: "Giriş başarısız. Bilgileri kontrol et.",
    top_subtitle: "Tam kapsamlı yönetim paneli",
    kpi_today: "Bugün",
    dashboard_pipelineTitle: "İş Akışı Özeti",
    dashboard_statClients: "Aktif Müşteri",
    dashboard_statCases: "Aktif Dosya",
    dashboard_statAdspend: "Reklam (₺)",
    clients_title: "Müşteriler & Randevular",
    clients_clientsTable: "Aktif Vize Dosyaları",
    clients_colName: "Müşteri Adı",
    visa_colCountry: "Vize Ülkesi",
    visa_colDate: "Randevu Tarihi",
    visa_colCenter: "Başvuru Merkezi",
    clients_colStatus: "Durum",
    marketing_title: "Pazarlama",
    marketing_campaignsTable: "Aktif Kampanyalar",
    footer_demoNote: "Vizerio v1.0"
  },
  en: {
    app_name: "Vizerio Office Hub",
    nav_dashboard: "Dashboard",
    nav_clients: "Clients & Appointments",
    nav_visa: "Visa Appointments",
    nav_accounting: "Accounting",
    nav_marketing: "Marketing & Ads",
    nav_activity: "Activity Logs",
    nav_settings: "Settings",
    nav_logout: "Logout",
    login_subtitle: "Internal Operations Panel",
    login_emailLabel: "Email",
    login_passwordLabel: "Password",
    login_signIn: "Sign In",
    login_error_credentials: "Login failed.",
    top_subtitle: "Management Panel",
    kpi_today: "Today",
    dashboard_pipelineTitle: "Pipeline Overview",
    dashboard_statClients: "Active Clients",
    dashboard_statCases: "Active Cases",
    dashboard_statAdspend: "Ad Spend",
    clients_title: "Clients & Appointments",
    clients_clientsTable: "Active Visa Cases",
    clients_colName: "Client Name",
    visa_colCountry: "Visa Country",
    visa_colDate: "Appointment Date",
    visa_colCenter: "Application Center",
    clients_colStatus: "Status",
    marketing_title: "Marketing",
    marketing_campaignsTable: "Active Campaigns",
    footer_demoNote: "Vizerio v1.0"
  }
};

const DEFAULT_LANG = "tr";
let currentLang = (localStorage.getItem("vizerio_lang") || DEFAULT_LANG);

function i18n(key) {
    return TRANSLATIONS[currentLang][key] || key;
}

function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        const text = i18n(key);
        
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
            el.setAttribute("placeholder", text);
        } else {
            el.textContent = text;
        }
    });
    // Menü metinlerini de güncelle
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        const page = item.getAttribute('data-page');
        const span = item.querySelector('span');
        if(span) span.textContent = i18n('nav_' + page);
    });

    if(langToggleBtn) langToggleBtn.textContent = currentLang.toUpperCase();
}

function toggleLanguage() {
    currentLang = currentLang === "tr" ? "en" : "tr";
    localStorage.setItem("vizerio_lang", currentLang);
    applyTranslations();
    
    const activeItem = document.querySelector('.sidebar-nav .nav-item.active');
    if(activeItem) updatePageTitle(activeItem);
}

// ===============================================
// 4. YETKİLENDİRME İPTALİ (HERKES HER ŞEYİ GÖRÜR)
// ===============================================

async function initUserAccess(user) {
    if (!user) return;

    currentUser = user;

    // Profil tablosundan sadece İSİM çekmek için sorgu atıyoruz (Rolü artık umursamıyoruz)
    let { data, error } = await supabaseClient
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

    const displayName = (data && data.name) ? data.name : user.email;

    // Arayüzü güncelle
    if(userNameEl) userNameEl.textContent = displayName;
    if(userRoleEl) userRoleEl.textContent = "YÖNETİCİ"; // Herkes Yönetici

    // TÜM MENÜLERİ GÖSTER
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
        item.style.display = 'flex';
    });
}

// ===============================================
// 5. GİRİŞ / ÇIKIŞ İŞLEMLERİ
// ===============================================

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    statusEl.textContent = "Giriş yapılıyor...";
    statusEl.className = "status";

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        statusEl.textContent = i18n('login_error_credentials');
        statusEl.classList.add('error');
        return;
    }

    statusEl.textContent = "Başarılı!";
    statusEl.classList.add('ok');
    
    setAppVisibility(true);
    await initUserAccess(data.user);
    
    // Dashboard verilerini yükle
    loadDashboardKPIs();
    loadClientAppointments();

    // İlk menüye tıkla
    setTimeout(() => {
        const first = document.querySelector('.sidebar-nav .nav-item');
        if(first) first.click();
    }, 100);
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    setAppVisibility(false);
    window.location.reload(); 
}

function setAppVisibility(isLoggedIn) {
    if (isLoggedIn) {
        loginScreen.classList.add('hidden');
        appShell.classList.remove('hidden');
    } else {
        appShell.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    }
}

async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        setAppVisibility(true);
        await initUserAccess(session.user);
        
        // Verileri yükle
        loadDashboardKPIs();
        loadClientAppointments();

        if(document.getElementById('todayDate')) {
            document.getElementById('todayDate').textContent = new Date().toLocaleDateString('tr-TR');
        }
    } else {
        setAppVisibility(false);
    }
}

// ===============================================
// 6. VERİ LİSTELEME (DASHBOARD & MÜŞTERİLER)
// ===============================================

// Müşteri & Randevu Listesini Çek
async function loadClientAppointments() {
    if (!casesTableBody) return;

    casesTableBody.innerHTML = '<tr><td colspan="5">Yükleniyor...</td></tr>';
    
    // Tüm randevuları çek (Filtresiz, çünkü herkes her şeyi görüyor)
    const { data: appointments, error } = await supabaseClient
        .from('appointments')
        .select(`
            appointment_id,
            appointment_date,
            visa_country,
            center,
            status,
            client:clients (full_name) 
        `)
        .order('appointment_date', { ascending: true });

    if (error) {
        casesTableBody.innerHTML = `<tr><td colspan="5" style="color: #ff6b6b;">Hata oluştu.</td></tr>`;
        return;
    }

    if (!appointments || appointments.length === 0) {
        casesTableBody.innerHTML = `<tr><td colspan="5">Kayıt bulunamadı.</td></tr>`;
        return;
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('tr-TR', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    casesTableBody.innerHTML = appointments.map(app => `
        <tr>
            <td>${app.client ? app.client.full_name : 'Bilinmiyor'}</td>
            <td>${app.visa_country || '-'}</td>
            <td>${formatDate(app.appointment_date)}</td>
            <td>${app.center || '-'}</td>
            <td><span class="status-tag status-${app.status ? app.status.toLowerCase() : 'lead'}">${app.status ? app.status.toUpperCase() : '-'}</span></td>
        </tr>
    `).join('');
}

// Dashboard Özet Sayılarını Çek
async function loadDashboardKPIs() {
    if(!statClientsEl) return;

    // 1. Toplam Müşteri
    const { count: clientCount } = await supabaseClient
        .from('clients')
        .select('*', { count: 'exact', head: true });

    // 2. Aktif Dosyalar (Randevular)
    const { count: activeCaseCount } = await supabaseClient
        .from('appointments')
        .select('*', { count: 'exact', head: true });
    
    // 3. Toplam Gelir (Ödenmiş Faturalar)
    const { data: paidInvoices } = await supabaseClient
        .from('invoices')
        .select('amount')
        .eq('payment_status', 'paid');
        
    let totalRevenue = 0;
    if (paidInvoices) {
        totalRevenue = paidInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
    }
    
    // Reklam Harcaması (Şimdilik sabit veya tablodan çekilebilir, şimdilik sabit örnek)
    const adSpend = 12500; 

    // Ekranı Güncelle
    if(statClientsEl) statClientsEl.textContent = (clientCount || 0).toLocaleString('tr-TR');
    if(statCasesEl) statCasesEl.textContent = (activeCaseCount || 0).toLocaleString('tr-TR');
    if(statAdspendEl) statAdspendEl.textContent = `₺${adSpend.toLocaleString('tr-TR')}`;
}

// ===============================================
// 7. NAVİGASYON
// ===============================================

function setupNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const pages = document.querySelectorAll('.pages .page');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            const targetId = item.getAttribute('data-page');
            pages.forEach(p => p.classList.remove('active'));
            
            const targetPage = document.getElementById(`page-${targetId}`);
            if (targetPage) targetPage.classList.add('active');

            updatePageTitle(item);
            
            // Sayfa değişiminde verileri tazeleyelim
            if (targetId === 'clients') loadClientAppointments();
            if (targetId === 'dashboard') loadDashboardKPIs();
        });
    });
}

function updatePageTitle(item) {
    const key = item.getAttribute('data-page');
    if(pageTitleEl) pageTitleEl.textContent = i18n('nav_' + key);
}

document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    setupNavigation();
    
    if(loginForm) loginForm.addEventListener('submit', handleLogin);
    if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if(langToggleBtn) langToggleBtn.addEventListener('click', toggleLanguage);

    applyTranslations();
});
