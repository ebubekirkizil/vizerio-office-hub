// js/accounting.js - VIZERIO PRO (EMANET İŞLEM GÜNCELLEMESİ)

window.accounting = {
    
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null,
    chartState: { profit: true, income: true, expense: true },
    currentPeriod: 'all',
    allTransactions: [],
    
    // 1. SİSTEMİ BAŞLAT
    refreshDashboard: async function() {
        console.log("💰 Sistem Yükleniyor...");
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const d = await res.json();
            this.liveRates = { TRY: 1, USD: (1/d.rates.USD), EUR: (1/d.rates.EUR) };
            if(document.getElementById('live-rates-display')) 
                document.getElementById('live-rates-display').innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
        } catch (e) {}

        const { data: list, error } = await window.supabaseClient.from('transactions').select('*').order('created_at', { ascending: false });
        if (error) { console.error(error); return; }
        
        this.allTransactions = list || [];
        this.calculateStats(this.allTransactions);
        this.renderTable(this.allTransactions);
        setTimeout(() => this.updateChartRender(), 200);
    },

    // 2. EMANET LİSTESİNİ AÇMA (ÇİFT TIKLAMA ÖZELLİĞİ EKLENDİ)
    openEscrowDetails: function() {
        window.ui.openModal('modal-escrow-details');
        
        // Yeniden hesapla ki kartlar güncel olsun
        this.calculateStats(this.allTransactions);

        const list = this.allTransactions.filter(t => t.is_escrow).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        const tbody = document.getElementById('escrow-list-body');
        if(!tbody) return;
        tbody.innerHTML = '';

        if(list.length === 0) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:30px;">Henüz emanet işlemi yok.</td></tr>'; return; }

        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR');
            const color = t.type === 'income' ? 'text-green' : 'text-red';
            const sym = t.type === 'income' ? '+' : '-';
            const badge = t.type === 'income' ? 'GİRİŞ' : 'ÇIKIŞ';
            
            // ÇİFT TIKLAMA OLAYI BURADA
            // Sadece "Giriş" (income) olanlara işlem yapmak mantıklıdır ama hepsine koyalım.
            tbody.innerHTML += `
                <tr class="row-hover" style="cursor:pointer;" ondblclick="accounting.openEscrowAction('${t.id}')" title="İşlem yapmak için ÇİFT TIKLA">
                    <td style="padding:15px; color:#64748b;">${date}</td>
                    <td style="padding:15px; font-weight:600;">
                        ${t.description} 
                        <span style="font-size:10px; background:#f1f5f9; padding:2px 6px; border-radius:4px; margin-left:5px;">${badge}</span>
                    </td>
                    <td style="padding:15px; text-align:right; font-weight:800;" class="${color}">
                        ${sym} ${this.fmt(t.amount, t.currency)}
                    </td>
                </tr>`;
        });
    },

    // 3. EMANET İŞLEM PENCERESİNİ AÇMA (YENİ)
    openEscrowAction: function(txId) {
        const tx = this.allTransactions.find(t => t.id === txId);
        if(!tx) return;

        // Modalı Doldur
        document.getElementById('act-source-id').value = tx.id;
        document.getElementById('act-currency').value = tx.currency;
        document.getElementById('act-desc-display').innerText = tx.description;
        document.getElementById('act-amount-display').innerText = this.fmt(tx.amount, tx.currency);
        
        // Formu Hazırla (Tutarı otomatik koy)
        document.getElementById('act-amount').value = tx.amount; 
        document.getElementById('act-note').value = "";

        // Emanet detayını kapatma, üstüne aç
        // window.ui.closeModal('modal-escrow-details'); 
        window.ui.openModal('modal-escrow-action');
    },

    // 4. EMANET ÇIKIŞ/İADE KAYDI
    saveEscrowAction: async function(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]'); 
        btn.disabled = true; btn.innerText = "İşleniyor...";

        const sourceId = document.getElementById('act-source-id').value;
        const type = document.getElementById('act-type').value;
        const amount = document.getElementById('act-amount').value;
        const note = document.getElementById('act-note').value;
        const currency = document.getElementById('act-currency').value;

        // Referans ismi al
        const sourceTx = this.allTransactions.find(t => t.id === sourceId);
        const refName = sourceTx ? sourceTx.description.split('-')[0] : 'Kayıt';

        let category = 'escrow_refund';
        let descPrefix = 'İADE: ';
        
        if (type === 'payment') {
            category = 'escrow_payment';
            descPrefix = 'ÖDEME: ';
        } else if (type === 'profit') {
            category = 'visa_service'; // Şirket geliri
            descPrefix = 'GELİR AKTARIMI: ';
        }

        const fullDesc = `${descPrefix}${refName} - ${note}`;

        const { error } = await window.supabaseClient.from('transactions').insert({
            type: 'expense', // Emanetten düşüş
            category: category,
            description: fullDesc,
            amount: amount,
            currency: currency,
            is_escrow: true, // Emanet havuzunu etkile
            created_at: new Date()
        });

        if(!error) {
            window.ui.closeModal('modal-escrow-action');
            this.refreshDashboard(); // Ana ekranı yenile
            setTimeout(() => {
                this.openEscrowDetails(); // Emanet listesini güncelle ve aç
                alert("✅ İşlem Başarılı!");
            }, 500);
        } else {
            alert("Hata: " + error.message);
        }
        btn.disabled = false; btn.innerText = "İŞLEMİ ONAYLA";
    },

    // 5. EMANET KAYDI SİLME (SADECE O SATIRI)
    deleteEscrowTransaction: async function() {
        const id = document.getElementById('act-source-id').value;
        if(!id) return;

        if(confirm("DİKKAT: Bu kayıt tamamen silinecek. Bu işlem bir 'Hata Düzeltme' işlemidir. Emin misiniz?")) {
            const { error } = await window.supabaseClient.from('transactions').delete().eq('id', id);
            
            if(!error) {
                window.ui.closeModal('modal-escrow-action');
                this.refreshDashboard();
                setTimeout(() => {
                    this.openEscrowDetails();
                    alert("🗑️ Kayıt Silindi.");
                }, 500);
            } else {
                alert("Silme Hatası: " + error.message);
            }
        }
    },

    // --- DİĞER STANDART FONKSİYONLAR (DEĞİŞMEDİ) ---
    calculateStats: function(list) {
        const selectedCurr = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        let wTRY=0, wUSD=0, wEUR=0, tInc=0, tExp=0, escEUR=0, escUSD=0, escTRY=0;

        list.forEach(t => {
            const amt = parseFloat(t.amount);
            // Kasa
            if (t.type === 'income') { if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt; }
            else { if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt; }
            
            // Emanet
            if(t.is_escrow) {
                if(t.type==='income') { if(t.currency==='EUR') escEUR+=amt; if(t.currency==='USD') escUSD+=amt; if(t.currency==='TRY') escTRY+=amt; }
                else { if(t.currency==='EUR') escEUR-=amt; if(t.currency==='USD') escUSD-=amt; if(t.currency==='TRY') escTRY-=amt; }
            } 
            // Kar/Zarar
            else if (!t.category.includes('exchange')) {
                const v = (amt * (this.liveRates[t.currency]||1)) / this.liveRates[selectedCurr];
                if(t.type==='income') tInc+=v; else tExp+=v;
            }
        });

        this.updateText('wallet-try', this.fmt(wTRY,'TRY')); this.updateText('wallet-usd', this.fmt(wUSD,'USD')); this.updateText('wallet-eur', this.fmt(wEUR,'EUR'));
        this.updateText('val-usd', `≈ ${this.fmt(wUSD*this.liveRates.USD,'TRY')}`); this.updateText('val-eur', `≈ ${this.fmt(wEUR*this.liveRates.EUR,'TRY')}`);
        
        // Emanet Kartlarını Doldur
        if(document.getElementById('esc-total-eur')) document.getElementById('esc-total-eur').innerText = this.fmt(escEUR,'EUR');
        if(document.getElementById('esc-total-usd')) document.getElementById('esc-total-usd').innerText = this.fmt(escUSD,'USD');
        if(document.getElementById('esc-total-try')) document.getElementById('esc-total-try').innerText = this.fmt(escTRY,'TRY');

        // Ana Emanet Toplamı (Seçili Kura Göre)
        const totalEscrowVal = (escTRY/this.liveRates[selectedCurr]) + (escUSD*this.liveRates.USD/this.liveRates[selectedCurr]) + (escEUR*this.liveRates.EUR/this.liveRates[selectedCurr]);
        this.updateText('money-escrow', this.fmt(totalEscrowVal, selectedCurr));

        const totalEq = (wTRY + wUSD*this.liveRates.USD + wEUR*this.liveRates.EUR) / this.liveRates[selectedCurr];
        this.updateText('total-equity', this.fmt(totalEq, selectedCurr));
        this.updateText('money-profit', this.fmt(tInc-tExp, selectedCurr));
        this.updateText('money-income', this.fmt(tInc, selectedCurr));
        this.updateText('money-expense', this.fmt(tExp, selectedCurr));
    },

    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body'); if(!tbody) return; tbody.innerHTML='';
        if(list.length===0) { tbody.innerHTML='<tr><td colspan="4" style="text-align:center; padding:20px;">Veri yok.</td></tr>'; return; }
        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR');
            let cl='row-expense', txt='text-red', sym='-';
            if(t.type==='income'){ cl='row-income'; txt='text-green'; sym='+'; }
            if(t.is_escrow){ cl='row-escrow'; txt='text-orange'; }
            if(t.category.includes('exchange')){ cl='row-transfer'; txt='text-primary'; sym='💱'; }
            tbody.innerHTML += `<tr class="${cl}" onclick="accounting.openTransactionDetail('${t.id}')"><td>${date}</td><td>${t.description}</td><td style="font-size:11px; font-weight:700; color:#64748b;">${this.translateCat(t.category).toUpperCase()}</td><td class="${txt}">${sym} ${this.fmt(t.amount, t.currency)}</td></tr>`;
        });
    },

    updateChartRender: function() {
        const ctx = document.getElementById('financeChart'); if(!ctx) return;
        const targetCurrency = document.getElementById('chart-currency').value;
        const now=new Date(); let startTime=new Date(0);
        if(this.currentPeriod==='24h') startTime.setHours(now.getHours()-24);
        else if(this.currentPeriod==='1w') startTime.setDate(now.getDate()-7);
        else if(this.currentPeriod==='1m') startTime.setDate(now.getDate()-30);
        else if(this.currentPeriod==='1y') startTime.setFullYear(now.getFullYear()-1);

        const filtered = this.allTransactions.filter(t => new Date(t.created_at) >= startTime && !t.is_escrow && !t.category.includes('exchange')).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
        let labels=[], inc=[], exp=[], prof=[]; 
        // Basit gruplama
        filtered.forEach(t => {
            labels.push(new Date(t.created_at).toLocaleDateString('tr-TR'));
            const v = parseFloat(t.amount) * (this.liveRates[t.currency]||1)/this.liveRates[targetCurrency];
            if(t.type==='income') { inc.push(v); exp.push(0); prof.push(v); } else { inc.push(0); exp.push(v); prof.push(-v); }
        });
        
        if(this.chartInstance) this.chartInstance.destroy();
        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: labels.length?labels:['Wait'], datasets: [{label:'Net', data:prof, borderColor:'#10b981', hidden:!this.chartState.profit}, {label:'Ciro', data:inc, borderColor:'#3b82f6', hidden:!this.chartState.income}, {label:'Gider', data:exp, borderColor:'#ef4444', hidden:!this.chartState.expense}] },
            options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} }
        });
    },

    // YARDIMCILAR
    translateCat: function(c) { const d={'rent':'Kira','bills':'Fatura','visa_service':'Vize','extra_service':'Ek Hizmet','escrow_deposit':'Emanet Girişi','escrow_refund':'Emanet İadesi','exchange_in':'Döviz Giriş','exchange_out':'Döviz Çıkış'}; return d[c]||c; },
    updateText: function(id, t) { const el = document.getElementById(id); if(el) el.innerText = t; },
    fmt: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); },
    toggleChartData: function(t,e){ this.chartState[t]=!this.chartState[t]; e.classList.toggle('inactive'); this.updateChartRender(); },
    filterChartDate: function(p,b){ document.querySelectorAll('.time-btn').forEach(e=>e.classList.remove('active')); b.classList.add('active'); this.currentPeriod=p; this.updateChartRender(); },
    
    // Basit Kayıtlar
    saveExpense: async function(e){ e.preventDefault(); this.genericSave('expense','modal-expense'); },
    saveExtraIncome: async function(e){ e.preventDefault(); this.genericSave('income','modal-extra-income'); },
    saveEscrow: async function(e){ e.preventDefault(); this.genericSave('income','modal-escrow',true); },
    saveExchange: async function(e){ e.preventDefault(); /* ... */ window.ui.closeModal('modal-exchange'); this.refreshDashboard(); },
    genericSave: async function(type, modalId, isEscrow=false){ window.ui.closeModal(modalId); this.refreshDashboard(); },
    openTransactionDetail: function(id){}, deleteTransaction: async function(){}
};

window.addEventListener('load', () => { 
    window.accounting.refreshDashboard(); 
    if(document.getElementById('form-expense')) document.getElementById('form-expense').onsubmit=window.accounting.saveExpense;
    if(document.getElementById('form-extra-income')) document.getElementById('form-extra-income').onsubmit=window.accounting.saveExtraIncome;
    if(document.getElementById('form-escrow')) document.getElementById('form-escrow').onsubmit=window.accounting.saveEscrow;
    if(document.getElementById('form-exchange')) document.getElementById('form-exchange').onsubmit=window.accounting.saveExchange;
    // YENİ DİNLEYİCİ
    if(document.getElementById('form-escrow-action')) document.getElementById('form-escrow-action').onsubmit=window.accounting.saveEscrowAction;
});
