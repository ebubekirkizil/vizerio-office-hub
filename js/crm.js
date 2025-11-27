// js/crm.js - CRM (Sayılar, Filtreler ve Detaylar TAM)

window.crm = {
    
    // MEVCUT VERİLERİ TUTACAK DEĞİŞKEN (Hız için)
    activeVisas: [],

    // 1. LİSTEYİ VE SAYILARI ÇEK
    loadCrmList: async function(filterStatus = 'all') {
        const tbody = document.getElementById('crm-table-body');
        if(!tbody) return;

        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#999;">Yükleniyor...</td></tr>';

        // Veriyi Çek
        const { data: list, error } = await window.supabaseClient
            .from('visas')
            .select(`*, customers (full_name, passport_no, phone)`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">Veri hatası.</td></tr>';
            return;
        }

        // Listeyi hafızaya al (Detay çekerken kullanacağız)
        this.activeVisas = list;

        // --- SAYILARI HESAPLA VE GÜNCELLE ---
        this.updateCounts(list);

        // --- FİLTRELEME MANTIĞI ---
        let filteredList = list;
        if (filterStatus !== 'all') {
            filteredList = list.filter(item => item.status === filterStatus);
        }

        // --- TABLOYU DOLDUR ---
        tbody.innerHTML = ''; 
        if (filteredList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px;">Bu kategoride dosya yok.</td></tr>';
            return;
        }

        filteredList.forEach(visa => {
            const customer = visa.customers || {};
            const countryCode = visa.country;
            let countryName = countryCode;
            if(countryCode === 'DE') countryName = "Almanya";
            if(countryCode === 'FR') countryName = "Fransa";
            if(countryCode === 'US') countryName = "ABD";
            
            const date = new Date(visa.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

            // Durum Rozeti ve Rengi Ayarla
            let badgeClass = 'status-process';
            let statusText = visa.status;

            // Durum Sözlüğü (İngilizce -> Türkçe)
            const statusMap = {
                'new': { text: 'Yeni Kayıt', class: 'status-warning' }, // Turuncu
                'docs_wait': { text: 'Evrak Bekliyor', class: 'status-warning' },
                'appointment_wait': { text: 'Randevu Bekliyor', class: 'status-danger' }, // Kırmızı
                'appointment_scheduled': { text: 'Randevusu Var', class: 'status-success' }, // Yeşil
                'consulate': { text: 'Konsoloslukta', class: 'status-process' }, // Mor
                'completed': { text: 'Sonuçlandı', class: 'badge-gray' }
            };

            if(statusMap[visa.status]) {
                badgeClass = statusMap[visa.status].class;
                statusText = statusMap[visa.status].text;
            }
            
            // Satır HTML (Tıklayınca openDrawer'a visa ID'si gönderir)
            const row = `
                <tr onclick="crm.openDrawer('${visa.id}')">
                    <td style="padding-left:25px;">
                        <div style="font-weight:600; color:#0f172a;">${customer.full_name || 'İsimsiz'}</div>
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

    // --- SAYILARI GÜNCELLEME ---
    updateCounts: function(list) {
        // Sayaçları sıfırla
        const counts = {
            all: list.length,
            new: 0,
            docs_wait: 0,
            appointment_wait: 0,
            appointment_scheduled: 0,
            consulate: 0,
            completed: 0
        };

        // Say
        list.forEach(item => {
            if (counts.hasOwnProperty(item.status)) {
                counts[item.status]++;
            }
        });

        // HTML'e Yaz
        if(document.getElementById('count-all')) document.getElementById('count-all').innerText = counts.all;
        if(document.getElementById('count-new')) document.getElementById('count-new').innerText = counts.new;
        if(document.getElementById('count-docs')) document.getElementById('count-docs').innerText = counts.docs_wait;
        if(document.getElementById('count-app-wait')) document.getElementById('count-app-wait').innerText = counts.appointment_wait;
        if(document.getElementById('count-app-ok')) document.getElementById('count-app-ok').innerText = counts.appointment_scheduled;
        if(document.getElementById('count-consulate')) document.getElementById('count-consulate').innerText = counts.consulate;
        if(document.getElementById('count-completed')) document.getElementById('count-completed').innerText = counts.completed;
    },

    // --- ÇEKMECEYİ AÇ VE BİLGİLERİ DOLDUR ---
    openDrawer: function(visaId) {
        // 1. Paneli Aç
        document.getElementById('customer-drawer').classList.add('active');
        document.getElementById('drawer-content').classList.add('active');

        // 2. Hafızadaki listeden bu vizeyi bul
        const visa = this.activeVisas.find(v => v.id === visaId);
        
        if (visa) {
            // 3. Verileri Yerleştir
            const customer = visa.customers || {};
            document.getElementById('d-name').innerText = "Müşteri Detayı";
            document.getElementById('drawer-customer-name').innerText = customer.full_name;
            document.getElementById('drawer-passport').innerText = "Pasaport: " + (customer.passport_no || '-');
            document.getElementById('drawer-phone').innerText = customer.phone || '-';
            document.getElementById('drawer-country').innerText = visa.country + " - " + visa.visa_type;
            
            // Durumu Türkçeleştirip yaz
            let statusTr = visa.status;
            // (Basit çeviri, ilerde harita kullanabiliriz)
            if(visa.status === 'new') statusTr = 'Yeni Kayıt';
            if(visa.status === 'appointment_wait') statusTr = 'Randevu Bekliyor';
            
            document.getElementById('drawer-status').innerHTML = `<span class="badge bg-blue">${statusTr}</span>`;
        }
    },

    closeDrawer: function() {
        document.getElementById('customer-drawer').classList.remove('active');
        document.getElementById('drawer-content').classList.remove('active');
    },

    filterList: function(status) {
        document.querySelectorAll('.filter-tab').forEach(el => el.classList.remove('active'));
        event.currentTarget.classList.add('active');
        this.loadCrmList(status); // Filtreli yükle
    },

    // --- SİHİRBAZ VE KAYIT (AYNEN KORUNDU) ---
    nextStep: function(stepNumber) {
        document.querySelectorAll('.wizard-page').forEach(el => el.style.display = 'none');
        document.getElementById('w-step-' + stepNumber).style.display = 'block';
        document.querySelectorAll('.w-step').forEach(el => el.classList.remove('active'));
        document.getElementById('w-step-' + stepNumber + '-indicator').classList.add('active');
    },
    prevStep: function(stepNumber) { this.nextStep(stepNumber); },
    previewPhoto: function(input) { /* ... */ },
    calculateProfit: function() { /* ... */ },

    saveVisaCase: async function() {
        // ... (Eski kayıt kodun buraya gelecek) ...
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
                await window.supabaseClient.from('transactions').insert([{ type: 'income', category: 'visa_service', description: `Vize Hizmeti - ${name} (${country})`, amount: price, currency: currency, customer_id: customerData.id, visa_id: visaData.id }]);
            }

            alert("🎉 Dosya Kaydedildi!");
            window.ui.closeModal('modal-income');
            document.getElementById('form-visa-wizard').reset();
            
            this.loadCrmList(); // Listeyi yenile (Sayılar da güncellenecek)
            if(window.accounting) window.accounting.refreshDashboard();

        } catch (error) {
            console.error(error); alert("Hata: " + error.message);
        } finally {
            submitBtn.innerText = "✅ KAYDET"; submitBtn.disabled = false;
        }
    }
};

window.addEventListener('load', () => {
    window.crm.loadCrmList();
    const form = document.getElementById('form-visa-wizard');
    if (form) form.onsubmit = function(e) { e.preventDefault(); window.crm.saveVisaCase(); };
});
