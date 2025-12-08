// js/crm.js - VIZERIO PRO GOLDEN MASTER V9.0 (DOSYA & SİHİRBAZ)

window.crm = {
    currentStep: 1,
    currentDocs: [], // Evrak listesi

    // 1. SİHİRBAZ NAVİGASYON (ADIMLAR ARASI GEÇİŞ)
    goToStep: function(targetStep) {
        // Tüm sayfaları gizle
        document.querySelectorAll('.wizard-page').forEach(el => el.style.display = 'none');
        
        // Hedef sayfayı göster
        const targetPage = document.getElementById(`step-${targetStep}`);
        if(targetPage) targetPage.style.display = 'block';
        
        // Üst Barı (Stepper) Güncelle
        document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
        
        // Öncekileri 'completed' yap (Opsiyonel görsel)
        for(let i=1; i<=4; i++) {
            const stepEl = document.getElementById(`ws-${i}`);
            // Hedef adım aktif
            if(i === targetStep) stepEl.classList.add('active');
        }
        
        this.currentStep = targetStep;

        // Eğer Evrak adımına (3) geldiysek ve liste boşsa, varsayılanları yükle
        if(targetStep === 3 && this.currentDocs.length === 0) {
            this.updateDocList();
        }
    },

    // 2. EVRAK LİSTESİ OLUŞTURMA (VİZE TİPİNE GÖRE)
    updateDocList: function() {
        const type = document.getElementById('v-type').value;
        const dynamicInputs = document.getElementById('dynamic-inputs');
        
        // Temel Evraklar
        this.currentDocs = ['Pasaport (En az 6 ay)', '2x Biyometrik Fotoğraf', 'Kimlik Fotokopisi', 'Tam Tekmil Nüfus Kayıt'];
        
        if(dynamicInputs) dynamicInputs.innerHTML = ''; // Temizle

        // Tipe Özel Ekle
        if(type === 'commercial') {
            this.currentDocs.push('Ticari Davetiye (Invitation)');
            this.currentDocs.push('Şirket Antetli Dilekçe');
            this.currentDocs.push('Vergi Levhası / Faaliyet Belgesi');
            if(dynamicInputs) dynamicInputs.innerHTML = '<div class="form-group"><label>Davet Eden Firma</label><input type="text" class="form-control" placeholder="Örn: Siemens AG"></div>';
        } else if (type === 'student') {
            this.currentDocs.push('Öğrenci Belgesi (E-Devlet)');
            this.currentDocs.push('Okul Kabul Yazısı');
            this.currentDocs.push('Sponsor Dilekçesi');
            this.currentDocs.push('Sponsor Mali Evrakları');
        } else if (type === 'seaman') {
            this.currentDocs.push('Gemi Adamı Cüzdanı');
            this.currentDocs.push('Kontrat (Contract)');
            this.currentDocs.push('Acenta Garanti Yazısı');
        } else if (type === 'vip') {
            this.currentDocs.push('VIP Davetiye');
            this.currentDocs.push('Banka Özel Müşteri Yazısı');
        } else { // Turistik
            this.currentDocs.push('Otel Rezervasyonu');
            this.currentDocs.push('Uçak Bileti Rezervasyonu');
            this.currentDocs.push('İşveren İzin Yazısı');
            this.currentDocs.push('Banka Hesap Dökümü (Son 3 ay)');
        }

        this.renderDocs();
    },

    // 3. EVRAK LİSTESİNİ ÇİZ (PREMIUM TASARIM)
    renderDocs: function() {
        const container = document.getElementById('doc-list-container');
        if(!container) return;
        container.innerHTML = '';

        this.currentDocs.forEach((doc, index) => {
            const fileId = `file-input-${index}`;
            
            container.innerHTML += `
                <div class="doc-upload-card" id="doc-card-${index}">
                    <div class="doc-meta">
                        <div class="doc-icon-box" id="doc-icon-${index}">
                            <span class="material-icons-round">description</span>
                        </div>
                        <div>
                            <div class="file-name" id="doc-name-${index}">${doc}</div>
                            <div class="file-status" id="doc-status-${index}">Dosya Bekleniyor...</div>
                        </div>
                    </div>
                    
                    <div style="display:flex; gap:5px;">
                        <input type="file" id="${fileId}" style="display:none;" onchange="crm.handleFileSelect(this, ${index})">
                        
                        <button type="button" class="btn-sm" style="background:#fff; border:1px solid #e2e8f0; color:#334155;" onclick="document.getElementById('${fileId}').click()">YÜKLE</button>
                        
                        <button type="button" class="btn-sm" style="background:#fff; border:1px solid #e2e8f0; color:#334155;" onclick="crm.renameDoc(${index})">
                            <span class="material-icons-round" style="font-size:16px;">edit</span>
                        </button>

                        <button type="button" class="btn-sm" style="background:#fff; border:1px solid #e2e8f0; color:#ef4444;" onclick="crm.removeDoc(${index})">
                            <span class="material-icons-round" style="font-size:16px;">delete</span>
                        </button>
                    </div>
                </div>
            `;
        });
    },

    // 4. DOSYA SEÇİLİNCE (GÖRSEL DEĞİŞİM)
    handleFileSelect: function(input, index) {
        if (input.files && input.files[0]) {
            const fileName = input.files[0].name;
            
            // Kartı Yeşile Çevir
            document.getElementById(`doc-card-${index}`).classList.add('uploaded');
            
            // İkonu Check Yap
            document.getElementById(`doc-icon-${index}`).innerHTML = '<span class="material-icons-round">check_circle</span>';
            
            // Yazıyı Güncelle
            document.getElementById(`doc-status-${index}`).innerText = fileName;
            document.getElementById(`doc-status-${index}`).style.color = '#15803d'; // Koyu Yeşil
        }
    },

    // 5. MANUEL EVRAK EKLEME / SİLME / DÜZENLEME
    addManualDoc: function() {
        const name = prompt("Eklemek istediğiniz evrak adı:");
        if(name) {
            this.currentDocs.push(name);
            this.renderDocs();
        }
    },

    removeDoc: function(index) {
        if(confirm("Bu evrağı listeden çıkarmak istiyor musunuz?")) {
            this.currentDocs.splice(index, 1);
            this.renderDocs();
        }
    },

    renameDoc: function(index) {
        const newName = prompt("Evrak adını düzenle:", this.currentDocs[index]);
        if(newName) {
            this.currentDocs[index] = newName;
            this.renderDocs(); // Listeyi yenile
        }
    },

    // 6. FİNANS HESAPLAMA (CANLI)
    calcFinance: function() {
        const total = parseFloat(document.getElementById('v-total-price').value) || 0;
        const paid = parseFloat(document.getElementById('v-paid-now').value) || 0;
        const currency = document.getElementById('v-currency').value;
        
        document.getElementById('disp-total').innerText = total.toLocaleString() + ' ' + currency;
        document.getElementById('disp-paid').innerText = paid.toLocaleString() + ' ' + currency;
        
        const remain = total - paid;
        const remEl = document.getElementById('disp-remain');
        remEl.innerText = remain.toLocaleString() + ' ' + currency;
        remEl.className = remain > 0 ? 'fin-amount text-red' : 'fin-amount text-green';
    },

    // 7. KAYIT İŞLEMİ
    saveVisaCase: async function(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerText = "İşleniyor...";

        const name = document.getElementById('v-name').value;
        const paid = parseFloat(document.getElementById('v-paid-now').value) || 0;
        const curr = document.getElementById('v-currency').value;

        // A. EMANET GİDERLERİ (Harç vs.)
        const fee = parseFloat(document.getElementById('v-fee-amount').value) || 0;
        if(document.getElementById('chk-fee').checked && fee > 0) {
            await window.supabaseClient.from('transactions').insert({
                type: 'income', category: 'escrow_deposit',
                description: `Vize Harcı (Emanet) - ${name}`,
                amount: fee, currency: curr, is_escrow: true
            });
        }

        // B. ŞİRKET GİDERİ (Varsa)
        const expAmt = parseFloat(document.getElementById('v-exp-amount').value) || 0;
        if(expAmt > 0) {
            await window.supabaseClient.from('transactions').insert({
                type: 'expense', category: 'consultancy',
                description: `Dosya Masrafı - ${name}`,
                amount: expAmt, currency: curr, is_escrow: false
            });
        }

        // C. PEŞİNAT (Şirket Geliri)
        if(paid > 0) {
            await window.supabaseClient.from('transactions').insert({
                type: 'income', category: 'visa_service',
                description: `Vize Dosyası - ${name} - Peşinat`,
                amount: paid, currency: curr, is_escrow: false
            });
        }

        alert("✅ Dosya başarıyla oluşturuldu.");
        window.ui.closeModal('modal-income');
        window.accounting.refreshDashboard();
        btn.disabled = false; btn.innerText = "KAYDET";
    }
};

// Form Listener
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-visa-wizard');
    if(form) form.onsubmit = window.crm.saveVisaCase;
});
