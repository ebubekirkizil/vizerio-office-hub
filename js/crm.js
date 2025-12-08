// js/crm.js - V7.5 (EVRAK YÖNETİMİ FİX)

window.crm = {
    currentStep: 1,
    currentDocs: [],

    // ... Sihirbaz Navigasyon (Aynı) ...
    goToStep: function(s) { 
        document.querySelectorAll('.wizard-page').forEach(el=>el.style.display='none'); document.getElementById('step-'+s).style.display='block'; 
        document.querySelectorAll('.wizard-step').forEach(el=>el.classList.remove('active','completed'));
        for(let i=1; i<=4; i++) { if(i<s) document.getElementById('ws-'+i).classList.add('completed'); if(i===s) document.getElementById('ws-'+i).classList.add('active'); }
        this.currentStep = s;
        if(s===3 && this.currentDocs.length===0) this.updateDocList();
    },

    // ... Evrak Listesi Oluşturma (Aynı) ...
    updateDocList: function() {
        const type = document.getElementById('v-type').value;
        this.currentDocs = ['Pasaport', 'Biyometrik Fotoğraf', 'Kimlik Fotokopisi'];
        if(type==='commercial') this.currentDocs.push('Ticari Davetiye', 'Şirket Dilekçesi');
        // ... Diğer tipler ...
        this.renderDocs();
    },

    // EVRAK ÇİZİMİ (DÜZENLEME BUTONLARI EKLENDİ)
    renderDocs: function() {
        const container = document.getElementById('doc-list-container');
        container.innerHTML = '';

        this.currentDocs.forEach((doc, index) => {
            const fileId = `file-input-${index}`;
            
            container.innerHTML += `
                <div class="doc-upload-card" id="doc-card-${index}">
                    <div class="doc-meta">
                        <div class="doc-icon-box" id="doc-icon-${index}"><span class="material-icons-round">description</span></div>
                        <div>
                            <div class="file-name" id="doc-name-${index}">${doc}</div>
                            <div class="file-status" id="doc-status-${index}">Dosya Bekleniyor</div>
                        </div>
                    </div>
                    <div class="doc-tools">
                        <input type="file" id="${fileId}" style="display:none;" onchange="crm.handleFileSelect(this, ${index})">
                        <div class="tool-btn" onclick="document.getElementById('${fileId}').click()" title="Yükle"><span class="material-icons-round" style="font-size:18px;">upload_file</span></div>
                        
                        <div class="tool-btn" onclick="crm.renameDoc(${index})" title="Adı Değiştir"><span class="material-icons-round" style="font-size:18px;">edit</span></div>
                        
                        <div class="tool-btn del" onclick="crm.removeDoc(${index})" title="Listeden Çıkar"><span class="material-icons-round" style="font-size:18px;">delete</span></div>
                    </div>
                </div>`;
        });
    },

    // FONKSİYONLAR
    handleFileSelect: function(input, index) {
        if(input.files[0]) {
            document.getElementById(`doc-card-${index}`).classList.add('uploaded');
            document.getElementById(`doc-status-${index}`).innerText = input.files[0].name;
            document.getElementById(`doc-status-${index}`).style.color = '#15803d';
            document.getElementById(`doc-icon-${index}`).innerHTML = '<span class="material-icons-round">check_circle</span>';
            document.getElementById(`doc-icon-${index}`).style.background = '#15803d';
            document.getElementById(`doc-icon-${index}`).style.color = 'white';
        }
    },

    addManualDoc: function() {
        const name = prompt("Evrak Adı:");
        if(name) { this.currentDocs.push(name); this.renderDocs(); }
    },

    removeDoc: function(index) {
        if(confirm("Bu evrağı listeden silmek istiyor musunuz?")) {
            this.currentDocs.splice(index, 1);
            this.renderDocs();
        }
    },

    renameDoc: function(index) {
        const newName = prompt("Yeni evrak adı:", this.currentDocs[index]);
        if(newName) {
            this.currentDocs[index] = newName;
            this.renderDocs();
        }
    },

    // ... Finans Hesaplama ve Kayıt (Aynı) ...
    calcFinance: function() { /* ... */ },
    saveVisaCase: async function(e) { /* ... */ }
};

document.addEventListener('load', () => { /* ... */ });
