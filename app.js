// ===============================================
// VIZERIO OFFICE HUB - APP.JS (FULL REVİZYON)
// Supabase Auth, Rol Kontrolü, Giriş Hata Bildirimi ve Çeviri Mantığı
// ===============================================

// Supabase Bilgileri (Sizden alınan anahtarlar)
const SUPABASE_URL = "https://dgvxzlfeagwzmyjqhupu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndnh6bGZlYWd3em15anFodXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDEyNDEsImV4cCI6MjA3OTU3NzI0MX0.rwVR89JBTeue0cAtbujkoIBbqg3VjAEsLesXPlcr078";

// Supabase İstemcisini Başlat
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elementleri
const loginForm = document.getElementById("loginForm");
const statusEl = document.getElementById("status");
const loginScreen = document.getElementById("login-screen");
const appShell = document.getElementById("app-shell");
const logoutBtn = document.getElementById("logoutBtn");
const userRoleEl = document.querySelector('.user-role');
const pageTitleEl = document.getElementById('page-title');
const langToggleBtn = document.getElementById("langToggle"); // Dil butonu DOM objesi

// ===============================================
// 1) ÇEVİRİ MANTIĞI (i18n)
// ===============================================

const TRANSLATIONS = {
  tr: {
    app_name: "Vizerio Office Hub",
    dashboard_title: "Gösterge Paneli",
    clients_title: "Müşteriler & Dosyalar",
    visa_title: "Vize Randevuları",
    accounting_title: "Muhasebe",
    marketing_title: "Marketing & Reklam",
    activity_title: "Aktivite Kayıtları",
    settings_title: "Ayarlar",

    // Login ekranı
    login_title: "Vizerio Office Hub'a Hoş Geldin",
    login_subtitle: "Dahili operasyon paneli",
    login_emailLabel: "E-posta",
    login_passwordLabel: "Şifre",
    login_signIn: "Giriş Yap",
    login_fill_both: "Lütfen e-posta ve şifre alanlarını doldurun.",
    login_demo_ok_prefix: "Giriş başarılı. Hoş geldin, ",
    login_error_credentials: "Giriş Başarısız. Lütfen e-posta ve şifrenizi kontrol edin.", // Yeni Hata Mesajı
    
    nav_logout: "Çıkış Yap",
    // Diğer çeviriler eksikse buraya eklenecektir.
  },

  en: {
    app_name: "Vizerio Office Hub",
    dashboard_title: "Dashboard",
    clients_title: "Clients & Cases",
    visa_title: "Visa Appointments",
    accounting_title: "Accounting",
    marketing_title: "Marketing & Ads",
    activity_title: "Activity Logs",
    settings_title: "Settings",

    // Login screen examples
    login_title: "Welcome to Vizerio Office Hub",
    login_subtitle: "Internal operations panel",
    login_emailLabel: "Email",
    login_passwordLabel: "Password",
    login_signIn: "Sign In",
    login_fill_both: "Please fill in both email and password.",
    login_demo_ok_prefix: "Login successful. Welcome, ",
    login_error_credentials: "Login Failed. Please check your email and password.",

    nav_logout: "Log out",
    // Diğer çeviriler eksikse buraya eklenecektir.
  },
};
const DEFAULT_LANG = "tr";
let currentLang = (localStorage.getItem("vizerio_lang") || DEFAULT_LANG);
if (!["tr", "en"].includes(currentLang)) currentLang = DEFAULT_LANG;

function i18n(key) {
    const parts = key.split('.');
    let translation = TRANSLATIONS[currentLang];
    
    for (const part of parts) {
        translation = translation ? translation[part] : undefined;
    }
    return translation || "";
}

function applyTranslations() {
    const nodes = document.querySelectorAll("[data-i18n]");
    nodes.forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (!key) return;
        const text = i18n(key);
        if (!text) return;

        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
            // Placeholder kullan
            el.setAttribute("placeholder", text); 
        } else if (el.tagName === "SPAN" && el.closest('button')) {
             // Buton içindeki span'leri güncelle
             el.textContent = text;
        } else {
            el.textContent = text;
        }
    });

    if (langToggleBtn) {
        langToggleBtn.textContent = currentLang.toUpperCase();
    }
}

function toggleLanguage() {
    currentLang = currentLang === "tr" ? "en" : "tr";
    localStorage.setItem("vizerio_lang", currentLang);
    applyTranslations();
    
    // Menü başlığını dil değişince güncelle
    const activeNavItem = document.querySelector('.sidebar-nav .nav-item.active');
    if (activeNavItem) {
        updatePageTitle(activeNavItem);
    }
}

// ===============================================
// 2) ROL TABANLI ERİŞİM KONTROLÜ
// ===============================================

/**
 * Kullanıcının rolüne göre menüleri gizler/gösterir ve arayüzü ayarlar.
 * @param {object} user - Supabase'den gelen kullanıcı objesi.
 */
