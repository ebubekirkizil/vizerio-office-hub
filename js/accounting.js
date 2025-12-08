// js/accounting.js - GOLDEN MASTER V8.0

window.accounting = {
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    allTransactions: [],
    
    refreshDashboard: async function() {
        // Kullanıcı ve Kur
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const d = await res.json();
            this.liveRates = { TRY: 1, USD: (1/d.rates.USD), EUR: (1/d.rates.EUR) };
            if(document.getElementById('live-rates-display')) 
                document.getElementById('live-rates-display').innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
        } catch (e) {}

        // Veri Çek
        const { data: list, error } = await window.supabaseClient.from('transactions').select('*').order('created_at', { ascending: false });
        if (error) return;
        this.allTransactions = list || [];
        
        this.calculateStats(this.allTransactions);
        this.renderTable(this.allTransactions);
        setTimeout(() => this.updateChartRender(), 100);
    },

    calculateStats: function(list) {
        let wTRY=0, wUSD=0, wEUR=0; // Kasa
        let tInc=0, tExp=0; // Kar/Zarar
        let escEUR=0, escUSD=0, escTRY=0; // Emanet

        list.forEach(t => {
            const amt = parseFloat(t.amount);
            
            // Kasa (Her şey girer)
            if (t.type === 'income') {
                if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt;
            } else {
                if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt;
            }

            // Emanet (Sadece is_escrow)
            if (t.is_escrow) {
                if (t.type === 'income') {
                    if(t.currency==='TRY') escTRY+=amt; if(t.currency==='USD') escUSD+=amt; if(t.currency==='EUR') escEUR+=amt;
                } else {
                    if(t.currency==='TRY') escTRY-=amt; if(t.currency==='USD') escUSD-=amt; if(t.currency==='EUR') escEUR-=amt;
                }
            } 
            // Normal Gelir/Gider (Emanet ve Exchange hariç)
            else if (!t.category.includes('exchange')) {
                const valInTry = amt * (this.liveRates[t.currency] || 1);
                if (t.type === 'income') tInc += valInTry; else tExp += valInTry;
            }
        });

        // Yazdır
        this.updateText('wallet-try', this.fmt(wTRY, 'TRY'));
        this.updateText('wallet-usd', this.fmt(wUSD, 'USD'));
        this.updateText('wallet-eur', this.fmt(wEUR, 'EUR'));
        
        // Toplam Varlık (Hepsi)
        const totalEq = wTRY + (wUSD*this.liveRates.USD) + (wEUR*this.liveRates.EUR);
        this.updateText('total-equity', this.fmt(totalEq, 'TRY'));

        // Emanet Toplam
        const totalEsc = escTRY + (escUSD*this.liveRates.USD) + (escEUR*this.liveRates.EUR);
        this.updateText('money-escrow', this.fmt(totalEsc, 'TRY'));
        
        // Modal İçi Emanet
        if(document.getElementById('esc-total-eur')) document.getElementById('esc-total-eur').innerText = this.fmt(escEUR,'EUR');
        if(document.getElementById('esc-total-usd')) document.getElementById('esc-total-usd').innerText = this.fmt(escUSD,'USD');
        if(document.getElementById('esc-total-try')) document.getElementById('esc-total-try').innerText = this.fmt(escTRY,'TRY');

        this.updateText('money-profit', this.fmt(tInc-tExp, 'TRY'));
        this.updateText('money-income', this.fmt(tInc, 'TRY'));
        this.updateText('money-expense', this.fmt(tExp, 'TRY'));
    },

    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body');
        tbody.innerHTML = '';
        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR');
            let cl = 'row-expense', txt = 'text-red', sym = '-';
            if (t.type === 'income') { cl = 'row-income'; txt = 'text-green'; sym = '+'; }
            if (t.is_escrow) { cl = 'row-escrow'; txt = 'text-orange'; } // Emanet
            if (t.category.includes('exchange')) { cl = 'row-exchange'; txt = 'text-primary'; sym='💱'; }

            tbody.innerHTML += `<tr class="${cl}">
                <td>${date}</td>
                <td>${t.description}</td>
                <td style="font-size:12px; font-weight:700; color:#64748b;">${t.category.toUpperCase()}</td>
                <td class="${txt}">${sym} ${this.fmt(t.amount, t.currency)}</td>
            </tr>`;
        });
    },

  // js/accounting.js - V8.1 (GRAFİK KUMANDASI VE PREMIUM AYARLAR)

