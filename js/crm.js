// js/crm.js - VİZE OPERASYON ve SİHİRBAZ (FİNAL)

window.crm = {
    
    currentStep: 1,

    // 1. ADIM DEĞİŞTİRME (NAVİGASYON)
    goToStep: function(targetStep) {
        // Tüm sayfaları gizle
        document.querySelectorAll('.wizard-page').forEach(el => el.style.display = 'none');
        
        // Hedef sayfayı göster
        const targetPage = document.getElementById(`step-${targetStep}`);
        if(targetPage) targetPage.style.display = 'block';
        
        // Stepper (Yuvarlaklar) Güncelleme
        // Önce hepsini temizle
        document.querySelectorAll('.wizard-step').forEach(el => {
            el.classList.remove('active', 'completed');
        });

        // Hedef adıma kadar olanları 'completed' veya 'active' yap
        for(let i=1; i<=4; i++) {
            const stepEl = document.getElementById(`ws-${i}`);
            if(i < targetStep) stepEl.classList.add('completed');
            if(i === targetStep) stepEl.classList.add('active');
        }
        
        this.currentStep = targetStep;

        // Evrak listesi boşsa ve 3. adımdaysak doldur
        if(targetStep === 3) {
            const list = document.getElementById('doc-list-container');
            if(list && list.innerHTML.trim() === '') this.updateDocList();
        }
    },

    // 2. EVRAK LİSTESİ (DİNAMİK)
    updateDocList: function() {
        const type = document.getElementById('v-type').value;
        const container = document.getElementById('doc-list-container');
        const dynamicInputs = document.getElementById('dynamic-inputs');
        
        if(!container) return;
        container.innerHTML = '';
        if(dynamicInputs) dynamicInputs.innerHTML = '';

        let docs = ['Pasaport', '2x Biyometrik Fotoğraf', 'Kimlik Fotokopisi'];

        if(type === 'commercial') {
            docs.push('Ticari Davetiye');
            docs.push('Şirket Dilekçesi');
            if(dynamicInputs) dynamicInputs.innerHTML = '<div class="form-group"><label>Davet Eden Firma</label><input class="form-control"></div>';
        } else if (type === 'seaman') {
            docs.push('Gemi Adamı Cüzdanı');
            docs.push('Kontrat');
        } else {
            docs.push('Otel & Uçak Rezervasyonu');
            docs.push('Banka Dökümü');
        }

        docs.forEach(d => {
            container.innerHTML += `
                <div class="doc-item">
                    <div class="doc-left">
                        <span class="material-icons-round doc-icon-small">description</span>
                        <span class="doc-name">${d}</span>
                    </div>
                    <button type="button" class="btn-sm" style="background:#f1f5f9; border:1px solid #e2e8f0;">Yükle</button>
                </div>`;
        });
    },

    // 3. FİNANS HESAPLAMA
    calcFinance: function() {
        const total = parseFloat(document.getElementById('v-total-price').value) || 0;
        const paid = parseFloat(document.getElementById('v-paid-now').value) || 0;
        const remain = total - paid;

        document.getElementById('disp-total').innerText = total;
        document.getElementById('disp-paid').innerText = paid;
        const remEl = document.getElementById('disp-remain');
        remEl.innerText = remain;
        remEl.style.color = remain > 0 ? '#ef4444' : '#10b981';
    },

    // 4. KAYIT
    saveVisaCase: async function(e) {
        e.preventDefault();
        alert("✅ Dosya başarıyla oluşturuldu.");
        window.ui.closeModal('modal-income');
    }
};

// Form Listener
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-visa-wizard');
    if(form) form.onsubmit = window.crm.saveVisaCase;
});
