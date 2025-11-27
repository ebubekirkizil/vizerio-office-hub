// js/crm.js - Müşteri Operasyonları (GÜNCEL)

window.crm = {
    
    // --- ÇEKMECE (DRAWER) KONTROLLERİ ---
    openDrawer: function(customerId) {
        document.getElementById('customer-drawer').classList.add('active');
        document.getElementById('drawer-content').classList.add('active');
        console.log("Çekmece açıldı ID: " + customerId);
    },

    closeDrawer: function() {
        document.getElementById('customer-drawer').classList.remove('active');
        document.getElementById('drawer-content').classList.remove('active');
    },

    filterList: function(status) {
        // Görsel olarak tab'ı aktif yap
        document.querySelectorAll('.filter-tab').forEach(el => el.classList.remove('active'));
        event.currentTarget.classList.add('active');
        console.log("Filtre: " + status);
        // İlerde buraya veri çekme kodu gelecek
    },

    // --- MEVCUT SİHİRBAZ KODLARI (Aynen koruyoruz) ---
    nextStep: function(stepNumber) {
        document.querySelectorAll('.wizard-page').forEach(el => el.style.display = 'none');
        document.getElementById('w-step-' + stepNumber).style.display = 'block';
        document.querySelectorAll('.w-step').forEach(el => el.classList.remove('active'));
        document.getElementById('w-step-' + stepNumber + '-indicator').classList.add('active');
    },
    prevStep: function(stepNumber) { this.nextStep(stepNumber); },

    previewPhoto: function(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.getElementById('photo-preview');
                img.src = e.target.result;
                img.style.display = 'block';
                input.parentElement.querySelector('span').style.display = 'none';
            }
            reader.readAsDataURL(input.files[0]);
        }
    },

    calculateProfit: function() {
        const price = parseFloat(document.getElementById('v-price').value) || 0;
        const fee = parseFloat(document.getElementById('v-cost-fee').value) || 0;
        const other = parseFloat(document.getElementById('v-cost-other').value) || 0;
        const currency = document.getElementById('v-currency').value;
        const profit = price - (fee + other);
        const display = document.getElementById('v-profit-display');
        display.innerText = profit.toFixed(2) + ' ' + currency;
        display.style.color = profit < 0 ? 'red' : 'var(--green-profit)';
    },

    // KAYDETME KODUNU AYNEN KORUYORUZ (Kopyala-Yapıştır yaparken eksik kalmasın diye)
    saveVisaCase: async function() {
        console.log("💾 Kayıt işlemi...");
        // (Buradaki kayıt kodun öncekiyle aynı kalacak, yer kaplamasın diye kısalttım ama sen 
        // önceki mesajımdaki saveVisaCase kodunu buraya yapıştırabilirsin veya
        // mevcut dosyanı silmeyip sadece üstteki openDrawer fonksiyonlarını ekleyebilirsin.)
        
        // --- GÜVENLİK İÇİN TAM KODU TEKRAR VERİYORUM ---
        const submitBtn = document.querySelector('#form-visa-wizard button[type="submit"]');
        submitBtn.innerText = "Kaydediliyor..."; submitBtn.disabled = true;
        try {
            const name = document.getElementById('v-name').value;
            const passport = document.getElementById('v-passport').value;
            const phone = document.getElementById('v-phone').value;
            const country = document.getElementById('v-country').value;
            const type = document.getElementById('v-type').value;
            const price = parseFloat(document.getElementById('v-price').value) || 0;
            const currency = document.getElementById('v-currency').value;
            const paymentStatus = document.getElementById('v-payment-status').value;

            const { data: customerData, error: custError } = await window.supabaseClient.from('customers').insert([{ full_name: name, passport_no: passport, phone: phone }]).select().single();
            if (custError) throw custError;

            const { data: visaData, error: visaError } = await window.supabaseClient.from('visas').insert([{ customer_id: customerData.id, country: country, visa_type: type, status: 'new' }]).select().single();
            if (visaError) throw visaError;

            if (paymentStatus === 'paid' && price > 0) {
                await window.supabaseClient.from('transactions').insert([{ type: 'income', category: 'visa_service', description: `Vize - ${name}`, amount: price, currency: currency, customer_id: customerData.id, visa_id: visaData.id }]);
            }

            alert("🎉 Başarılı!"); window.ui.closeModal('modal-income'); document.getElementById('form-visa-wizard').reset();
            if(window.accounting) window.accounting.refreshDashboard(); 
        } catch (error) { alert("Hata: " + error.message); } 
        finally { submitBtn.innerText = "✅ KAYDET"; submitBtn.disabled = false; }
    }
};

window.addEventListener('load', () => {
    const form = document.getElementById('form-visa-wizard');
    if (form) form.onsubmit = function(e) { e.preventDefault(); window.crm.saveVisaCase(); };
});
