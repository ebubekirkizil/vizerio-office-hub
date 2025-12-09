// js/accounting.js - VIZERIO PRO (SİMÜLASYON / DEMO MODU)
// NOT: Bu modda veritabanı bağlantısı YOKTUR. Veriler sahtedir.

window.accounting = {
    
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null,
    chartState: { profit: true, income: true, expense: true },
    currentPeriod: 'all',
    
    // SAHTE VERİ LİSTESİ (Sanki veritabanından gelmiş gibi)
    allTransactions: [
        { id: '1', created_at: '2025-12-08T10:00:00', type: 'income', category: 'visa_service', description: 'Vize Hizmeti - Ahmet Yılmaz', amount: 15000, currency: 'TRY', is_escrow: false },
        { id: '2', created_at: '2025-12-08T11:30:00', type: 'income', category: 'escrow_deposit', description: 'Emanet Girişi - Mehmet Demir', amount: 2000, currency: 'EUR', is_escrow: true },
        { id: '3', created_at: '2025-12-07T14:00:00', type: 'expense', category: 'rent', description: 'Aralık Ofis Kirası', amount: 25000, currency: 'TRY', is_escrow: false },
        { id: '4', created_at: '2025-12-07T09:15:00', type: 'income', category: 'extra_service', description: 'Uçak Bileti - Ayşe Kara', amount: 500, currency: 'USD', is_escrow: false },
        { id: '5', created_at: '2025-12-06T16:45:00', type: 'expense', category: 'bills', description: 'Elektrik Faturası', amount: 1200, currency: 'TRY', is_escrow: false },
        { id: '6', created_at: '2025-12-05T10:00:00', type: 'expense', category: 'exchange_out', description: 'Döviz Bozum (Çıkan)', amount: 1000, currency: 'USD', is_escrow: false },
        { id: '7', created_at: '2025-12-05T10:00:00', type: 'income', category: 'exchange_in', description: 'Döviz Giriş (Giren)', amount: 34500, currency: 'TRY', is_escrow: false },
        { id: '8', created_at: '2025-12-04T13:20:00', type: 'income', category: 'visa_service', description: 'Vize Danışmanlık - ABC Ltd.', amount: 2000, currency: 'EUR', is_escrow: false },
        { id: '9', created_at: '2025-12-03T11:00:00', type: 'expense', category: 'escrow_refund', description: 'Emanet İadesi - Mehmet Demir', amount: 500, currency: 'EUR', is_escrow: true }
    ],

    refreshDashboard: async function() {
        console.log("🚀 SİMÜLASYON MODU: Sahte Veriler Yükleniyor...");
        
        // Kurları Çekmeye Çalış (Çekemezse varsayılanı kullanır)
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const d = await res.json();
            this.liveRates = { TRY: 1, USD: (1/d.rates.USD), EUR: (1/d.rates.EUR) };
            if(document.getElementById('live-rates-display')) 
                document.getElementById('live-rates-display').innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
        } catch (e) {}

        // Veritabanına gitmiyoruz, direkt eldeki listeyi kullanıyoruz
        this.calculateStats(this.allTransactions);
        this.renderTable(this.allTransactions);
        setTimeout(() => this.updateChartRender(), 200);
    },

    calculateStats: function(list) {
        const selectedCurr = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        let wTRY=0, wUSD=0, wEUR=0; 
        let tInc=0, tExp=0, escTotal=0;
        let escEUR=0, escUSD=0, escTRY=0;

        list.forEach(t => {
            const amt = parseFloat(t.amount);
            
            // KASA
            if (t.type === 'income') {
                if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt;
            } else {
                if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt;
            }

            // EMANET
            if (t.is_escrow) {
                const val = (amt * (this.liveRates[t.currency]||1)) / this.liveRates[selectedCurr];
                if(t.type === 'income') { 
                    escTotal += val; 
                    if(t.currency==='EUR') escEUR+=amt; if(t.currency==='USD') escUSD+=amt; if(t.currency==='TRY') escTRY+=amt;
                } else { 
                    escTotal -= val;
                    if(t.currency==='EUR') escEUR-=amt; if(t.currency==='USD') escUSD-=amt; if(t.currency==='TRY') escTRY-=amt;
                }
            } 
            // KAR/ZARAR
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

        // Modal İçi Emanet Değerleri
        if(document.getElementById('esc-total-eur')) document.getElementById('esc-total-eur').innerText = this.fmt(escEUR,'EUR');
        if(document.getElementById('esc-total-usd')) document.getElementById('esc-total-usd').innerText = this.fmt(escUSD,'USD');
        if(document.getElementById('esc-total-try')) document.getElementById('esc-total-try').innerText = this.fmt(escTRY,'TRY');
    },

    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR');
            let cl = 'row-expense', txt = 'text-red', sym = '-';
            
            if (t.type === 'income') { cl = 'row-income'; txt = 'text-green'; sym = '+'; }
            if (t.is_escrow) { cl = 'row-escrow'; txt = 'text-orange'; } 
            if (t.category.includes('exchange')) { cl = 'row-transfer'; txt = 'text-primary'; sym='💱'; }

            tbody.innerHTML += `<tr class="${cl}" onclick="accounting.openTransactionDetail('${t.id}')">
                <td>${date}</td>
                <td>${t.description}</td>
                <td style="font-size:11px; font-weight:700; color:#64748b;">${this.translateCat(t.category).toUpperCase()}</td>
                <td class="${txt}" style="text-align:right; font-weight:800;">${sym} ${this.fmt(t.amount, t.currency)}</td>
            </tr>`;
        });
    },

    updateChartRender: function() {
        const ctx = document.getElementById('financeChart');
        if (!ctx) return;
        
        // Demo modu olduğu için sadece eldeki veriyi çiziyoruz
        const targetCurrency = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        
        // Tarihe göre sırala
        const filteredData = this.allTransactions
            .filter(t => !t.is_escrow && !t.category.includes('exchange'))
            .sort((a,b) => new Date(a.created_at) - new Date(b.created_at));

        let labels = [], incomeData = [], expenseData = [], profitData = [], grouped = {};

        filteredData.forEach(t => {
            const d = new Date(t.created_at);
            let key = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
            
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
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    },

    // YARDIMCILAR (Kayıtlar bu modda çalışmaz, sadece görüntü)
    translateCat: function(cat) { 
        const dict = { 'visa_service': 'Vize Hizmeti', 'extra_service': 'Ek Hizmet', 'escrow_deposit': 'Emanet Girişi', 'escrow_refund': 'Emanet İadesi', 'rent': 'Kira', 'bills': 'Fatura', 'exchange_in': 'Döviz Giriş', 'exchange_out': 'Döviz Çıkış' }; 
        return dict[cat] || cat;
    },
    updateText: function(id, t) { const el = document.getElementById(id); if(el) el.innerText = t; },
    fmt: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); },
    
    // Boş fonksiyonlar (Hata vermesin diye)
    saveExpense: async function(e){ alert("Demo Modundasınız. Kayıt yapılamaz."); },
    saveEscrow: async function(e){ alert("Demo Modundasınız. Kayıt yapılamaz."); },
    saveExtraIncome: async function(e){ alert("Demo Modundasınız. Kayıt yapılamaz."); },
    saveExchange: async function(e){ alert("Demo Modundasınız. Kayıt yapılamaz."); },
    openEscrowDetails: function(){ window.ui.openModal('modal-escrow-details'); this.calculateStats(this.allTransactions); const l=this.allTransactions.filter(t=>t.is_escrow); let h=''; l.forEach(t=>{ const sym=t.type==='income'?'+':'-'; h+=`<tr><td>${new Date(t.created_at).toLocaleDateString()}</td><td>${t.description}</td><td>${sym} ${this.fmt(t.amount,t.currency)}</td></tr>`; }); document.getElementById('escrow-list-body').innerHTML=h; },
    toggleChartData: function(type, cardElement) { this.chartState[type] = !this.chartState[type]; if(this.chartState[type]) cardElement.classList.remove('inactive'); else cardElement.classList.add('inactive'); this.updateChartRender(); },
    filterChartDate: function() {}, openTransactionDetail: function() {}, openEscrowActionSimple: function() {}
};

window.addEventListener('load', () => { window.accounting.refreshDashboard(); });
