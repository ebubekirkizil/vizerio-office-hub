// js/crm.js - VIZERIO PRO (PREMIUM VİZE SİHİRBAZI V11.0)

window.crm = {
    currentStep: 1,
    currentDocs: [],

    // 1. ADIM DEĞİŞTİRME
    goToStep: function(targetStep) {
        document.querySelectorAll('.wizard-page').forEach(el => el.style.display = 'none');
        document.getElementById(`step-${targetStep}`).style.display = 'block';
        
        // Header Animasyonu
        document.querySelectorAll('.wizard-step').forEach((el, index) => {
            el.classList.remove('active', 'completed');
            if (index + 1 === targetStep) el.classList.add('active');
            if (index + 1 < targetStep) el.classList.add('completed');
        });
        
        this.currentStep = targetStep;
        if(targetStep === 3 && this.currentDocs.length === 0) this.updateDocList();
    },

    // 2. EVRAK LİSTESİ OLUŞTURMA (PREMIUM)
    updateDocList: function() {
        const type = document.getElementById('v-type').value;
        const country = document.getElementById('v-country').value;
        
        // Temel Evraklar
        this.currentDocs = ['Pasaport (En az 6 ay)', '2x Biyometrik Fotoğraf', 'Kimlik Fotokopisi', 'Tam Tekmil Nüfus Kayıt'];

        // Tipe Göre Ekle
        if(type === 'commercial') {
            this.currentDocs.push('Ticari Davetiye (Davet eden firmadan)');
            this.currentDocs.push('Şirket Dilekçesi (Antetli)');
            this.currentDocs.push('Vergi Levhası / Faaliyet Belgesi');
            this.currentDocs.push('SGK Hizmet Dökümü');
        } else if (type === 'seaman') {
            this.currentDocs.push('Gemi Adamı Cüzdanı');
            this.currentDocs.push('Kontrat (Contract)');
            this.currentDocs.push('Acenta Garanti Yazısı (Guarantee Letter)');
            this.currentDocs.push('OK to Board');
        } else if (type === 'student') {
            this.currentDocs.push('Öğrenci Belgesi');
            this.currentDocs.push('Okul Kabul Yazısı');
            this.currentDocs.push('Sponsor Dilekçesi');
        } else if (type === 'family_reunion') {
            this.currentDocs.push('Uluslararası Evlenme Kayıt Örneği (Form B)');
            this.currentDocs.push('Eşin Pasaport/Kimlik Fotokopisi');
            this.currentDocs.push('Dil Yeterlilik Belgesi');
        } else {
            this.currentDocs.push('Otel Rezervasyonu');
            this.currentDocs.push('Uçak Bileti Rezervasyonu');
            this.currentDocs.push('Banka Hesap Dökümü (Son 3 ay)');
            this.currentDocs.push('İşveren Yazısı / İzin Belgesi');
        }

        this.renderDocs();
    },

    // 3. EVRAK KARTLARINI ÇİZ
    renderDocs: function() {
        const container = document.getElementById('doc-list-container');
        if(!container) return;
        container.innerHTML = '';

        this.currentDocs.forEach((doc, index) => {
            container.innerHTML += `
                <div class="doc-card-premium" id="doc-card-${index}">
                    <div class="doc-icon-box" id="doc-icon-${index}">
                        <span class="material-icons-round">description</span>
                    </div>
                    <div class="doc-info">
                        <div class="doc-title">${doc}</div>
                        <div class="doc-status" id="doc-status-${index}">Dosya Bekleniyor</div>
                    </div>
                    <div class="doc-actions">
                        <input type="file" id="file-${index}" hidden onchange="crm.handleFileSelect(this, ${index})">
                        <div class="btn-icon-sm" onclick="document.getElementById('file-${index}').click()" title="Yükle">
                            <span class="material-icons-round" style="font-size:18px;">upload</span>
                        </div>
                        <div class="btn-icon-sm delete" onclick="crm.removeDoc(${index})" title="Listeden Çıkar">
                            <span class="material-icons-round" style="font-size:18px;">close</span>
                        </div>
                    </div>
                </div>
            `;
        });
    },

    handleFileSelect: function(input, index) {
        if (input.files[0]) {
            const card = document.getElementById(`doc-card-${index}`);
            card.classList.add('uploaded');
            document.getElementById(`doc-icon-${index}`).innerHTML = '<span class="material-icons-round">check</span>';
            document.getElementById(`doc-status-${index}`).innerText = input.files[0].name;
        }
    },

    addManualDoc: function() {
        const name = prompt("Eklemek istediğiniz evrak adı:");
        if(name) { this.currentDocs.push(name); this.renderDocs(); }
    },
    removeDoc: function(index) {
        if(confirm("Bu evrağı listeden çıkarmak istiyor musunuz?")) { this.currentDocs.splice(index, 1); this.renderDocs(); }
    },

    // 4. FİNANS HESAPLAMA (CANLI)
    calcFinance: function() {
        const total = parseFloat(document.getElementById('v-total-price').value) || 0;
        const paid = parseFloat(document.getElementById('v-paid-now').value) || 0;
        const currency = document.getElementById('v-currency').value;
        const remain = total - paid;
        
        const el = document.getElementById('disp-remain');
        el.innerText = remain.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ' + currency;
        el.style.color = remain > 0 ? '#ef4444' : '#10b981'; // Borç varsa kırmızı, yoksa yeşil
    },

    // 5. KAYIT İŞLEMİ (ÇOKLU TABLO GİBİ)
    saveVisaCase: async function(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerText = "Dosya Oluşturuluyor...";

        try {
            // Verileri Topla
            const name = document.getElementById('v-name').value;
            const surname = document.getElementById('v-surname').value;
            const passport = document.getElementById('v-passport').value;
            const country = document.getElementById('v-country').value;
            const type = document.getElementById('v-type').value;
            
            // Finans Verileri
            const totalPrice = parseFloat(document.getElementById('v-total-price').value) || 0;
            const paidNow = parseFloat(document.getElementById('v-paid-now').value) || 0;
            const costPrice = parseFloat(document.getElementById('v-cost-price').value) || 0;
            const currency = document.getElementById('v-currency').value;
            const finNote = document.getElementById('v-finance-note').value;
            
            // Dosya/Dekont Notu
            const receiptFile = document.getElementById('v-receipt-file');
            let descSuffix = "";
            if(receiptFile.files.length > 0) descSuffix = ` [Dekont: ${receiptFile.files[0].name}]`;

            // Ana Açıklama
            const mainDesc = `${name} ${surname} - ${country.toUpperCase()} (${type}) Vize Başvurusu${descSuffix}`;

            // --- 1. GELİR KAYDI (Müşteriden alınan) ---
            if (paidNow > 0) {
                await window.supabaseClient.from('transactions').insert({
                    type: 'income',
                    category: 'visa_service',
                    description: `${mainDesc} - Peşinat/Ödeme (${finNote})`,
                    amount: paidNow,
                    currency: currency,
                    is_escrow: false,
                    created_by: window.accounting.currentUserEmail,
                    user_ip: window.accounting.userIP
                });
            }

            // --- 2. GİDER KAYDI (Maliyet varsa) ---
            if (costPrice > 0) {
                await window.supabaseClient.from('transactions').insert({
                    type: 'expense',
                    category: 'service_cost',
                    description: `Maliyet: ${name} ${surname} Vize Dosyası`,
                    amount: costPrice,
                    currency: currency,
                    is_escrow: false,
                    created_by: window.accounting.currentUserEmail,
                    user_ip: window.accounting.userIP
                });
            }

            // --- 3. (OPSİYONEL) GELECEK ALACAK KAYDI ---
            // Eğer tam ödeme alınmadıysa, "Kalan Borç"u not olarak bir yere yazmak gerekir.
            // Şimdilik bunu finansal bir hareket olarak değil, sistem uyarısı olarak bırakıyoruz.
            
            alert("✅ Vize dosyası ve finansal kayıtlar başarıyla oluşturuldu.");
            window.ui.closeModal('modal-income');
            window.accounting.refreshDashboard();
            e.target.reset();
            window.crm.goToStep(1); // Başa dön

        } catch (err) {
            alert("Hata: " + err.message);
        } finally {
            btn.disabled = false; btn.innerText = "DOSYAYI OLUŞTUR";
        }
    }
};

