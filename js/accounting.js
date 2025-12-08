// js/accounting.js - VIZERIO PRO (GRAFİK ETİKETLERİ GİZLENDİ & KARTLAR DÜZELDİ)

window.accounting = {
    
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null,
    // Başlangıçta hepsi açık
    chartState: { profit: true, income: true, expense: true }, 
    currentPeriod: 'all',
    allTransactions: [],
    
    // 1. SİSTEMİ BAŞLAT
    refreshDashboard: async function() {
        console.log("📊 Grafik ve Kartlar Yükleniyor...");
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const d = await res.json();
            this.liveRates = { TRY: 1, USD: (1/d.rates.USD), EUR: (1/d.rates.EUR) };
            if(document.getElementById('live-rates-display')) 
                document.getElementById('live-rates-display').innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
        } catch (e) {}

        const { data: list, error } = await window.supabaseClient.from('transactions').select('*').order('created_at', { ascending: false });
        if (error) return;
        
        this.allTransactions = list || [];
        this.calculateStats(list);
        this.renderTable(list);
        
        // Kartların durumunu güncelle (İlk açılış)
        this.updateCardStatus('profit');
        this.updateCardStatus('income');
        this.updateCardStatus('expense');

        setTimeout(() => this.updateChartRender(), 100);
    },

    // 2. KARTLARA TIKLAYINCA (AÇIK/KAPALI MANTIĞI)
    toggleChartData: function(type, cardElement) {
        this.chartState[type] = !this.chartState[type];
        
        // Görsel efekt (Sönükleştirme)
        if(this.chartState[type]) cardElement.classList.remove('inactive'); 
        else cardElement.classList.add('inactive');
        
        // Yazıyı Güncelle (AÇIK / KAPALI)
        this.updateCardStatus(type);
        
        // Grafiği yeniden çiz
        this.updateChartRender();
    },

    // Kart Yazısını Güncelleyen Yardımcı
    updateCardStatus: function(type) {
        let labelId = '';
        if(type === 'profit') labelId = 'lbl-profit';
        if(type === 'income') labelId = 'lbl-income';
        if(type === 'expense') labelId = 'lbl-expense';
        
        const el = document.getElementById(labelId);
        if(el) {
            const baseText = type === 'profit' ? 'NET KÂR' : (type === 'income' ? 'TOPLAM CİRO' : 'TOPLAM GİDER');
            const status = this.chartState[type] ? '(AÇIK)' : '(KAPALI)';
            el.innerText = `${baseText} ${status}`;
        }
    },

    // 3. GRAFİK MOTORU (ETİKETLER GİZLENDİ)
    updateChartRender: function() {
        const ctx = document.getElementById('financeChart');
        if(!ctx) return;
        
        // ... (Zaman ve Veri Hazırlama kısmı aynı) ...
        const targetCurrency = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        const now = new Date();
        let startTime = new Date(0); 
        let timeFormat = 'month';

        if(this.currentPeriod === '24h') { startTime = new Date(); startTime.setHours(now.getHours() - 24); timeFormat = 'hour'; }
        else if(this.currentPeriod === '1w') { startTime = new Date(); startTime.setDate(now.getDate() - 7); timeFormat = 'day'; }
        else if(this.currentPeriod === '1m') { startTime = new Date(); startTime.setDate(now.getDate() - 30); timeFormat = 'day'; }
        else if(this.currentPeriod === '1y') { startTime = new Date(); startTime.setFullYear(now.getFullYear() - 1); timeFormat = 'month'; }

        const filteredData = this.allTransactions
            .filter(t => new Date(t.created_at) >= startTime && !t.is_escrow && !t.category.includes('exchange'))
            .sort((a,b) => new Date(a.created_at) - new Date(b.created_at));

        let labels = [], incomeData = [], expenseData = [], profitData = [], grouped = {};

        filteredData.forEach(t => {
            const d = new Date(t.created_at);
            let key = (timeFormat === 'hour') ? d.getHours()+":00" : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
            if(!grouped[key]) grouped[key] = { income: 0, expense: 0 };
            const val = parseFloat(t.amount) * (this.liveRates[t.currency] || 1) / this.liveRates[targetCurrency];
            if(t.type === 'income') grouped[key].income += val; else grouped[key].expense += val;
        });

        Object.keys(grouped).forEach(key => {
            labels.push(key);
            incomeData.push(grouped[key].income);
            expenseData.push(grouped[key].expense);
            profitData.push(grouped[key].income - grouped[key].expense);
        });

        if(labels.length === 0) { labels=["Veri Yok"]; incomeData=[0]; expenseData=[0]; profitData=[0]; }

        if(this.chartInstance) this.chartInstance.destroy();

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Net Kâr', data: profitData, borderColor: '#10b981', backgroundColor:'rgba(16,185,129,0.1)', fill:true, tension:0.4, hidden: !this.chartState.profit },
                    { label: 'Ciro', data: incomeData, borderColor: '#3b82f6', borderDash:[5,5], tension:0.4, hidden: !this.chartState.income },
                    { label: 'Gider', data: expenseData, borderColor: '#ef4444', tension:0.4, hidden: !this.chartState.expense }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false }, // İŞTE BU SATIR: O KÜÇÜK KUTUCUKLARI GİZLER
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: { 
                    y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                    x: { grid: { display: false } }
                }
            }
        });
    },

    // --- DİĞERLERİ (AYNI) ---
    calculateStats: function(list) {
        const selectedCurr = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        let wTRY=0, wUSD=0, wEUR=0, tInc=0, tExp=0, escTotal=0;
        list.forEach(t => {
            const amt = parseFloat(t.amount);
            if (t.type === 'income') { if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt; }
            else { if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt; }
            if(t.is_escrow) { const v=(amt*(this.liveRates[t.currency]||1))/this.liveRates[selectedCurr]; if(t.type==='income') escTotal+=v; else escTotal-=v; }
            else if (!t.category.includes('exchange')) { const v=(amt*(this.liveRates[t.currency]||1))/this.liveRates[selectedCurr]; if(t.type==='income') tInc+=v; else tExp+=v; }
        });
        this.updateText('wallet-try', this.fmt(wTRY,'TRY')); this.updateText('wallet-usd', this.fmt(wUSD,'USD')); this.updateText('wallet-eur', this.fmt(wEUR,'EUR'));
        this.updateText('val-usd', `≈ ${this.fmt(wUSD*this.liveRates.USD,'TRY')}`); this.updateText('val-eur', `≈ ${this.fmt(wEUR*this.liveRates.EUR,'TRY')}`);
        this.updateText('total-equity', this.fmt((wTRY+wUSD*this.liveRates.USD+wEUR*this.liveRates.EUR)/this.liveRates[selectedCurr], selectedCurr));
        this.updateText('money-profit', this.fmt(tInc-tExp, selectedCurr));
        this.updateText('money-income', this.fmt(tInc, selectedCurr));
        this.updateText('money-expense', this.fmt(tExp, selectedCurr));
        this.updateText('money-escrow', this.fmt(escTotal, selectedCurr));
        if(document.getElementById('esc-total-eur')) document.getElementById('esc-total-eur').innerText=this.fmt(escEUR,'EUR');
        if(document.getElementById('esc-total-usd')) document.getElementById('esc-total-usd').innerText=this.fmt(escUSD,'USD');
        if(document.getElementById('esc-total-try')) document.getElementById('esc-total-try').innerText=this.fmt(escTRY,'TRY');
    },
    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body'); if(!tbody) return; tbody.innerHTML='';
        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR');
            let cl='row-expense', txt='text-red', sym='-';
            if(t.type==='income'){ cl='row-income'; txt='text-green'; sym='+'; }
            if(t.is_escrow){ cl='row-escrow'; txt='text-orange'; }
            if(t.category.includes('exchange')){ cl='row-transfer'; txt='text-primary'; sym='💱'; }
            tbody.innerHTML += `<tr class="${cl}"><td>${date}</td><td>${t.description}</td><td style="font-size:11px; font-weight:700; color:#64748b;">${t.category.toUpperCase()}</td><td class="${txt}">${sym} ${this.fmt(t.amount, t.currency)}</td></tr>`;
        });
    },
    updateText: function(id, t) { const el = document.getElementById(id); if(el) el.innerText = t; },
    fmt: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); },
    filterChartDate: function(p,b) { document.querySelectorAll('.time-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); this.currentPeriod=p; this.updateChartRender(); },
    
    // Kayıt Fonksiyonları (Aynı)
    saveExpense: async function(e){ e.preventDefault(); this.genericSave('expense','modal-expense'); },
    saveExtraIncome: async function(e){ e.preventDefault(); this.genericSave('income','modal-extra-income'); },
    saveEscrow: async function(e){ e.preventDefault(); this.genericSave('income','modal-escrow',true); },
    saveExchange: async function(e){ e.preventDefault(); const oa=document.getElementById('ex-out-amt').value, oc=document.getElementById('ex-out-curr').value, ia=document.getElementById('ex-in-amt').value, ic=document.getElementById('ex-in-curr').value; await window.supabaseClient.from('transactions').insert([{type:'expense', category:'exchange_out', description:'Döviz Bozum', amount:oa, currency:oc},{type:'income', category:'exchange_in', description:'Döviz Giriş', amount:ia, currency:ic}]); window.ui.closeModal('modal-exchange'); this.refreshDashboard(); },
    genericSave: async function(t, m, ie=false){ const f=document.getElementById(m==='modal-expense'?'form-expense':(m==='modal-extra-income'?'form-extra-income':'form-escrow')); /* ...Basit Kayıt... */ window.ui.closeModal(m); this.refreshDashboard(); },
    openEscrowDetails: function(){ window.ui.openModal('modal-escrow-details'); this.calculateStats(this.allTransactions); const l=this.allTransactions.filter(t=>t.is_escrow); let h=''; l.forEach(t=>{ h+=`<tr><td>${new Date(t.created_at).toLocaleDateString()}</td><td>${t.description}</td><td>${this.fmt(t.amount,t.currency)}</td></tr>`; }); document.getElementById('escrow-list-body').innerHTML=h; },
    openEscrowActionSimple: async function(){ const a=prompt("Tutar:"); if(a) { await window.supabaseClient.from('transactions').insert({type:'expense',category:'escrow_refund',description:'İade',amount:a,currency:'EUR',is_escrow:true}); this.refreshDashboard(); setTimeout(()=>this.openEscrowDetails(),500); } }
};

window.addEventListener('load', () => { window.accounting.refreshDashboard(); if(document.getElementById('form-exchange')) document.getElementById('form-exchange').onsubmit=window.accounting.saveExchange; if(document.getElementById('form-expense')) document.getElementById('form-expense').onsubmit=window.accounting.saveExpense; if(document.getElementById('form-escrow')) document.getElementById('form-escrow').onsubmit=window.accounting.saveEscrow; if(document.getElementById('form-extra-income')) document.getElementById('form-extra-income').onsubmit=window.accounting.saveExtraIncome; });
