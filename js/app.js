// js/app.js - Ana Başlatıcı

const app = {
    // Sekme Değiştirme Fonksiyonu
    switchTab: function(tabName) {
        // 1. Tüm sectionları gizle
        document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
        // 2. Tüm menü butonlarını pasif yap
        document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));

        // 3. Seçileni aktif yap
        document.getElementById('section-' + tabName).classList.add('active');
        
        // (Burada menü butonunu aktif yapma kodu da olacak, şimdilik basit tuttum)
        console.log("Sekme değişti: " + tabName);
    }
};

// Uygulamayı başlat
console.log("🚀 Vizerio v2.0 Başlatıldı.");
