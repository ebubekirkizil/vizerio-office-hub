// js/crm.js - CRM ve Vize Operasyonları (FULL)

window.crm = {
    
    // --- 1. LİSTEYİ SUPABASE'DEN ÇEK ---
    loadCrmList: async function(filterStatus = 'all') {
        const tbody = document.getElementById('crm-table-body');
        if(!tbody) return;

        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#999;">Yükleniyor...</td></tr>';

        // Müşteri ve Vize bilgilerini birleştirerek çek
        const { data: list, error } = await window.supabaseClient
            .from('visas')
            .select(`
                *,
                customers (full_name, passport_no)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Hata:", error);
            tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">Veri çekilemedi.</td></tr>';
            return;
        }

        tbody.innerHTML = ''; // Temizle

        if (!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px;">Henüz kayıt yok.</td></tr>';
            return;
        }

        list.forEach(visa => {
            const customerName = visa.customers ? visa.customers.full_name : 'Bilinmeyen';
            const countryCode = visa.country;
            let countryName = countryCode;
            if(countryCode === 'DE') countryName = "Almanya";
            if(countryCode === 'FR') countryName = "Fransa";
            if(countryCode === 'US') countryName = "ABD";
            
            const date = new Date(visa.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

            // Durum Rengi
            let badgeClass = 'status-process';
            let statusText = 'İşlemde';
            if(visa.status === 'new') { badgeClass = 'status-warning'; statusText = 'Yeni Kayıt'; }
            
            const row = `
                <tr onclick="crm.openDrawer('${visa.customer_id}')">
                    <td style="padding-left:25px;">
                        <div style="font-weight:600; color:#0f172a;">${customerName}</div>
                    </td>
                    <td>
                        <div class="program-tag">
                            <span class="country-code">${countryCode}</span> ${countryName} - ${visa.visa_type}
                        </div>
                    </td>
                    <td>
                        <span class="status-badge ${badgeClass}">
                            <span class="material-icons-round" style="font-size:14px;">circle</span> ${statusText}
                        </span>
                    </td>
                    <td style="color:#64748b; font-size:13px;">${date}</td>
                    <td style="text-align:right; padding-right:25px;">
                        <button class="action-icon-btn"><span class="material-icons-round">chevron_right</span></button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    },

    // --- 2. ÇEKMECE İŞLEMLERİ ---
    openDrawer: function(customerId) {
        document.getElementById('customer-drawer').classList.add('active');
        document.getElementById('drawer-content').classList.add('active');
        console.log("Müşteri ID:", customerId);
        // İlerde buraya müşteri detaylarını çekme kodu gelecek
    },

    closeDrawer: function() {
        document.getElementById('customer-drawer').classList.remove('active');
        document.getElementById('drawer-content').classList.remove('active');
    },

    filterList: function(status) {
        document.querySelectorAll('.filter-tab').forEach(el => el.classList.remove('active'));
        event.currentTarget.classList.add('active');
        this.loadCrmList(status); // Yeniden yükle
    },

    // --- 3. SİHİRBAZ İLERİ/GERİ ---
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

    // --- 4. KAYDETME İŞLEMİ (ENTEGRASYONLU) ---
    saveVisaCase: async function() {
        console.log("💾 Kayıt Başladı...");
        const submitBtn = document.querySelector('#form-visa-wizard button[type="submit"]');
        submitBtn.innerText = "Kaydediliyor..."; 
        submitBtn.disabled = true;

        try {
            // 1. Verileri Al
            const name = document.getElementById('v-name').value;
            const passport = document.getElementById('v-passport').value;
            const phone = document.getElementById('v-phone').value;
            const country = document.getElementById('v-country').value;
            const type = document.getElementById('v-type').value;
            const price = parseFloat(document.getElementById('v-price').value) || 0;
            const currency = document.getElementById('v-currency').value;
            const paymentStatus = document.getElementById('v-payment-status').value;

            // 2. Müşteri Oluştur
            const { data: customerData, error: custError } = await window.supabaseClient
                .from('customers')
                .insert([{ full_name: name, passport_no: passport, phone: phone }])
                .select().single();
            
            if (custError) throw custError;

            // 3. Vize Dosyası Oluştur
            const { data: visaData, error: visaError } = await window.supabaseClient
                .from('visas')
                .insert([{ customer_id: customerData.id, country: country, visa_type: type, status: 'new' }])
                .select().single();

            if (visaError) throw visaError;

            // 4. (Eğer Peşinse) Muhasebeye İşle
            if (paymentStatus === 'paid' && price > 0) {
                const { error: transError } = await window.supabaseClient
                    .from('transactions')
                    .insert([{
                        type: 'income',
                        category: 'visa_service',
                        description: `Vize Hizmeti - ${name} (${country})`,
                        amount: price,
                        currency: currency,
                        customer_id: customerData.id,
                        visa_id: visaData.id
                    }]);
                if (transError) throw transError;
            }

            // 5. Başarılı
            alert("🎉 Dosya Kaydedildi!");
            window.ui.closeModal('modal-income');
            document.getElementById('form-visa-wizard').reset();
            
            // Tüm listeleri yenile
            this.loadCrmList(); 
            if(window.accounting) window.accounting.refreshDashboard();

        } catch (error) {
            console.error(error);
            alert("Hata: " + error.message);
        } finally {
            submitBtn.innerText = "✅ KAYDET VE BİTİR";
            submitBtn.disabled = false;
        }
    }
};

// Sayfa Yüklenince Listeyi Getir
window.addEventListener('load', () => {
    window.crm.loadCrmList();
    const form = document.getElementById('form-visa-wizard');
    if (form) form.onsubmit = function(e) { e.preventDefault(); window.crm.saveVisaCase(); };
});
