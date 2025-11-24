// ===============================================
// 1) SUPABASE ENTEGRASYONU & KULLANICI YÖNETİMİ
// ===============================================

// Supabase Bilgileri (Sizden alınan anahtarlar)
const SUPABASE_URL = "https://dgvxzlfeagwzmyjqhupu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndnh6bGZlYWd3em15anFodXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDEyNDEsImV4cCI6MjA3OTU3NzI0MX0.rwVR89JBTeue0cAtbujkoIBbqg3VjAEsLesXPlcr078";

// Supabase Kütüphanesinin Dışarıdan Yüklendiğini Varsayıyoruz (index.html'de olacak)
// index.html'de <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> olduğundan emin olun.
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elementleri
const loginForm = document.getElementById("loginForm");
const statusEl = document.getElementById("status");
const loginScreen = document.getElementById("login-screen");
const appShell = document.getElementById("app-shell");
const logoutBtn = document.getElementById("logoutBtn");
const userRoleEl = document.querySelector('.user-role'); // Kullanıcı rolü elementi

// Durum mesajlarını göster
function showStatus(message, type) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove("ok", "error");
    if (type) statusEl.classList.add(type);
}

// Arayüz görünürlüğünü ayarla
function setAppVisibility(isLoggedIn, user) {
    if (isLoggedIn) {
        // Oturum açılmışsa
        loginScreen.classList.add('hidden');
        appShell.classList.remove('hidden');
        // Kullanıcı rolünü Supabase'den gelen veriye göre ayarla
        // Not: Gerçek rolu Supabase'deki 'profiles' tablonuzdan çekmeliyiz, 
        // şimdilik varsayılan Admin yapalım.
        // userRoleEl.textContent = user?.user_metadata?.role || 'Admin'; 
        userRoleEl.textContent = 'Admin'; 
        
    } else {
        // Oturum kapalıysa
        appShell.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    }
}

// Giriş Fonksiyonu
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
        // Hata durumunda (yanlış şifre/e-posta)
        showStatus(`Giriş Başarısız: ${error.message}`, "error");
        return;
    }

    // Başarılı giriş
    showStatus(i18n("login_demo_ok_prefix") + email + "!", "ok");
    setAppVisibility(true, data.user);
    // Yönlendirme mantığı: Gerekirse window.location.href = '/dashboard.html' eklenebilir.
}

// Çıkış Fonksiyonu
async function handleLogout() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Çıkış Hatası:", error);
        alert("Çıkış yapılırken bir hata oluştu.");
        return;
    }

    // Başarılı çıkış
    setAppVisibility(false, null);
    showStatus("Oturum kapatıldı.", "ok");
}

// Mevcut Oturumu Kontrol Et ve Arayüzü Ayarla
async function checkAuthStatus() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        // Oturum varsa kullanıcıyı al ve arayüzü göster
        const { data: { user } } = await supabaseClient.auth.getUser();
        setAppVisibility(true, user);
    } else {
        // Oturum yoksa giriş ekranını göster
        setAppVisibility(false, null);
    }
}

// =====================================
// 2) Çeviri ve Genel Uygulama Mantığı (Mevcut Kodunuzdan)
// =====================================

// Footer'da yıl gösterimi
const yearEl = document.getElementById("year");
if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
}

// --- ÇEVİRİ TABLOSU --- (Mevcut kodunuzu koruyoruz)
// [Çeviri tablosu buraya gelecek. Kodu kısaltmak için buraya koymuyorum.]
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
    login_demo_ok_prefix: "Giriş başarılı. Hoş geldin, ",
    
    // Yeni Eklenen
    nav_logout: "Çıkış Yap",
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
    login_demo_ok_prefix: "Login successful. Welcome, ",
    
    // New
    nav_logout: "Log out",
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
        
        // Key'i temizle, login.title gibi formatı destekle
        const parts = key.split('.');
        let translation = TRANSLATIONS[currentLang];
        
        for (const part of parts) {
            translation = translation ? translation[part] : undefined;
        }

        const text = translation || "";

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

// =====================================
// 3) Etkinlik Bağlantıları (DOMContentLoaded)
// =====================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Güvenlik Kontrolü
    checkAuthStatus();

    // 2. Event Listener'lar
    if (loginForm) {
        // Giriş Formu Submit
        loginForm.addEventListener("submit", handleLogin);
    }
    if (logoutBtn) {
        // Çıkış Butonu
        logoutBtn.addEventListener("click", handleLogout);
    }

    // 3. Dil Butonu
    const langBtn = document.getElementById("langToggle");
    if (langBtn) {
        langBtn.addEventListener("click", toggleLanguage);
    }
    
    // 4. Çeviriyi Uygula
    applyTranslations();
    
    // 5. Sayfa Yönlendirme (Menü Tıklamaları)
    // Bu kısım, SPA (Single Page Application) mantığını yönetir.
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const pageTitleEl = document.getElementById('page-title');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPageId = item.getAttribute('data-page');
            
            // Tüm sayfaları gizle
            document.querySelectorAll('.pages .page').forEach(page => {
                page.classList.remove('active');
            });
            // Hedef sayfayı göster
            const targetPage = document.getElementById(`page-${targetPageId}`);
            if (targetPage) {
                targetPage.classList.add('active');
            }
            
            // Sidebar aktifliğini güncelle
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Başlığı güncelle (i18n'den çek)
            const titleKey = `${targetPageId}_title`; // Örn: dashboard_title
            const newTitle = TRANSLATIONS[currentLang][titleKey] || targetPageId.toUpperCase();
            if(pageTitleEl) {
                pageTitleEl.textContent = newTitle;
            }
        });
    });

    // İlk yüklemede dashboard başlığını ayarla
    const initialNavItem = document.querySelector('.sidebar-nav .nav-item.active');
    if (initialNavItem) {
         const initialPageId = initialNavItem.getAttribute('data-page');
         const initialTitleKey = `${initialPageId}_title`;
         const initialTitle = TRANSLATIONS[currentLang][initialTitleKey] || initialPageId.toUpperCase();
         if(pageTitleEl) {
             pageTitleEl.textContent = initialTitle;
         }
    }
});
