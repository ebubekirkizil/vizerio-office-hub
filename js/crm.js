// js/crm.js - Müşteri ve Vize Operasyonları (GÜNCEL)

window.crm = {
    // SİHİRBAZ İLERİ/GERİ MANTIĞI
    nextStep: function(stepNumber) {
        document.querySelectorAll('.wizard-page').forEach(el => el.style.display = 'none');
        document.getElementById('w-step-' + stepNumber).style.display = 'block';
        
        document.querySelectorAll('.w-step').forEach(el => el.classList.remove('active'));
        document.getElementById('w-step-' + stepNumber + '-indicator').classList.add('active');
    },

    prevStep: function(stepNumber) {
        this.nextStep(stepNumber);
    },

    // FOTOĞRAF ÖNİZLEME
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

    // KÂR HESAPLAMA
    calculateProfit: function() {
        const price = parseFloat(document.getElementById('v-price').value) || 0;
        const fee = parseFloat(document.getElementById('v-cost-fee').value) || 0;
        const other = parseFloat(document.getElementById('v-cost-other').value) || 0;
        const currency = document.getElementById('v-currency').value;

        const profit = price - (fee + other);
        const display = document.getElementById('v-profit-display');
        display.innerText = profit.toFixed(2) + ' ' + currency;
        
        if (profit < 0) display.style.color = 'red';
        else display.style.color = 'var(--green-profit)';
    },

    // --- KAYDETME İŞLEMİ (SUPABASE) ---
    saveVisaCase: async function() {
        console.log("💾 Kayıt işlemi başlıyor...");
        const submitBtn = document.querySelector('#form-visa-wizard button[type="submit"]');
        submitBtn.innerText = "Kaydediliyor...";
        submitBtn.disabled = true;

        try {
            // 1. Verileri Formdan Al
            const name = document.getElementById('v-name').value;
            const passport = document.getElementById('v-passport').value;
            const phone = document.getElementById('v-phone').value;
            const country = document.getElementById('v-country').value;
            const type = document.getElementById('v-type').value;
            const price = parseFloat(document.getElementById('v-price').value) || 0;
            const currency = document.getElementById('v-currency').value;
            const paymentStatus = document.getElementById('v-payment-status').value;

            // 2. Önce MÜŞTERİYİ Kaydet
            const { data: customerData, error: custError } = await window.supabaseClient
                .from('customers')
                .insert([{ full_name: name, passport_no: passport, phone: phone }])
                .select()
                .single();

            if (custError) throw custError;
            const customerId = customerData.id;
            console.log("✅ Müşteri oluştu ID:", customerId);

            // 3. Sonra VİZE DOSYASINI Kaydet
            const { data: visaData, error: visaError } = await window.supabaseClient
                .from('visas')
                .insert([{ 
                    customer_id: customerId, 
                    country: country, 
                    visa_type: type,
                    status: 'new' // Yeni kayıt
                }])
                .select()
                .single();

            if (visaError) throw visaError;

            // 4. Eğer Para Alındıysa MUHASEBEYE İşle
            if (paymentStatus === 'paid' && price > 0) {
                const { error: transError } = await window.supabaseClient
                    .from('transactions')
                    .insert([{
                        type: 'income',
                        category: 'visa_service',
                        description: `Vize Hizmeti - ${name} (${country})`,
                        amount: price,
                        currency: currency,
                        customer_id: customerId,
                        visa_id: visaData.id
                    }]);
                
                if (transError) throw transError;
                console.log("✅ Muhasebe kaydı girildi.");
            }

            // 5. Başarılı!
            alert("🎉 Dosya ve Müşteri Başarıyla Kaydedildi!");
            window.ui.closeModal('modal-income');
            document.getElementById('form-visa-wizard').reset(); // Formu temizle
            
            // Tabloları güncelle
            if(window.accounting) window.accounting.refreshDashboard(); 

        } catch (error) {
            console.error("Kayıt Hatası:", error);
            alert("Hata oluştu: " + error.message);
        } finally {
            submitBtn.innerText = "✅ KAYDET VE BİTİR";
            submitBtn.disabled = false;
        }
    }
};

// Form Submit Bağlantısı
window.addEventListener('load', () => {
    const form = document.getElementById('form-visa-wizard');
    if (form) {
        form.onsubmit = function(e) {
            e.preventDefault();
            window.crm.saveVisaCase();
        };
    }
});
