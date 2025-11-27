// js/crm.js - GÜNCEL KAYIT VE DETAY

window.crm = {
    activeVisas: [],

    // LİSTEYİ YÜKLE
    loadCrmList: async function(filterStatus = 'all') {
        const tbody = document.getElementById('crm-table-body');
        if(!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#999;">Yükleniyor...</td></tr>';

        // Tüm detayları çekiyoruz
        const { data: list, error } = await window.supabaseClient
            .from('visas')
            .select(`*, customers (*)`) // customers(*) demek müşterinin tüm sütunlarını çek demek
            .order('created_at', { ascending: false });

        if (error) { console.error(error); return; }
        this.activeVisas = list; // Hafızaya al

        // ... (Sayma ve Filtreleme mantığı aynı kalacak - yer kaplamasın diye kısalttım, önceki kodla aynı) ...
        // Sadece tabloyu doldurma kısmı:
        tbody.innerHTML = '';
        list.forEach(visa => {
            const c = visa.customers || {};
            const row = `
                <tr onclick="crm.openDrawer('${visa.id}')">
                    <td style="padding-left:25px;"><div style="font-weight:600; color:#0f172a;">${c.full_name}</div></td>
                    <td><div class="program-tag"><span class="country-code">${visa.country}</span> ${visa.visa_type}</div></td>
                    <td><span class="status-badge status-process">${visa.status}</span></td>
                    <td style="color:#64748b;">${new Date(visa.created_at).toLocaleDateString('tr-TR')}</td>
                    <td><button class="action-icon-btn">></button></td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    },

    // YENİ KAYIT (Detaylı)
    saveVisaCase: async function() {
        const btn = document.querySelector('#form-visa-wizard button[type="submit"]');
        btn.disabled = true; btn.innerText = "Kaydediliyor...";

        try {
            // Form verilerini al
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

            // 1. Müşteriyi Detaylı Kaydet
            const { data: cust, error: err1 } = await window.supabaseClient
                .from('customers')
                .insert([{ 
                    full_name: name, passport_no: passport, phone: phone,
                    nationality: nationality, date_of_birth: dob ? dob : null,
                    birth_place: birthplace, gender: gender, marital_status: marital
                }])
                .select().single();
            if(err1) throw err1;

            // 2. Vizeyi Kaydet
            const { error: err2 } = await window.supabaseClient
                .from('visas')
                .insert([{ customer_id: cust.id, country: country, visa_type: type, status: 'new' }]);
            if(err2) throw err2;

            alert("✅ Kayıt Tamam!");
            window.ui.closeModal('modal-income');
            this.loadCrmList();

        } catch (error) { alert("Hata: " + error.message); }
        finally { btn.disabled = false; btn.innerText = "✅ KAYDET"; }
    },

    // ÇEKMECE DETAYLARI
    openDrawer: function(visaId) {
        document.getElementById('customer-drawer').classList.add('active');
        document.getElementById('drawer-content').classList.add('active');

        const visa = this.activeVisas.find(v => v.id === visaId);
        if(visa) {
            const c = visa.customers;
            // Başlık
            document.getElementById('d-name').innerText = "Dosya Detayı";
            document.getElementById('drawer-customer-name').innerText = c.full_name;
            document.getElementById('drawer-passport').innerText = c.passport_no;
            
            // Kimlik Sekmesi Doldur
            document.getElementById('d-phone').innerText = c.phone || '-';
            document.getElementById('d-nationality').innerText = c.nationality || '-';
            document.getElementById('d-dob').innerText = c.date_of_birth || '-';
            document.getElementById('d-birthplace').innerText = c.birth_place || '-';
            document.getElementById('d-gender').innerText = c.gender || '-';
            document.getElementById('d-marital').innerText = c.marital_status || '-';
        }
    },

    closeDrawer: function() {
        document.getElementById('customer-drawer').classList.remove('active');
        document.getElementById('drawer-content').classList.remove('active');
    },

    // SEKME DEĞİŞTİRME (Çekmece İçin)
    switchDrawerTab: function(tabId) {
        document.querySelectorAll('.drawer-tab-content').forEach(el => el.style.display = 'none');
        document.getElementById(tabId).style.display = 'block';
        
        document.querySelectorAll('.d-tab').forEach(el => el.classList.remove('active'));
        event.currentTarget.classList.add('active');
    },

    // ... (nextStep, prevStep vb. sihirbaz fonksiyonları buraya eklenecek, önceki koddakiyle aynı) ...
    // Hepsini sığdırmak için burayı kısa tuttum ama sen eski koddaki nextStep, prevStep fonksiyonlarını buraya eklemelisin.
    nextStep: function(n) { document.querySelectorAll('.wizard-page').forEach(e=>e.style.display='none'); document.getElementById('w-step-'+n).style.display='block'; },
    prevStep: function(n) { this.nextStep(n); }
};

window.addEventListener('load', () => {
    window.crm.loadCrmList();
    const f = document.getElementById('form-visa-wizard');
    if(f) f.onsubmit = (e) => { e.preventDefault(); window.crm.saveVisaCase(); };
});