window.accounting = {
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null,
    
    // GRAFİK DURUMU (Varsayılan: Sadece Net Kar Açık)
    chartState: { profit: true, income: false, expense: false }, 
    currentPeriod: 'all',
    
    allTransactions: [], // Tüm veri
    filteredTransactions: [], // Tablo verisi

    // 1. BAŞLATMA
    refreshDashboard: async function() {
        console.log("📊 Grafik Sistemi Yükleniyor...");
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
        this.filteredTransactions = list || [];

        this.calculateStats(this.allTransactions);
        this.renderTable(this.filteredTransactions);
        
        // Grafiği çiz
        setTimeout(() => this.updateChartRender(), 100);
    },

    // 2. KARTLARA TIKLAYINCA GRAFİĞİ GÜNCELLE
    toggleChartData: function(type, cardElement) {
        // Durumu tersine çevir (Açıksa kapat, kapalıysa aç)
        this.chartState[type] = !this.chartState[type];
        
        // Kartın görüntüsünü değiştir
        if(this.chartState[type]) {
            cardElement.classList.remove('inactive');
        } else {
            cardElement.classList.add('inactive');
        }
        
        // Grafiği yeni duruma göre çiz
        this.updateChartRender();
    },

    // 3. ZAMAN FİLTRESİ
    filterChartDate: function(period, btn) {
        // Butonların rengini ayarla
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.currentPeriod = period;
        this.updateChartRender();
    },

    // 4. GRAFİK MOTORU (GELİŞMİŞ)
    updateChartRender: function() {
        const ctx = document.getElementById('financeChart');
        if (!ctx) return;
        
        const targetCurrency = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        const now = new Date();
        let startTime = new Date(0); 
        let timeFormat = 'month';

        // Zaman Ayarı
        if(this.currentPeriod === '24h') { startTime = new Date(); startTime.setHours(now.getHours() - 24); timeFormat = 'hour'; }
        else if(this.currentPeriod === '1w') { startTime = new Date(); startTime.setDate(now.getDate() - 7); timeFormat = 'day'; }
        else if(this.currentPeriod === '1m') { startTime = new Date(); startTime.setDate(now.getDate() - 30); timeFormat = 'day'; }
        else if(this.currentPeriod === '1y') { startTime = new Date(); startTime.setFullYear(now.getFullYear() - 1); timeFormat = 'month'; }

        // Veriyi Süz (Emanet ve Döviz Bozumu HARİÇ)
        const filteredData = this.allTransactions
            .filter(t => new Date(t.created_at) >= startTime && !t.is_escrow && !t.category.includes('exchange'))
            .sort((a,b) => new Date(a.created_at) - new Date(b.created_at));

        let labels = [], incomeData = [], expenseData = [], profitData = [], grouped = {};

        // Verileri Grupla
        filteredData.forEach(t => {
            const d = new Date(t.created_at);
            let key = '';
            if(timeFormat === 'hour') key = d.getHours() + ":00";
            else if(timeFormat === 'day') key = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
            else key = d.toLocaleDateString('tr-TR', { month: 'long', year: '2-digit' });

            if(!grouped[key]) grouped[key] = { income: 0, expense: 0 };
            
            // Kura çevir
            const val = parseFloat(t.amount) * (this.liveRates[t.currency] || 1) / this.liveRates[targetCurrency];
            
            if(t.type === 'income') grouped[key].income += val;
            else grouped[key].expense += val;
        });

        // Grafik Noktalarını Oluştur
        Object.keys(grouped).forEach(key => {
            labels.push(key);
            incomeData.push(grouped[key].income);
            expenseData.push(grouped[key].expense);
            profitData.push(grouped[key].income - grouped[key].expense);
        });

        if(labels.length === 0) { labels=["Veri Yok"]; incomeData=[0]; expenseData=[0]; profitData=[0]; }

        if (this.chartInstance) this.chartInstance.destroy();

        // Grafiği Çiz
        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { 
                        label: 'Net Kâr', 
                        data: profitData, 
                        borderColor: '#10b981', // Yeşil
                        backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                        fill: true, 
                        tension: 0.4,
                        hidden: !this.chartState.profit // Karta tıklayınca gizlenir
                    },
                    { 
                        label: 'Ciro', 
                        data: incomeData, 
                        borderColor: '#3b82f6', // Mavi
                        borderDash: [5, 5], 
                        tension: 0.4,
                        hidden: !this.chartState.income // Karta tıklayınca gizlenir
                    },
                    { 
                        label: 'Gider', 
                        data: expenseData, 
                        borderColor: '#ef4444', // Kırmızı
                        tension: 0.4,
                        hidden: !this.chartState.expense // Karta tıklayınca gizlenir
                    }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false }, // Üstteki yazıları gizle (Kartları kullanacağız)
                    tooltip: { 
                        mode: 'index', 
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('tr-TR', { style: 'currency', currency: targetCurrency }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: { 
                    y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                    x: { grid: { display: false } }
                }
            }
        });
    },

    // --- DİĞER HESAPLAMALAR VE TABLO (DEĞİŞMEDİ) ---
    calculateStats: function(list) {
        const selectedCurr = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        let wTRY=0, wUSD=0, wEUR=0, tInc=0, tExp=0, escTotal=0;

        list.forEach(t => {
            const amt = parseFloat(t.amount);
            // Kasa
            if (t.type === 'income') { if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt; }
            else { if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt; }
            
            // Emanet
            if(t.is_escrow) {
                const v = (amt * (this.liveRates[t.currency]||1)) / this.liveRates[selectedCurr];
                if(t.type==='income') escTotal+=v; else escTotal-=v;
            }
            // Kar/Zarar
            else if (!t.category.includes('exchange')) {
                const v = (amt * (this.liveRates[t.currency]||1)) / this.liveRates[selectedCurr];
                if(t.type==='income') tInc+=v; else tExp+=v;
            }
        });

        this.updateText('wallet-try', this.fmt(wTRY,'TRY')); this.updateText('wallet-usd', this.fmt(wUSD,'USD')); this.updateText('wallet-eur', this.fmt(wEUR,'EUR'));
        this.updateText('val-usd', `≈ ${this.fmt(wUSD*this.liveRates.USD,'TRY')}`); this.updateText('val-eur', `≈ ${this.fmt(wEUR*this.liveRates.EUR,'TRY')}`);
        this.updateText('total-equity', this.fmt((wTRY + wUSD*this.liveRates.USD + wEUR*this.liveRates.EUR)/this.liveRates[selectedCurr], selectedCurr));
        
        this.updateText('money-profit', this.fmt(tInc-tExp, selectedCurr));
        this.updateText('money-income', this.fmt(tInc, selectedCurr));
        this.updateText('money-expense', this.fmt(tExp, selectedCurr));
        this.updateText('money-escrow', this.fmt(escTotal, selectedCurr));
    },

    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body'); if(!tbody) return; tbody.innerHTML='';
        list.forEach(t => {
            let cl='row-expense', txt='text-red', sym='-';
            if(t.type==='income'){ cl='row-income'; txt='text-green'; sym='+'; }
            if(t.is_escrow){ cl='row-escrow'; }
            if(t.category.includes('exchange')){ cl='row-transfer'; txt='text-primary'; sym='💱'; }
            tbody.innerHTML += `<tr class="${cl}"><td style="padding:15px; color:#64748b;">${new Date(t.created_at).toLocaleDateString()}</td><td style="padding:15px; font-weight:600;">${t.description}</td><td style="padding:15px;"><span class="badge badge-gray">${t.category}</span></td><td style="padding:15px; text-align:right; font-weight:800;" class="${txt}">${sym} ${this.fmt(t.amount, t.currency)}</td></tr>`;
        });
    },

    updateText: function(id, t) { const el = document.getElementById(id); if(el) el.innerText = t; },
    fmt: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); },
    // Diğer boş fonksiyonlar (Kayıt vs. önceki kodda var, burada grafik odaklı)
    saveExpense: async function(e){}, saveEscrow: async function(e){}, saveExtraIncome: async function(e){}, saveExchange: async function(e){}, openEscrowDetails: async function(){}, openTransactionDetail: async function(id){}
};

