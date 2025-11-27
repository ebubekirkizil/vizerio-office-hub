// js/app.js - Güncellenmiş Navigasyon

const app = {
    switchTab: function(tabName) {
        console.log("Sekme değiştiriliyor: " + tabName);

        // 1. Önce TÜM içerik alanlarını gizle (Zorla)
        const allSections = document.querySelectorAll('.content-section');
        allSections.forEach(section => {
            section.style.display = 'none'; // CSS'i ezer, gizlemeyi garanti eder
            section.classList.remove('active');
        });

        // 2. Tüm menü butonlarının aktifliğini kaldır
        document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));

        // 3. Seçilen sekmeyi bul
        const targetSection = document.getElementById('section-' + tabName);
        if (targetSection) {
            targetSection.style.display = 'block'; // Görünür yap
            // Küçük bir gecikmeyle class ekle ki animasyon çalışsın
            setTimeout(() => {
                targetSection.classList.add('active');
            }, 10);
        }

        // 4. İlgili menü butonunu aktif yap (Basit mantık)
        // (Bunu daha sonra dinamik yapacağız, şimdilik bu yeterli)
    }
};

console.log("🚀 Vizerio v2.1 (Navigasyon Düzeltildi) Başlatıldı.");
