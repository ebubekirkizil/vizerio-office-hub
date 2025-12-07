// js/crm.js - VİZE OPERASYON ve SİHİRBAZ YÖNETİMİ (V4.0)

window.crm = {
    
    currentStep: 1,

    // 1. SİHİRBAZ GEZİNİMİ
    goToStep: function(step) {
        // Tüm sayfaları gizle
        document.querySelectorAll('.wizard-page').forEach(p => p.style.display = 'none');
        document.getElementById(`step-${step}`).style.display = 'block';
        
        // Tabları güncelle
        document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
        document.getElementById(`tab-step-${step}`).classList.add('active');
        
        this.currentStep = step;
        
        // Eğer Evrak adımına geldiyse listeyi oluştur (Dolu değilse)
        if(step === 3 && document.getElementById('doc-list-container').innerHTML.trim() === "") {
            this.updateDocList();
        }
    },

    // 2. DİNAMİK EVRAK LİSTESİ
    updateDocList: function() {
        const type = document.getElementById('v-type').value;
        const container = document.getElementById('doc-list-container');
        const dynamicInputs = document.getElementById('dynamic-inputs');
        
        container.innerHTML = '';
        dynamicInputs.innerHTML = '';

        // Temel Evraklar
        let docs = ['Pasaport (Aslı)', 'Biyometrik Fotoğraf (2 Adet)', 'Kimlik Fotokopisi', 'Tam Tekmil Vukuatlı Nüfus Kayıt'];

        // Tipe Özel Evraklar & Alanlar
        if(type === 'commercial') {
            docs.push('Ticari Davetiye (Invitation)');
            docs.push('Şirket Antetli Dilekçe');
            docs.push('Vergi Levhası / Faaliyet Belgesi');
            dynamicInputs.innerHTML = `<div class="form-group"><label style="color:#2563eb;">Davet Eden Firma</label><input type="text" class="form-control" placeholder="Örn: Siemens AG"></div>`;
        }
        else if(type === 'student') {
            docs.push('Öğrenci Belgesi (E-Devlet)');
            docs.push('Okul Kabul Yazısı');
            docs.push('Sponsor Dilekçesi');
            docs.push('Sponsor Mali Evrakları');
        }
        else if(type === 'seaman') {
            docs.push('Gemi Adamı Cüzdanı');
            docs.push('Kontrat (Contract)');
            docs.push('Acenta Garanti Yazısı');
        }
        else if(type === 'family') {
            docs.push('Belediye Onaylı Davetiye');
            docs.push('Davet Edenin Kimlik/Oturum Kartı');
        }
        else { // Turistik
            docs.push('Otel Rezervasyonu');
            docs.push('Uçak Bileti Rezervasyonu');
            docs.push('İşveren İzin Yazısı');
            docs.push('Banka Hesap Dökümü (Son 3 ay)');
        }

        // Listeyi Çiz
        docs.forEach(doc => {
            this.addDocItem(doc);
        });
    },

    // Tekil Evrak Satırı Ekleme (Görsel)
    addDocItem: function(docName) {
        const container = document.getElementById('doc-list-container');
        const html = `
            <div class="doc-item">
                <div class="doc-info">
                    <div class="doc-icon"><span class="material-icons-round">description</span></div>
                    <div>
                        <div style="font-weight:600; font-size:13px;">${docName}</div>
                        <div style="font-size:11px; color:#94a3b8;">Bekleniyor...</div>
                    </div>
                </div>
                <div class="doc-actions">
                    <button type="button" class="btn-sm" style="background:#eff6ff; color:#2563eb; border:none;" onclick="alert('Dosya Seçme Penceresi Açılacak')">Yükle</button>
                    <button type="button" class="btn-sm" style="background:#fff; border:1px solid #e2e8f0; color:#64748b;" onclick="alert('Dosya Yok')">Gör</button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    },

    // Manuel Evrak Ekleme
    addManualDoc: function() {
        const name = prompt("Eklemek istediğiniz evrak adı:");
        if(name) this.addDocItem(name);
    },

    // 3. FİNANSAL HESAPLAMA (CANLI)
    calcFinance: function() {
        const total = parseFloat(document.getElementById('v-total-price').value) || 0;
        const paid = parseFloat(document.getElementById('v-paid-now').value) || 0;
        const currency = document.getElementById('v-currency').value;
        const remain = total - paid;

        document.getElementById('disp-total').innerText = total.toLocaleString() + ' ' + currency;
        document.getElementById('disp-paid').innerText = paid.toLocaleString() + ' ' + currency;
        
        const remainEl = document.getElementById('disp-remain');
        remainEl.innerText = remain.toLocaleString() + ' ' + currency;
        
        if(remain > 0) remainEl.className = 'fin-amount text-danger';
        else remainEl.className = 'fin-amount text-success'; // Borç bitti
    },

    // 4. KAYIT İŞLEMİ
    saveVisaCase: async function(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerText = "İşleniyor...";

        const name = document.getElementById('v-name').value;
        const type = document.getElementById('v-type').value;
        const paid = parseFloat(document.getElementById('v-paid-now').value) || 0;
        const total = parseFloat(document.getElementById('v-total-price').value) || 0;
        const cost = parseFloat(document.getElementById('v-est-cost').value) || 0;
        const curr = document.getElementById('v-currency').value;

        // 1. Dosya Kaydı (Sanki CRM tablosu varmış gibi)
        // Şimdilik transactions tablosuna bir "Açılış Kaydı" atalım
        
        if (paid > 0) {
            // Ödeme varsa Gelir olarak kaydet
            // MANTIK: Eğer alınan para (paid) harç giderinden (cost) azsa, bu para aslında emanettir.
            // Ama basitlik için "Vize Geliri" diyoruz, gideri sonra düşeceğiz.
            await window.supabaseClient.from('transactions').insert({
                type: 'income',
                category: 'visa_service',
                description: `Vize Dosyası - ${name} (${type}) - Peşinat`,
                amount: paid,
                currency: curr,
                created_at: new Date()
            });
        }

        // 2. Borç Kaydı? (İlerde 'debts' tablosu yapılırsa oraya yazılır)
        // Şimdilik UI'da gösterip geçiyoruz.

        alert(`✅ Dosya oluşturuldu!\n\nMüşteri: ${name}\nKalan Borç: ${total - paid} ${curr}`);
        window.ui.closeModal('modal-income');
        window.accounting.refreshDashboard();
        btn.disabled = false; btn.innerText = "✅ DOSYAYI OLUŞTUR & KAYDET";
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-visa-wizard');
    if(form) form.onsubmit = window.crm.saveVisaCase;
});
