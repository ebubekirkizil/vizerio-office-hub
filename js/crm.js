// js/crm.js - Müşteri ve Vize Operasyonları

window.crm = {
    
    // SİHİRBAZ İLERİ/GERİ MANTIĞI
    nextStep: function(stepNumber) {
        // 1. Önceki sayfayı gizle
        document.querySelectorAll('.wizard-page').forEach(el => el.style.display = 'none');
        // 2. Yeni sayfayı göster
        document.getElementById('w-step-' + stepNumber).style.display = 'block';
        
        // 3. Yukarıdaki 1-2-3 çubuğunu güncelle
        document.querySelectorAll('.w-step').forEach(el => el.classList.remove('active'));
        document.getElementById('w-step-' + stepNumber + '-indicator').classList.add('active');
        
        console.log("Sihirbaz Adım: " + stepNumber);
    },

    prevStep: function(stepNumber) {
        this.nextStep(stepNumber); // Geri gitmek aslında o sayfaya "ileri" gitmekle aynı mantık :)
    },

    // FOTOĞRAF ÖNİZLEME
    previewPhoto: function(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.getElementById('photo-preview');
                img.src = e.target.result;
                img.style.display = 'block'; // Resmi göster
                input.parentElement.querySelector('span').style.display = 'none'; // İkonu gizle
            }
            reader.readAsDataURL(input.files[0]);
        }
    },

    // OTOMATİK KÂR HESAPLAMA
    calculateProfit: function() {
        const price = parseFloat(document.getElementById('v-price').value) || 0;
        const fee = parseFloat(document.getElementById('v-cost-fee').value) || 0;
        const other = parseFloat(document.getElementById('v-cost-other').value) || 0;
        const currency = document.getElementById('v-currency').value;

        const profit = price - (fee + other);

        // Ekrana yaz
        const display = document.getElementById('v-profit-display');
        display.innerText = profit.toFixed(2) + ' ' + currency;

        // Renk değiştir (Zararsa kırmızı yap)
        if (profit < 0) display.style.color = 'red';
        else display.style.color = 'var(--green-profit)';
    },

    // KAYDETME İŞLEMİ (Henüz taslak)
    saveVisaCase: async function(event) {
        // Buraya birazdan Supabase kayıt kodunu ekleyeceğiz.
        // Şimdilik sihirbazın çalıştığını görelim.
        alert("Vize dosyası oluşturuluyor...");
    }
};

// Form submit olunca (Kaydet ve Bitir)
window.addEventListener('load', () => {
    const form = document.getElementById('form-visa-wizard');
    if (form) {
        form.onsubmit = function(e) {
            e.preventDefault(); // Sayfa yenilenmesin
            window.crm.saveVisaCase();
        };
    }
});