// Listener
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-visa-wizard');
    if(form) form.onsubmit = window.crm.saveVisaCase;
});
// js/crm.js - VIZERIO PRO (PREMIUM VİZE SİHİRBAZI V11.0)

window.crm = {
    currentStep: 1,
    currentDocs: [],

    // 1. ADIM DEĞİŞTİRME
    goToStep: function(targetStep) {
        document.querySelectorAll('.wizard-page').forEach(el => el.style.display = 'none');
        document.getElementById(`step-${targetStep}`).style.display = 'block';
        
        // Header Animasyonu
        document.querySelectorAll('.wizard-step').forEach((el, index) => {
            el.classList.remove('active', 'completed');
            if (index + 1 === targetStep) el.classList.add('active');
            if (index + 1 < targetStep) el.classList.add('completed');
        });
        
        this.currentStep = targetStep;
        if(targetStep === 3 && this.currentDocs.length === 0) this.updateDocList();
    },

    // 2. EVRAK LİSTESİ OLUŞTURMA (PREMIUM)
    updateDocList: function() {
        const type = document.getElementById('v-type').value;
        const country = document.getElementById('v-country').value;
        
        // Temel Evraklar
        this.currentDocs = ['Pasaport (En az 6 ay)', '2x Biyometrik Fotoğraf', 'Kimlik Fotokopisi', 'Tam Tekmil Nüfus Kayıt'];

        // Tipe Göre Ekle
        if(type === 'commercial') {
            this.currentDocs.push('Ticari Davetiye (Davet eden firmadan)');
            this.currentDocs.push('Şirket Dilekçesi (Antetli)');
            this.currentDocs.push('Vergi Levhası / Faaliyet Belgesi');
            this.currentDocs.push('SGK Hizmet Dökümü');
        } else if (type === 'seaman') {
            this.currentDocs.push('Gemi Adamı Cüzdanı');
            this.currentDocs.push('Kontrat (Contract)');
            this.currentDocs.push('Acenta Garanti Yazısı (Guarantee Letter)');
            this.currentDocs.push('OK to Board');
        } else if (type === 'student') {
            this.currentDocs.push('Öğrenci Belgesi');
            this.currentDocs.push('Okul Kabul Yazısı');
            this.currentDocs.push('Sponsor Dilekçesi');
        } else if (type === 'family_reunion') {
            this.currentDocs.push('Uluslararası Evlenme Kayıt Örneği (Form B)');
            this.currentDocs.push('Eşin Pasaport/Kimlik Fotokopisi');
            this.currentDocs.push('Dil Yeterlilik Belgesi');
        } else {
            this.currentDocs.push('Otel Rezervasyonu');
            this.currentDocs.push('Uçak Bileti Rezervasyonu');
            this.currentDocs.push('Banka Hesap Dökümü (Son 3 ay)');
            this.currentDocs.push('İşveren Yazısı / İzin Belgesi');
        }

        this.renderDocs();
    },

    // 3. EVRAK KARTLARINI ÇİZ
    renderDocs: function() {
        const container = document.getElementById('doc-list-container');
        if(!container) return;
        container.innerHTML = '';

        this.currentDocs.forEach((doc, index) => {
            container.innerHTML += `
                <div class="doc-card-premium" id="doc-card-${index}">
                    <div class="doc-icon-box" id="doc-icon-${index}">
                        <span class="material-icons-round">description</span>
                    </div>
                    <div class="doc-info">
                        <div class="doc-title">${doc}</div>
                        <div class="doc-status" id="doc-status-${index}">Dosya Bekleniyor</div>
                    </div>
                    <div class="doc-actions">
                        <input type="file" id="file-${index}" hidden onchange="crm.handleFileSelect(this, ${index})">
                        <div class="btn-icon-sm" onclick="document.getElementById('file-${index}').click()" title="Yükle">
                            <span class="material-icons-round" style="font-size:18px;">upload</span>
                        </div>
                        <div class="btn-icon-sm delete" onclick="crm.removeDoc(${index})" title="Listeden Çıkar">
                            <span class="material-icons-round" style="font-size:18px;">close</span>
                        </div>
                    </div>
                </div>
            `;
        });
    },

    handleFileSelect: function(input, index) {
        if (input.files[0]) {
            const card = document.getElementById(`doc-card-${index}`);
            card.classList.add('uploaded');
            document.getElementById(`doc-icon-${index}`).innerHTML = '<span class="material-icons-round">check</span>';
            document.getElementById(`doc-status-${index}`).innerText = input.files[0].name;
        }
    },

    addManualDoc: function() {
        const name = prompt("Eklemek istediğiniz evrak adı:");
        if(name) { this.currentDocs.push(name); this.renderDocs(); }
    },
    removeDoc: function(index) {
        if(confirm("Bu evrağı listeden çıkarmak istiyor musunuz?")) { this.currentDocs.splice(index, 1); this.renderDocs(); }
    },

    // 4. FİNANS HESAPLAMA (CANLI)
    calcFinance: function() {
        const total = parseFloat(document.getElementById('v-total-price').value) || 0;
        const paid = parseFloat(document.getElementById('v-paid-now').value) || 0;
        const currency = document.getElementById('v-currency').value;
        const remain = total - paid;
        
        const el = document.getElementById('disp-remain');
        el.innerText = remain.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ' + currency;
        el.style.color = remain > 0 ? '#ef4444' : '#10b981'; // Borç varsa kırmızı, yoksa yeşil
    },

    // 5. KAYIT İŞLEMİ (ÇOKLU TABLO GİBİ)
    saveVisaCase: async function(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerText = "Dosya Oluşturuluyor...";

        try {
            // Verileri Topla
            const name = document.getElementById('v-name').value;
            const surname = document.getElementById('v-surname').value;
            const passport = document.getElementById('v-passport').value;
            const country = document.getElementById('v-country').value;
            const type = document.getElementById('v-type').value;
            
            // Finans Verileri
            const totalPrice = parseFloat(document.getElementById('v-total-price').value) || 0;
            const paidNow = parseFloat(document.getElementById('v-paid-now').value) || 0;
            const costPrice = parseFloat(document.getElementById('v-cost-price').value) || 0;
            const currency = document.getElementById('v-currency').value;
            const finNote = document.getElementById('v-finance-note').value;
            
            // Dosya/Dekont Notu
            const receiptFile = document.getElementById('v-receipt-file');
            let descSuffix = "";
            if(receiptFile.files.length > 0) descSuffix = ` [Dekont: ${receiptFile.files[0].name}]`;

            // Ana Açıklama
            const mainDesc = `${name} ${surname} - ${country.toUpperCase()} (${type}) Vize Başvurusu${descSuffix}`;

            // --- 1. GELİR KAYDI (Müşteriden alınan) ---
            if (paidNow > 0) {
                await window.supabaseClient.from('transactions').insert({
                    type: 'income',
                    category: 'visa_service',
                    description: `${mainDesc} - Peşinat/Ödeme (${finNote})`,
                    amount: paidNow,
                    currency: currency,
                    is_escrow: false,
                    created_by: window.accounting.currentUserEmail,
                    user_ip: window.accounting.userIP
                });
            }

            // --- 2. GİDER KAYDI (Maliyet varsa) ---
            if (costPrice > 0) {
                await window.supabaseClient.from('transactions').insert({
                    type: 'expense',
                    category: 'service_cost',
                    description: `Maliyet: ${name} ${surname} Vize Dosyası`,
                    amount: costPrice,
                    currency: currency,
                    is_escrow: false,
                    created_by: window.accounting.currentUserEmail,
                    user_ip: window.accounting.userIP
                });
            }

            // --- 3. (OPSİYONEL) GELECEK ALACAK KAYDI ---
            // Eğer tam ödeme alınmadıysa, "Kalan Borç"u not olarak bir yere yazmak gerekir.
            // Şimdilik bunu finansal bir hareket olarak değil, sistem uyarısı olarak bırakıyoruz.
            
            alert("✅ Vize dosyası ve finansal kayıtlar başarıyla oluşturuldu.");
            window.ui.closeModal('modal-income');
            window.accounting.refreshDashboard();
            e.target.reset();
            window.crm.goToStep(1); // Başa dön

        } catch (err) {
            alert("Hata: " + err.message);
        } finally {
            btn.disabled = false; btn.innerText = "DOSYAYI OLUŞTUR";
        }
    }
};

// Listener
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-visa-wizard');
    if(form) form.onsubmit = window.crm.saveVisaCase;
});
