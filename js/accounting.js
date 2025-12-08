// js/accounting.js - VIZERIO PRO GOLDEN MASTER V9.0

window.accounting = {
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null,
    // Grafik Görünürlük Durumu (Varsayılan: Hepsi Açık)
    chartState: { profit: true, income: true, expense: true }, 
    currentPeriod: 'all',
    allTransactions: [],
    
    // 1. SİSTEMİ BAŞLAT
    refreshDashboard: async function() {
        console.log("💰 Sistem ve Veriler Yükleniyor...");
        
        // Kullanıcıyı Bul
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if(user && user.email) {
                // Kullanıcı adını bir yerlere yazmak istersen burayı kullan
            }
        } catch(e) {}

        // Kurları Çek
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const d = await res.json();
            this.liveRates = { TRY: 1, USD: (1/d.rates.USD), EUR: (1/d.rates.EUR) };
            if(document.getElementById('live-rates-display')) 
                document.getElementById('live-rates-display').innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
        } catch (e) {}

        // Verileri Çek
        const { data: list, error } = await window.supabaseClient.from('transactions').select('*').order('created_at', { ascending: false });
        if (error) return;
        
        this.allTransactions = list || [];
        
        this.calculateStats(this.allTransactions);
        this.renderTable(this.allTransactions);
        setTimeout(() => this.updateChartRender(), 200);
    },

    // 2. HESAPLAMA MOTORU
    calculateStats: function(list) {
        const selectedCurr = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        let wTRY=0, wUSD=0, wEUR=0; 
        let tInc=0, tExp=0, escTotal=0;

        list.forEach(t => {
            const amt = parseFloat(t.amount);
            
            // KASA (Her şey girer)
            if (t.type === 'income') {
                if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt;
            } else {
                if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt;
            }

            // EMANET (Sadece is_escrow)
            if (t.is_escrow) {
                const val = (amt * (this.liveRates[t.currency]||1)) / this.liveRates[selectedCurr];
                if(t.type === 'income') escTotal += val; else escTotal -= val;
            } 
            // KAR/ZARAR (Emanet ve Exchange HARİÇ)
            else if (!t.category.includes('exchange')) {
                const val = (amt * (this.liveRates[t.currency]||1)) / this.liveRates[selectedCurr];
                if (t.type === 'income') tInc += val; else tExp += val;
            }
        });

        this.updateText('wallet-try', this.fmt(wTRY, 'TRY'));
        this.updateText('wallet-usd', this.fmt(wUSD, 'USD'));
        this.updateText('wallet-eur', this.fmt(wEUR, 'EUR'));
        
        const usdValInTry = wUSD * this.liveRates.USD;
        const eurValInTry = wEUR * this.liveRates.EUR;
        this.updateText('val-usd', `≈ ${this.fmt(usdValInTry, 'TRY')}`);
        this.updateText('val-eur', `≈ ${this.fmt(eurValInTry, 'TRY')}`);

        const totalEq = (wTRY + (wUSD*this.liveRates.USD) + (wEUR*this.liveRates.EUR)) / this.liveRates[selectedCurr];
        this.updateText('total-equity', this.fmt(totalEq, selectedCurr));

        this.updateText('money-profit', this.fmt(tInc-tExp, selectedCurr));
        this.updateText('money-income', this.fmt(tInc, selectedCurr));
        this.updateText('money-expense', this.fmt(tExp, selectedCurr));
        this.updateText('money-escrow', this.fmt(escTotal, selectedCurr));
    },

    // 3. TABLO
    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Veri yok.</td></tr>'; return; }

        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR');
            let cl = 'row-expense', txt = 'text-red', sym = '-';
            
            if (t.type === 'income') { cl = 'row-income'; txt = 'text-green'; sym = '+'; }
            if (t.is_escrow) { cl = 'row-escrow'; txt = 'text-orange'; } 
            if (t.category.includes('exchange')) { cl = 'row-transfer'; txt = 'text-primary'; sym='💱'; }

            tbody.innerHTML += `<tr class="${cl}">
                <td>${date}</td>
                <td>${t.description}</td>
                <td style="font-size:11px; font-weight:700; color:#64748b;">${t.category.toUpperCase()}</td>
                <td class="${txt}">${sym} ${this.fmt(t.amount, t.currency)}</td>
            </tr>`;
        });
    },

    // 4. GRAFİK (BUTONLAR AKTİF)
    updateChartRender: function() {
        const ctx = document.getElementById('financeChart');
        if(!ctx) return;
        
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
            options: { responsive: true, maintainAspectRatio: false }
        });
    },

    // BUTONLAR & FİLTRELER
    filterChartDate: function(period, btn) { 
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active')); 
        btn.classList.add('active'); 
        this.currentPeriod = period; 
        this.updateChartRender(); 
    },
    toggleChartData: function(type, cardElement) { 
        this.chartState[type] = !this.chartState[type]; 
        if(this.chartState[type]) cardElement.classList.remove('inactive'); else cardElement.classList.add('inactive'); 
        this.updateChartRender(); 
    },

    // KAYIT İŞLEMLERİ
    saveExpense: async function(e) { e.preventDefault(); this.genericSave('expense', 'modal-expense'); },
    saveExtraIncome: async function(e) { e.preventDefault(); this.genericSave('income', 'modal-extra-income'); },
    saveEscrow: async function(e) { e.preventDefault(); this.genericSave('income', 'modal-escrow', true); },
    
    saveExchange: async function(e) {
        e.preventDefault();
        const outA = document.getElementById('ex-out-amt').value, outC = document.getElementById('ex-out-curr').value;
        const inA = document.getElementById('ex-in-amt').value, inC = document.getElementById('ex-in-curr').value;
        await window.supabaseClient.from('transactions').insert([
            { type: 'expense', category: 'exchange_out', description: 'Döviz Bozum', amount: outA, currency: outC },
            { type: 'income', category: 'exchange_in', description: 'Döviz Giriş', amount: inA, currency: inC }
        ]);
        window.ui.closeModal('modal-exchange'); this.refreshDashboard();
    },

    genericSave: async function(type, modalId, isEscrow=false) {
        const prefix = modalId.split('-')[1]; // expense, extra, escrow
        let cat = 'general', desc = '', amt = 0, curr = 'TRY';

        if(prefix === 'expense') { 
            cat = document.getElementById('exp-category').value; 
            desc = document.getElementById('exp-title').value; 
            amt = document.getElementById('exp-amount').value; 
            curr = document.getElementById('exp-currency').value;
        } else if (prefix === 'extra') {
            cat = 'extra_service';
            desc = document.getElementById('ei-customer').value + ' - ' + document.getElementById('ei-category').value;
            amt = document.getElementById('ei-amount').value;
            curr = document.getElementById('ei-currency').value;
        } else if (prefix === 'escrow') {
            cat = 'escrow_deposit';
            desc = document.getElementById('esc-customer').value + ' (Emanet)';
            amt = document.getElementById('esc-amount').value;
            curr = document.getElementById('esc-currency').value;
        }

        await window.supabaseClient.from('transactions').insert({ type, category: cat, description: desc, amount: amt, currency: curr, is_escrow: isEscrow });
        window.ui.closeModal(modalId); this.refreshDashboard();
    },

    // YARDIMCILAR
    updateText: function(id, t) { const el = document.getElementById(id); if(el) el.innerText = t; },
    fmt: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); },
    openEscrowDetails: function() { window.ui.openModal('modal-escrow-details'); this.calculateStats(this.allTransactions); this.renderEscrowTable(); },
    openEscrowActionSimple: async function() {
        const amt = prompt("Çıkış/İade Tutarını Giriniz:");
        if(amt) {
            await window.supabaseClient.from('transactions').insert({
                type: 'expense', category: 'escrow_refund', description: 'Emanet Çıkışı/İade', amount: amt, currency: 'EUR', is_escrow: true 
            });
            this.refreshDashboard(); setTimeout(() => this.openEscrowDetails(), 500);
        }
    },
    renderEscrowTable: function() {
        const list = this.allTransactions.filter(t => t.is_escrow);
        let h = ''; list.forEach(t => { h += `<tr><td>${new Date(t.created_at).toLocaleDateString()}</td><td>${t.description}</td><td>${this.fmt(t.amount, t.currency)}</td></tr>`; });
        document.getElementById('escrow-list-body').innerHTML = h;
    },
    applyFilters: function() {}, toggleFilterMenu: function() {} // Sadeleştirildi
};

window.addEventListener('load', () => { 
    window.accounting.refreshDashboard(); 
    if(document.getElementById('form-expense')) document.getElementById('form-expense').onsubmit=window.accounting.saveExpense;
    if(document.getElementById('form-extra-income')) document.getElementById('form-extra-income').onsubmit=window.accounting.saveExtraIncome;
    if(document.getElementById('form-escrow')) document.getElementById('form-escrow').onsubmit=window.accounting.saveEscrow;
    if(document.getElementById('form-exchange')) document.getElementById('form-exchange').onsubmit=window.accounting.saveExchange;
});
