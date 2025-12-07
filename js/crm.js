// js/crm.js - VİZE OPERASYON (V5.1 - DINAMIK EVRAK YÖNETİMİ)

window.crm = {
    currentStep: 1,
    currentDocs: [], // Evrak listesini hafızada tutuyoruz

    // 1. ADIM GEÇİŞLERİ
    goToStep: function(targetStep) {
        document.querySelectorAll('.wizard-page').forEach(el => el.style.display = 'none');
        document.getElementById(`step-${targetStep}`).style.display = 'block';
        
        document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
        // Öncekileri completed yap (Görsel)
        for(let i=1; i<targetStep; i++) document.getElementById(`ws-${i}`).classList.add('completed');
        document.getElementById(`ws-${targetStep}`).classList.add('active');
        
        this.currentStep = targetStep;

        // Evrak listesi boşsa ve 3. adımdaysak varsayılanları yükle
        if(targetStep === 3 && this.currentDocs.length === 0) this.initDocList();
    },

    // 2. EVRAK YÖNETİMİ (INIT)
    initDocList: function() {
        const type = document.getElementById('v-type').value;
        this.currentDocs = ['Pasaport', '2x Biyometrik Fotoğraf', 'Kimlik Fotokopisi'];

        if(type === 'commercial') {
            this.currentDocs.push('Ticari Davetiye', 'Şirket Dilekçesi', 'Vergi Levhası');
        } else if (type === 'student') {
            this.currentDocs.push('Öğrenci Belgesi', 'Okul Kabul Yazısı', 'Sponsor Evrakları');
        } else if (type === 'seaman') {
            this.currentDocs.push('Gemi Adamı Cüzdanı', 'Kontrat', 'Acenta Garantisi');
        } else if (type === 'vip') {
            this.currentDocs.push('VIP Davetiye', 'Banka Özel Müşteri Yazısı');
        } else { // Turistik
            this.currentDocs.push('Otel Rezervasyonu', 'Uçak Rezervasyonu', 'Banka Dökümü');
        }
        this.renderDocs();
    },

    // EVRAK LİSTESİNİ ÇİZ
    renderDocs: function() {
        const container = document.getElementById('doc-list-container');
        container.innerHTML = '';

        this.currentDocs.forEach((doc, index) => {
            container.innerHTML += `
                <div class="doc-item">
                    <div class="doc-left">
                        <span class="material-icons-round doc-icon-small">description</span>
                        <span class="doc-name">${doc}</span>
                    </div>
                    <div class="doc-actions">
                        <button type="button" class="btn-icon" onclick="crm.renameDoc(${index})" title="Düzenle"><span class="material-icons-round" style="font-size:16px;">edit</span></button>
                        <button type="button" class="btn-icon delete" onclick="crm.removeDoc(${index})" title="Sil"><span class="material-icons-round" style="font-size:16px;">delete</span></button>
                        <button type="button" class="btn-sm" style="background:#f1f5f9; border:1px solid #e2e8f0;">Yükle</button>
                    </div>
                </div>`;
        });
    },

    // EKLE / SİL / DÜZENLE
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
            this.renderDocs();
        }
    },

    // 3. FİNANS HESAPLAMA
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

    // 4. KAYIT
    saveVisaCase: async function(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerText = "Kaydediliyor...";

        // Verileri Topla
        const name = document.getElementById('v-name').value;
        const paid = parseFloat(document.getElementById('v-paid-now').value) || 0;
        const curr = document.getElementById('v-currency').value;
        
        // Harç (Emanet) Kontrolü
        const feeAmount = parseFloat(document.getElementById('v-fee-amount').value) || 0;
        if(document.getElementById('chk-fee').checked && feeAmount > 0) {
            // Harç parasını Emanet olarak kaydet (Veritabanına)
            await window.supabaseClient.from('transactions').insert({
                type: 'income', category: 'escrow_deposit',
                description: `Vize Harcı (Emanet) - ${name}`,
                amount: feeAmount, currency: curr, is_escrow: true
            });
        }

        // Ana Ödeme Kaydı
        if(paid > 0) {
            await window.supabaseClient.from('transactions').insert({
                type: 'income', category: 'visa_service',
                description: `Vize Dosyası - ${name} - Peşinat`,
                amount: paid, currency: curr, is_escrow: false
            });
        }

        alert("✅ Dosya oluşturuldu ve finansal kayıtlar işlendi.");
        window.ui.closeModal('modal-income');
        window.accounting.refreshDashboard();
        btn.disabled = false; btn.innerText = "DOSYAYI OLUŞTUR";
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-visa-wizard');
    if(form) form.onsubmit = window.crm.saveVisaCase;
});