window.addEventListener('load', () => { window.accounting.refreshDashboard(); });

    // KAYITLAR
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

    openEscrowActionSimple: async function() {
        const amt = prompt("Çıkış/İade Tutarını Giriniz:");
        if(amt) {
            await window.supabaseClient.from('transactions').insert({
                type: 'expense', category: 'escrow_refund', description: 'Emanet Çıkışı/İade', 
                amount: amt, currency: 'EUR', is_escrow: true // Varsayılan EUR
            });
            this.refreshDashboard();
            setTimeout(() => this.openEscrowDetails(), 500);
        }
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

    // Yardımcılar
    openEscrowDetails: function() { window.ui.openModal('modal-escrow-details'); this.calculateStats(this.allTransactions); this.renderEscrowTable(); },
    renderEscrowTable: function() {
        const list = this.allTransactions.filter(t => t.is_escrow);
        let h = ''; list.forEach(t => { h += `<tr><td>${new Date(t.created_at).toLocaleDateString()}</td><td>${t.description}</td><td>${this.fmt(t.amount, t.currency)}</td></tr>`; });
        document.getElementById('escrow-list-body').innerHTML = h;
    },
    filterChartDate: function() {}, applyFilters: function() {}, 
    updateText: function(id, t) { const el = document.getElementById(id); if(el) el.innerText = t; },
    fmt: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); }
};

window.addEventListener('load', () => { 
    window.accounting.refreshDashboard(); 
    if(document.getElementById('form-expense')) document.getElementById('form-expense').onsubmit=window.accounting.saveExpense;
    if(document.getElementById('form-extra-income')) document.getElementById('form-extra-income').onsubmit=window.accounting.saveExtraIncome;
    if(document.getElementById('form-escrow')) document.getElementById('form-escrow').onsubmit=window.accounting.saveEscrow;
    if(document.getElementById('form-exchange')) document.getElementById('form-exchange').onsubmit=window.accounting.saveExchange;
});
