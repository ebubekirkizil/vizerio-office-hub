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
