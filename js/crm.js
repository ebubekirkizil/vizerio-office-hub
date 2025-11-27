// js/crm.js - CRM ve Vize Operasyonları (GÜNCEL ve HATASIZ)

window.crm = {
    activeVisas: [],
    selectedVisaId: null, // Seçilen dosyanın ID'sini tutar

    // --- 1. LİSTEYİ YÜKLE ---
    loadCrmList: async function(filterStatus = 'all') {
        const tbody = document.getElementById('crm-table-body');
        if(!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#999;">Yükleniyor...</td></tr>';

        const { data: list, error } = await window.supabaseClient
            .from('visas')
            .select(`*, customers (*)`)
            .order('created_at', { ascending: false });

        if (error) { console.error(error); return; }
        this.activeVisas = list;

        // Sayıları Güncelle
        this.updateCounts(list);

        // Filtrele
        let filteredList = list;
        if (filterStatus !== 'all') {
            filteredList = list.filter(item => item.status === filterStatus);
        }

        tbody.innerHTML = '';
        if (filteredList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px;">Kayıt yok.</td></tr>';
            return;
        }

        filteredList.forEach(visa => {
            const c = visa.customers || {};
            
            // Durum Renklendirme ve İsimlendirme
            let badgeClass = 'bg-blue';
            let statusText = visa.status;
            
            // Veritabanındaki 'new' kodunu 'Yeni Kayıt' yap ve rengini ayarla
            if(visa.status === 'new') { badgeClass = 'status-warning'; statusText = 'Yeni Kayıt'; }
            if(visa.status === 'docs_wait') { badgeClass = 'status-warning'; statusText = 'Evrak Bekliyor'; }
            if(visa.status === 'appointment_wait') { badgeClass = 'status-danger'; statusText = 'Randevu Bekliyor'; }
            if(visa.status === 'appointment_scheduled') { badgeClass = 'status-success'; statusText = 'Randevusu Var'; }
            if(visa.status === 'process' || visa.status === 'consulate') { badgeClass = 'status-process'; statusText = 'İşlemde'; }
            if(visa.status === 'completed') { badgeClass = 'badge-gray'; statusText = 'Biten'; }

            const row = `
                <tr onclick="crm.openDrawer('${visa.id}')">
                    <td style="padding-left:25px;"><div style="font-weight:600; color:#0f172a;">${c.full_name || 'İsimsiz'}</div></td>
                    <td><div class="program-tag"><span class="country-code">${visa.country}</span> ${visa.visa_type}</div></td>
                    <td><span class="status-badge ${badgeClass}"><span class="material-icons-round" style="font-size:14px;">circle</span> ${statusText}</span></td>
                    <td style="color:#64748b;">${new Date(visa.created_at).toLocaleDateString('tr-TR')}</td>
                    <td><button class="action-icon-btn">></button></td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    },

    // --- 2. SAYILARI GÜNCELLE ---
    updateCounts: function(list) {
        const counts = { all: list.length, new: 0, docs_wait: 0, appointment_wait: 0, appointment_scheduled: 0, process: 0, completed: 0 };
        
        list.forEach(v => {
            if(counts.hasOwnProperty(v.status)) counts[v.status]++;
            // 'consulate' durumunu 'process' (İşlemde) sayısına dahil edelim
            if(v.status === 'consulate') counts.process++; 
        });

        // HTML'e yaz (ID'ler index.html ile eşleşti)
        if(document.getElementById('count-all')) document.getElementById('count-all').innerText = counts.all;
        if(document.getElementById('count-new')) document.getElementById('count-new').innerText = counts.new;
        if(document.getElementById('count-docs')) document.getElementById('count-docs').innerText = counts.docs_wait;
        if(document.getElementById('count-app-wait')) document.getElementById('count-app-wait').innerText = counts.appointment_wait;
        if(document.getElementById('count-app-ok')) document.getElementById('count-app-ok').innerText = counts.appointment_scheduled;
        if(document.getElementById('count-process')) document.getElementById('count-process').innerText = counts.process;
        if(document.getElementById('count-completed')) document.getElementById('count-completed').innerText = counts.completed;
    },

    // --- 3. SİLME İŞLEMİ ---
    deleteVisaCase: async function() {
        if(!this.selectedVisaId) return;
        if(!confirm("⚠️ Bu dosyayı ve müşteriyi silmek istediğine emin misin?")) return;

        // Vizeyi sil (Cascade ayarlıysa müşteri de silinebilir ama şimdilik sadece vize)
        const { error } = await window.supabaseClient
            .from('visas')
            .delete()
            .eq('id', this.selectedVisaId);

        if(error) {
            alert("Silinemedi: " + error.message);
        } else {
            // Başarılı
            this.closeDrawer();
            this.loadCrmList(); // Listeyi yenile
            if(window.accounting) window.accounting.refreshDashboard(); // Finansı yenile
        }
    },

    // --- 4. ÇEKMECE İŞLEMLERİ ---
    openDrawer: function(visaId) {
        this.selectedVisaId = visaId; // ID'yi hafızaya al (Silme için lazım)
        
        document.getElementById('customer-drawer').classList.add('active');
        document.getElementById('drawer-content').classList.add('active');

        const visa = this.activeVisas.find(v => v.id === visaId);
        if(visa) {
            const c = visa.customers || {};
            document.getElementById('drawer-customer-name').innerText = c.full_name;
            document.getElementById('drawer-passport').innerText = c.passport_no || 'Pasaport Yok';
            
            // Detayları Doldur
            if(document.getElementById('d-phone')) document.getElementById('d-phone').innerText = c.phone || '-';
            if(document.getElementById('d-nationality')) document.getElementById('d-nationality').innerText = c.nationality || '-';
            if(document.getElementById('d-dob')) document.getElementById('d-dob').innerText = c.date_of_birth || '-';
            if(document.getElementById('d-birthplace')) document.getElementById('d-birthplace').innerText = c.birth_place || '-';
            if(document.getElementById('d-gender')) document.getElementById('d-gender').innerText = c.gender || '-';
            if(document.getElementById('d-marital')) document.getElementById('d-marital').innerText = c.marital_status || '-';
            
            // Durum Rozeti
            const statusTr = visa.status === 'new' ? 'Yeni Kayıt' : visa.status;
            document.getElementById('drawer-status-badge').innerHTML = `<span class="badge bg-blue">${statusTr}</span>`;
        }
    },

    closeDrawer: function() {
        document.getElementById('customer-drawer').classList.remove('active');
        document.getElementById('drawer-content').classList.remove('active');
        this.selectedVisaId = null;
    },

    filterList: function(status) {
        document.querySelectorAll('.filter-tab').forEach(el => el.classList.remove('active'));
        event.currentTarget.classList.add('active');
        this.loadCrmList(status);
    },

    switchDrawerTab: function(tabId) {
        document.querySelectorAll('.drawer-tab-content').forEach(el => el.style.display = 'none');
        document.getElementById(tabId).style.display = 'block';
        document.querySelectorAll('.d-tab').forEach(el => el.classList.remove('active'));
        event.currentTarget.classList.add('active');
    },

    // --- 5. KAYIT İŞLEMİ (SESSİZ VE HIZLI) ---
    saveVisaCase: async function() {
        const btn = document.querySelector('#form-visa-wizard button[type="submit"]');
        btn.disabled = true; btn.innerText = "Kaydediliyor...";

        try {
            const name = document.getElementById('v-name').value;
            const passport = document.getElementById('v-passport').value;
            const phone = document.getElementById('v-phone').value;
            const nationality = document.getElementById('v-nationality').value;
            const dob = document.getElementById('v-dob').value;
            const birthplace = document.getElementById('v-birthplace').value;
            const gender = document.getElementById('v-gender').value;
            const marital = document.getElementById('v-marital').value;
            
            const country = document.getElementById('v-country').value;
            const type = document.getElementById('v-type').value;
            const price = parseFloat(document.getElementById('v-price').value) || 0;
            const currency = document.getElementById('v-currency').value;
            const paymentStatus = document.getElementById('v-payment-status').value;

            // 1. Müşteri
            const { data: cust, error: err1 } = await window.supabaseClient.from('customers').insert([{ 
                full_name: name, passport_no: passport, phone: phone,
                nationality: nationality, date_of_birth: dob ? dob : null,
                birth_place: birthplace, gender: gender, marital_status: marital
            }]).select().single();
            if(err1) throw err1;

            // 2. Vize (Durum: 'new')
            const { data: visa, error: err2 } = await window.supabaseClient.from('visas').insert([{ 
                customer_id: cust.id, country: country, visa_type: type, status: 'new' 
            }]).select().single();
            if(err2) throw err2;

            // 3. Muhasebe
            if (paymentStatus === 'paid' && price > 0) {
                await window.supabaseClient.from('transactions').insert([{ 
                    type: 'income', category: 'visa_service', description: `Vize - ${name}`, 
                    amount: price, currency: currency, customer_id: cust.id, visa_id: visa.id 
                }]);
            }

            // --- BAŞARILI: PENCEREYİ KAPAT VE YENİLE ---
            window.ui.closeModal('modal-income'); // Pencereyi kapat
            document.getElementById('form-visa-wizard').reset(); // Formu temizle
            this.loadCrmList(); // Listeyi güncelle (Sayfa yenilemeden)
            if(window.accounting) window.accounting.refreshDashboard(); // Finansı güncelle

        } catch (error) {
            alert("Hata: " + error.message);
        } finally {
            btn.disabled = false; btn.innerText = "✅ KAYDET";
        }
    },

    // Helper functions for wizard (no changes needed)
    nextStep: function(n) { document.querySelectorAll('.wizard-page').forEach(e=>e.style.display='none'); document.getElementById('w-step-'+n).style.display='block'; },
    prevStep: function(n) { this.nextStep(n); },
    previewPhoto: function(i) { }, 
    calculateProfit: function() { }
};

window.addEventListener('load', () => {
    window.crm.loadCrmList();
    const f = document.getElementById('form-visa-wizard');
    if(f) f.onsubmit = (e) => { e.preventDefault(); window.crm.saveVisaCase(); };
});