async function applyRolePermissions(user) {
    if (!user) return;

    // Supabase'den kullanıcının rolünü ve adını profiles tablosundan çek
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('role, name')
        .eq('id', user.id)
        .single();

    if (error || !data) {
        console.error("Profil/Rol alınamadı, varsayılan rol atanıyor: case_manager", error);
        // Hata durumunda (profiles tablosunda kayıt yoksa) default rol ata
        const userRole = 'case_manager';
        userRoleEl.textContent = userRole.toUpperCase().replace('_', ' ');

    } else {
        const userRole = data.role; 
        const userName = data.name || user.email;
        
        // Kullanıcı Adı ve Rolünü Arayüze Yaz
        document.querySelector('.user-name').textContent = userName;
        userRoleEl.textContent = userRole.toUpperCase().replace('_', ' ');

        // Rol-Yetki Eşleşmesi (Kullanıcı Tarafından Belirtilen Kurallar)
        // Marketing: Sadece Marketing
        // Diğerleri (admin, case_manager, accountant): Daha fazla menü
        
        const requiredRoles = {
            'dashboard': ['admin', 'case_manager', 'accountant', 'marketing'],
            'clients': ['admin', 'case_manager', 'accountant'],
            'visa': ['admin', 'case_manager', 'accountant'],
            'accounting': ['admin', 'accountant'],
            'marketing': ['admin', 'marketing', 'case_manager'], // Case manager'ın da görmesi mantıklı
            'activity': ['admin'],
            'settings': ['admin']
        };

        // Sidebar menülerini kontrol et
        const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
        navItems.forEach(item => {
            const pageId = item.getAttribute('data-page');

            // Eğer kullanıcının rolü, bu sayfanın izin verilen rolleri arasında varsa
            if (requiredRoles[pageId] && requiredRoles[pageId].includes(userRole)) {
                item.style.display = 'flex'; // Göster
            } else {
                item.style.display = 'none'; // Gizle
            }
        });

        // Admin, geliştirici ve kontrol amaçlı her şeyi görür.
        if (userRole === 'admin') {
            navItems.forEach(item => item.style.display = 'flex');
        }
    }
}

// ===============================================
// 3) AUTH & YÖNLENDİRME MANTIĞI
// ===============================================

function showStatus(message, type) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove("ok", "error");
    if (type) statusEl.classList.add(type);
}

function setAppVisibility(isLoggedIn, user) {
    if (isLoggedIn) {
        loginScreen.classList.add('hidden');
        appShell.classList.remove('hidden');
    } else {
        appShell.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    if (!email || !password) {
        showStatus(i18n("login_fill_both") || "Lütfen e-posta ve şifre alanlarını doldurun.", "error");
        return;
    }

    showStatus("Giriş yapılıyor...", "ok");

    // Supabase Kimlik Doğrulama
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        // HATA DURUMU: Kırmızı uyarıyı göster
        showStatus(i18n("login_error_credentials"), "error"); 
        console.error("Giriş Hatası:", error.message);
        return;
    }

    // Başarılı giriş
    showStatus(i18n("login_demo_ok_prefix") + email + "!", "ok");
    setAppVisibility(true, data.user);
    await applyRolePermissions(data.user); 
    updatePageTitle(document.querySelector('.sidebar-nav .nav-item.active'));
}

async function handleLogout() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Çıkış Hatası:", error);
        // alert yerine status ile göster
        showStatus("Çıkış yapılırken bir hata oluştu.", "error");
        return;
    }

    setAppVisibility(false, null);
    showStatus("Oturum kapatıldı. Lütfen tekrar giriş yapın.", "ok");
}

async function checkAuthStatus() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        setAppVisibility(true, user);
        
        // KRİTİK: Rol Kontrolünü Çalıştır
        await applyRolePermissions(user); 
        
        // Başlığı ayarla
        const activeNavItem = document.querySelector('.sidebar-nav .nav-item.active');
        if (activeNavItem) {
            updatePageTitle(activeNavItem);
        }
        
    } else {
        setAppVisibility(false, null);
    }
}

// Menü Başlığını Güncelle
function updatePageTitle(item) {
    const targetPageId = item.getAttribute('data-page');
    const titleKey = `${targetPageId}_title`; 
    const newTitle = i18n(titleKey) || targetPageId.toUpperCase();
    if(pageTitleEl) {
        pageTitleEl.textContent = newTitle;
    }
}

// ===============================================
// 4) SAYFA GEZİNTİSİ VE BAŞLATMA
// ===============================================

function setupNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const pages = document.querySelectorAll('.pages .page');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPageId = item.getAttribute('data-page');
            
            // Tüm sayfaları gizle
            pages.forEach(page => page.classList.remove('active'));
            const targetPage = document.getElementById(`page-${targetPageId}`);
            if (targetPage) {
                targetPage.classList.add('active');
            }
            
            // Sidebar aktifliğini güncelle
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Başlığı güncelle
            updatePageTitle(item);
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. Footer Yılını Ayarla
    const yearEl = document.getElementById("year");
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    // 2. Güvenlik Kontrolü ve Başlatma
    checkAuthStatus();

    // 3. Olay Dinleyicileri
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }
    // DİL BUTONU DİNLEYİCİSİ
    if (langToggleBtn) {
        langToggleBtn.addEventListener("click", toggleLanguage);
    }

    // 4. Gezintiyi Kur
    setupNavigation();
    
    // 5. İlk Çeviriyi Uygula
    applyTranslations();
});
