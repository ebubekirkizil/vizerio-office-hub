// ===============================================
// VIZERIO OFFICE HUB - APP.JS (SON VE TAM VERSİYON)
// ===============================================

// 1. SUPABASE BAĞLANTISI
// (Bu anahtarlar sizin Supabase projenize özeldir.)
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
const pageTitleEl = document.getElementById('page-title');
const langToggleBtn = document.getElementById("langToggle"); 

// Modal Elementleri
const addClientBtn = document.getElementById("btn-add-client");
const addClientModal = document.getElementById("modal-add-client");
const closeClientModalBtn = document.getElementById("btn-close-client-modal");
const formAddClient = document.getElementById("form-add-client");
const clientFormStatus = document.getElementById("client-form-status");

let currentUser = null;

// ===============================================
// 3. ÇEVİRİ SİSTEMİ (TÜRKÇE / İNGİLİZCE)
// ===============================================

const TRANSLATIONS = {
  tr: {
    app_name: "Vizerio Office Hub",
    nav_dashboard: "Gösterge Paneli",
    nav_clients: "Müşteriler & Dosyalar",
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
    clients_title: "Müşteriler",
    clients_addClient: "+ Ekle",
    clients_clientsTable: "Liste",
    clients_colName: "İsim",
    clients_colCountry: "Ülke",
    clients_colStatus: "Durum",
    marketing_title: "Pazarlama",
    marketing_addCampaign: "+ Kampanya",
    marketing_campaignsTable: "Aktif Kampanyalar",
    clients_addClientModalTitle: "Yeni Müşteri Kaydı",
    clients_clientInfoTitle: "Kişisel Bilgiler",
    clients_clientNameLabel: "Ad Soyad",
    clients_clientEmailLabel: "E-posta",
    clients_clientPhoneLabel: "Telefon",
    clients_clientCountryLabel: "Ülke",
    clients_caseInfoTitle: "Başvuru",
    clients_visaTypeLabel: "Vize Tipi",
    clients_cancelBtn: "İptal",
    clients_saveClientBtn: "Kaydet",
    footer_demoNote: "Vizerio v1.0"
  },
  en: {
    app_name: "Vizerio Office Hub",
    nav_dashboard: "Dashboard",
    nav_clients: "Clients & Cases",
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
    clients_title: "Clients",
    clients_addClient: "+ Add",
    clients_clientsTable: "List",
    clients_colName: "Name",
    clients_colCountry: "Country",
    clients_colStatus: "Status",
    marketing_title: "Marketing",
    marketing_addCampaign: "+ Campaign",
    marketing_campaignsTable: "Active Campaigns",
    clients_addClientModalTitle: "New Client",
    clients_clientInfoTitle: "Personal Info",
    clients_clientNameLabel: "Full Name",
    clients_clientEmailLabel: "Email",
    clients_clientPhoneLabel: "Phone",
    clients_clientCountryLabel: "Country",
    clients_caseInfoTitle: "Case",
    clients_visaTypeLabel: "Visa Type",
    clients_cancelBtn: "Cancel",
    clients_saveClientBtn: "Save",
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
// 4. YETKİLENDİRME (ROL YÖNETİMİ)
// ===============================================

async function applyRolePermissions(user) {
    if (!user) return;

    // 1. Profil ve Rolü Çek
    let { data, error } = await supabaseClient
        .from('profiles')
        .select('role, name')
        .eq('id', user.id)
        .single();

    if (error || !data) {
        console.log("Profil bulunamadı.");
        data = { role: 'case_manager', name: user.email };
    }

    const role = data.role;
    currentUser = { id: user.id, role: role, name: data.name };

    // 2. UI Güncelle
    document.querySelector('.user-name').textContent = data.name || "Kullanıcı";
    userRoleEl.textContent = role.toUpperCase().replace('_', ' ');

    // 3. Menüleri Gizle/Göster
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    
    navItems.forEach(item => {
        const page = item.getAttribute('data-page');
        
        // Önce hepsini gizle
        item.style.display = 'none';

        if (role === 'admin') {
            item.style.display = 'flex'; // Admin hepsini görür
        } 
        else if (role === 'marketing') {
            // Marketing: SADECE Dashboard ve Marketing
            if (page === 'dashboard' || page === 'marketing') {
                item.style.display = 'flex';
            }
        }
        else {
            // Diğerleri: Marketing ve Ayarlar hariç
            if (page !== 'marketing' && page !== 'settings') {
                item.style.display = 'flex';
            }
        }
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

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email, password
    });

    if (error) {
        statusEl.textContent = i18n('login_error_credentials');
        statusEl.classList.add('error');
        return;
    }

    statusEl.textContent = "Başarılı!";
    statusEl.classList.add('ok');
    
    setAppVisibility(true);
    await applyRolePermissions(data.user);
    
    // İlk görünür menüye otomatik tıkla
    setTimeout(() => {
        const first = document.querySelector('.sidebar-nav .nav-item[style="display: flex;"]');
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
        await applyRolePermissions(session.user);
        
        // Tarihi yaz
        document.getElementById('todayDate').textContent = new Date().toLocaleDateString('tr-TR');
    } else {
        setAppVisibility(false);
    }
}

// ===============================================
// 6. SAYFA GEZİNTİSİ & MODAL
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
            document.getElementById(`page-${targetId}`).classList.add('active');

            updatePageTitle(item);
        });
    });
}

function updatePageTitle(item) {
    const key = `nav_${item.getAttribute('data-page')}`;
    pageTitleEl.textContent = i18n(key);
}

// MÜŞTERİ EKLEME İŞLEMİ
async function handleAddClient(e) {
    e.preventDefault();
    if(!currentUser) return;

    clientFormStatus.textContent = "Kaydediliyor...";
    clientFormStatus.className = "status";

    const name = document.getElementById('client-name').value;
    const email = document.getElementById('client-email').value;
    const phone = document.getElementById('client-phone').value;
    const country = document.getElementById('client-country').value;
    
    // Müşteriyi Kaydet
    const { data: client, error: err1 } = await supabaseClient
        .from('clients')
        .insert([{ full_name: name, email, phone, country, assigned_user: currentUser.id }])
        .select()
        .single();

    if(err1) {
        clientFormStatus.textContent = "Hata: " + err1.message;
        clientFormStatus.classList.add('error');
        return;
    }

    clientFormStatus.textContent = "Kaydedildi!";
    clientFormStatus.classList.add('ok');
    
    setTimeout(() => {
        addClientModal.classList.add('hidden');
        document.getElementById('form-add-client').reset();
        clientFormStatus.textContent = "";
    }, 1500);
}

document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    setupNavigation();
    
    if(loginForm) loginForm.addEventListener('submit', handleLogin);
    if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if(langToggleBtn) langToggleBtn.addEventListener('click', toggleLanguage);

    if(addClientBtn) addClientBtn.addEventListener('click', () => addClientModal.classList.remove('hidden'));
    if(closeClientModalBtn) closeClientModalBtn.addEventListener('click', () => addClientModal.classList.add('hidden'));
    if(formAddClient) formAddClient.addEventListener('submit', handleAddClient);

    applyTranslations();
});
