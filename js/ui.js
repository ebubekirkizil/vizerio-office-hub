// js/ui.js - Arayüz Kontrolcüsü

window.ui = {
    // Modal Açma Fonksiyonu
    openModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active'); // CSS'deki .active sınıfını ekler
            console.log("Pencere açıldı: " + modalId);
        } else {
            console.error("Modal bulunamadı: " + modalId);
        }
    },

    // Modal Kapatma Fonksiyonu
    closeModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    },

    // Para Birimi Değişince (Şimdilik sadece log atar)
    updateCurrency: function() {
        const currency = document.getElementById('currencySelect').value;
        console.log("Para birimi değişti: " + currency);
        // İlerde buraya tüm rakamları çarpan kod gelecek
    }
};
