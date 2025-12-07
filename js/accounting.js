// js/accounting.js - GRAFİK VE KASA DÜZELTMELERİ

window.accounting = {
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null,
    chartState: { profit: true, income: false, expense: false },
    currentPeriod: '1w',
    allTransactions: [],

    refreshDashboard: async function() {
        console.log("💰 Sistem yenileniyor...");
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const d = await res.json();
            this.liveRates = { TRY: 1, USD: (1/d.rates.USD), EUR: (1/d.rates.EUR) };
            if(document.getElementById('live-rates-display')) 
                document.getElementById('live-rates-display').innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
        } catch (e) {}

        const { data: list, error } = await window.supabaseClient.from('transactions').select('*').order('created_at', { ascending: false });
        if (error) return;
        this.allTransactions = list; 

        this.calculateStats(list);
        this.renderTable(list.slice(0, 10));
        setTimeout(() => this.updateChartRender(), 100);
    },

    // --- KASA HESAPLAMA (DÜZELTİLDİ: Küçük yazılar artık çalışacak) ---
    calculateStats: function(list) {
        const selectedCurr = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        let wTRY=0, wUSD=0, wEUR=0; 
        let tInc=0, tExp=0, tEsc=0;

        list.forEach(t => {
            const amt = parseFloat(t.amount);
            if(t.type==='income') {
                if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt;
            } else if (t.type==='expense') {
                if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt;
            }

            const isExchange = t.category && t.category.includes('exchange');
            const valInTarget = (amt * (this.liveRates[t.currency]||1)) / this.liveRates[selectedCurr];

            if (!isExchange && !t.is_escrow) {
                if (t.type === 'income') tInc += valInTarget;
                if (t.type === 'expense') tExp += valInTarget;
            }
            if (t.is_escrow) tEsc += valInTarget;
        });

        this.updateText('wallet-try', this.fmt(wTRY, 'TRY'));
        this.updateText('wallet-usd', this.fmt(wUSD, 'USD'));
        this.updateText('wallet-eur', this.fmt(wEUR, 'EUR'));
        
        // --- DÜZELTME: KÜÇÜK YAZILARIN ÇALIŞMASI ---
        // USD Kasanın TL Değeri: wUSD * USD_KURU
        const usdValInTry = wUSD * this.liveRates.USD;
        const eurValInTry = wEUR * this.liveRates.EUR;
        this.updateText('val-usd', `≈ ${this.fmt(usdValInTry, 'TRY')}`);
        this.updateText('val-eur', `≈ ${this.fmt(eurValInTry, 'TRY')}`);
        
        // Toplam Varlık
        const totalEquity = (wTRY + (wUSD*this.liveRates.USD) + (wEUR*this.liveRates.EUR)) / this.liveRates[selectedCurr];
        this.updateText('total-equity', this.fmt(totalEquity, selectedCurr));

        // Kartlar
        this.updateText('money-profit', this.fmt(tInc-tExp, selectedCurr));
        this.updateText('money-income', this.fmt(tInc, selectedCurr));
        this.updateText('money-expense', this.fmt(tExp, selectedCurr));
        this.updateText('money-escrow', this.fmt(tEsc, selectedCurr));
    },

    // GRAFİK MOTORU (DÜZELTİLDİ: Tarih formatı ve boşluklar)
    updateChartRender: function() {
        const ctx = document.getElementById('financeChart');
        if (!ctx) return;
        
        const targetCurrency = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        const now = new Date();
        let startTime = new Date();
        let timeFormat = 'day';

        if(this.currentPeriod === '24h') { startTime.setHours(now.getHours() - 24); timeFormat = 'hour'; }
        if(this.currentPeriod === '1w') { startTime.setDate(now.getDate() - 7); timeFormat = 'day'; }
        if(this.currentPeriod === '1m') { startTime.setDate(now.getDate() - 30); timeFormat = 'day'; }
        if(this.currentPeriod === '6m') { startTime.setMonth(now.getMonth() - 6); timeFormat = 'month'; }
        if(this.currentPeriod === '1y') { startTime.setFullYear(now.getFullYear() - 1); timeFormat = 'month'; }
        if(this.currentPeriod === 'all') { startTime = new Date(0); timeFormat = 'month'; }

        const filteredData = this.allTransactions
            .filter(t => new Date(t.created_at) >= startTime && !t.is_escrow && !(t.category && t.category.includes('exchange')))
            .sort((a,b) => new Date(a.created_at) - new Date(b.created_at));

        let labels = [], incomeData = [], expenseData = [], profitData = [], grouped = {};

        filteredData.forEach(t => {
            const d = new Date(t.created_at);
            let key = '';
            
            // Tarih Formatı (Daha güvenli)
            if(timeFormat === 'hour') key = d.getHours() + ":00";
            else if(timeFormat === 'day') key = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
            else if(timeFormat === 'month') key = d.toLocaleDateString('tr-TR', { month: 'long' });

            if(!grouped[key]) grouped[key] = { income: 0, expense: 0 };
            const val = (parseFloat(t.amount) * (this.liveRates[t.currency] || 1)) / this.liveRates[targetCurrency];
            
            if(t.type === 'income') grouped[key].income += val;
            else if(t.type === 'expense') grouped[key].expense += val;
        });

        Object.keys(grouped).forEach(key => {
            labels.push(key);
            incomeData.push(grouped[key].income);
            expenseData.push(grouped[key].expense);
            profitData.push(grouped[key].income - grouped[key].expense);
        });

        if(labels.length === 0) { labels=["Veri Yok"]; incomeData=[0]; expenseData=[0]; profitData=[0]; }

        if (this.chartInstance) this.chartInstance.destroy();

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Net Kâr', data: profitData, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4, hidden: !this.chartState.profit },
                    { label: 'Ciro', data: incomeData, borderColor: '#3b82f6', borderDash: [5, 5], tension: 0.4, hidden: !this.chartState.income },
                    { label: 'Gider', data: expenseData, borderColor: '#ef4444', tension: 0.4, hidden: !this.chartState.expense }
                ]
            },
            options: { 
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    },

    // Diğer (Aynı)
    filterChartDate: function(period, btn) { document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); this.currentPeriod = period; this.updateChartRender(); },
    toggleChartData: function(type, cardElement) { this.chartState[type] = !this.chartState[type]; if(this.chartState[type]) cardElement.classList.remove('inactive'); else cardElement.classList.add('inactive'); this.updateChartRender(); },
    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body'); if(!tbody) return; tbody.innerHTML = '';
        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
            let rowClass = 'row-expense', textClass = 'text-red', symbol = '-';
            if (t.type === 'income') { rowClass = 'row-income'; textClass = 'text-green'; symbol = '+'; }
            if (t.is_escrow) { rowClass = 'row-escrow'; textClass = 'text-orange'; symbol = ''; }
            if (t.category && t.category.includes('exchange')) { rowClass = 'row-exchange'; textClass = 'text-navy'; symbol = t.type==='income'?'+':'-'; }
            tbody.innerHTML += `<tr class="${rowClass}"><td style="color:#64748b; font-size:12px; padding:15px;">${date}</td><td style="padding:15px; font-weight:600; color:#334155;">${t.description || '-'}</td><td style="padding:15px;"><span class="badge badge-gray">${this.translateCat(t.category)}</span></td><td style="padding:15px; text-align:right; font-weight:800;" class="${textClass}">${symbol} ${this.fmt(t.amount, t.currency)}</td></tr>`;
        });
    },
    translateCat: function(cat) { const dict = {'rent':'Kira','bills':'Fatura','food':'Yemek','consulate_fee':'Vize Harcı','salary':'Maaş','marketing':'Reklam','exchange_in':'Döviz Giriş','exchange_out':'Döviz Çıkış'}; return dict[cat] || cat; },
    
    // Form Kayıtları (Emanet Detayı Düzeltilmiş)
    saveExpense: async function(e) { e.preventDefault(); this.genericSave(e, 'expense', 'modal-expense'); },
    saveEscrow: async function(e) { /* ...Eski... */ },
    saveExtraIncome: async function(e) { e.preventDefault(); this.genericSave(e, 'income', 'modal-extra-income'); },
    saveExchange: async function(e) { /* ...Eski... */ },
    genericSave: async function(e, type, modalId) { /* ...Eski... */ },
    openEscrowDetails: async function() { /* ...Eski... */ },
    openTransactionDetail: function(txId) { /* ...Eski... */ },
    deleteTransaction: async function() { /* ...Eski... */ },

    updateText: function(id, t) { const el = document.getElementById(id); if(el) el.innerText = t; },
    fmt: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); }
};

window.addEventListener('load', () => {
    window.accounting.refreshDashboard();
    // Diğer listenerlar aynı...
});
