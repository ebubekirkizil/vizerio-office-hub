// js/accounting.js - V5.3 FİNAL (TÜM FONKSİYONLAR AKTİF & DÜZELTİLMİŞ)

window.accounting = {
    
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null,
    chartState: { profit: true, income: false, expense: false },
    currentPeriod: '1w',
    allTransactions: [],
    selectedTxId: null,

    // 1. SİSTEMİ BAŞLAT
    refreshDashboard: async function() {
        console.log("💰 Veriler işleniyor...");
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
        
        // Grafik çizimini hafif gecikmeli yap (DOM otursun)
        setTimeout(() => this.updateChartRender(), 100);
    },

    // 2. KASA VE İSTATİSTİK HESAPLAMA (DÜZELTİLDİ: Küçük yazılar çalışıyor)
    calculateStats: function(list) {
        const selectedCurr = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        
        let wTRY=0, wUSD=0, wEUR=0; 
        let tInc=0, tExp=0, tEsc=0;

        list.forEach(t => {
            const amt = parseFloat(t.amount);
            
            // KASA (Fiziksel)
            if(t.type==='income') {
                if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt;
            } else if (t.type==='expense') {
                if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt;
            }

            // İSTATİSTİK (Ciro/Gider) - Kur dönüşümü hariç
            const isExchange = t.category && t.category.includes('exchange');
            const valInTarget = (amt * (this.liveRates[t.currency]||1)) / this.liveRates[selectedCurr];

            if (!isExchange && !t.is_escrow) {
                if (t.type === 'income') tInc += valInTarget;
                if (t.type === 'expense') tExp += valInTarget;
            }
            if (t.is_escrow) tEsc += valInTarget;
        });

        // Kasaları Yaz
        this.updateText('wallet-try', this.fmt(wTRY, 'TRY'));
        this.updateText('wallet-usd', this.fmt(wUSD, 'USD'));
        this.updateText('wallet-eur', this.fmt(wEUR, 'EUR'));
        
        // --- DÜZELTME: KÜÇÜK YAZILAR (TL KARŞILIĞI) ---
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

    // 3. GRAFİK MOTORU (DÜZELTİLDİ: Tarih formatı)
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
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(c) { return c.dataset.label + ': ' + new Intl.NumberFormat('tr-TR', { style: 'currency', currency: targetCurrency }).format(c.raw); } } } },
                scales: { y: { beginAtZero: true } }
            }
        });
    },

    // 4. TABLO (Çift Tıklama Detayı Aktif)
    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
            let rowClass = 'row-expense', textClass = 'text-red', symbol = '-';
            
            if (t.type === 'income') { rowClass = 'row-income'; textClass = 'text-green'; symbol = '+'; }
            if (t.is_escrow) { rowClass = 'row-escrow'; textClass = 'text-orange'; symbol = ''; }
            if (t.category && t.category.includes('exchange')) { rowClass = 'row-exchange'; textClass = 'text-navy'; symbol = t.type==='income'?'+':'-'; }

            const row = `
                <tr class="${rowClass} row-hover" onclick="accounting.openTransactionDetail('${t.id}')" title="Detay için tıkla">
                    <td style="color:#64748b; font-size:12px; padding:15px;">${date}</td>
                    <td style="padding:15px; font-weight:600; color:#334155;">${t.description || '-'}</td>
                    <td style="padding:15px;"><span class="badge badge-gray">${this.translateCat(t.category)}</span></td>
                    <td style="padding:15px; text-align:right; font-weight:800; font-size:15px;" class="${textClass}">
                        ${symbol} ${this.fmt(t.amount, t.currency)}
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    },

    // YARDIMCI FONKSİYONLAR VE KAYIT (TÜMÜ GERİ YÜKLENDİ)
    filterChartDate: function(period, btn) { document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); this.currentPeriod = period; this.updateChartRender(); },
    toggleChartData: function(type, cardElement) { this.chartState[type] = !this.chartState[type]; if(this.chartState[type]) cardElement.classList.remove('inactive'); else cardElement.classList.add('inactive'); this.updateChartRender(); },
    translateCat: function(cat) { const dict = {'rent':'Kira','bills':'Fatura','food':'Yemek','consulate_fee':'Vize Harcı','salary':'Maaş','marketing':'Reklam','exchange_in':'Döviz Giriş','exchange_out':'Döviz Çıkış','escrow_deposit':'Emanet Girişi','visa_service':'Vize Geliri','extra_service':'Ek Hizmet'}; return dict[cat] || cat; },

    // --- KAYIT FONKSİYONLARI (ZORUNLU) ---
    saveExpense: async function(e) {
        e.preventDefault(); const form=e.target; const btn=form.querySelector('button'); btn.disabled=true;
        const cat = form.querySelector('select').value;
        const desc = form.querySelector('input[type="text"]').value;
        const amt = form.querySelector('input[type="number"]').value;
        const cur = form.querySelectorAll('select')[1].value;
        const { error } = await window.supabaseClient.from('transactions').insert([{ type: 'expense', category: cat, description: desc, amount: amt, currency: cur, is_escrow: false }]);
        if(!error) { window.ui.closeModal('modal-expense'); form.reset(); this.refreshDashboard(); } else alert(error.message); btn.disabled=false;
    },

    saveExtraIncome: async function(e) {
        e.preventDefault(); const form=e.target; const btn=form.querySelector('button'); btn.disabled=true;
        const customer = document.getElementById('ei-customer').value;
        const category = document.getElementById('ei-category').value;
        const amount = document.getElementById('ei-amount').value;
        const currency = document.getElementById('ei-currency').value;
        const desc = document.getElementById('ei-desc').value;
        const fullDesc = `${category.toUpperCase()} - ${customer} (${desc})`;
        const { error } = await window.supabaseClient.from('transactions').insert({ type: 'income', category: 'extra_service', description: fullDesc, amount: amount, currency: currency, is_escrow: false });
        if(!error) { window.ui.closeModal('modal-extra-income'); form.reset(); this.refreshDashboard(); } else alert(error.message); btn.disabled=false;
    },

    saveEscrow: async function(e) {
        e.preventDefault(); const btn=e.target.querySelector('button'); btn.disabled=true;
        const customer = document.getElementById('esc-customer').value;
        const category = document.getElementById('esc-category').value;
        const amount = document.getElementById('esc-amount').value;
        const currency = document.getElementById('esc-currency').value;
        const date = document.getElementById('esc-date').value;
        const desc = document.getElementById('esc-desc').value;
        const fullDesc = `${customer} - ${category.toUpperCase()} (Tarih: ${date}) - ${desc}`;
        const { error } = await window.supabaseClient.from('transactions').insert({ type: 'income', category: 'escrow_deposit', description: fullDesc, amount: amount, currency: currency, is_escrow: true });
        if(!error) { window.ui.closeModal('modal-escrow'); document.getElementById('form-escrow').reset(); this.refreshDashboard(); alert("✅ Emanet alındı."); } else alert(error.message); btn.disabled=false;
    },

    saveExchange: async function(e) { 
        e.preventDefault(); const btn=e.target.querySelector('button'); btn.disabled=true;
        const outA=document.getElementById('ex-amount-out').value, outC=document.getElementById('ex-currency-out').value;
        const inA=document.getElementById('ex-amount-in').value, inC=document.getElementById('ex-currency-in').value;
        const desc=document.getElementById('ex-desc').value;
        await window.supabaseClient.from('transactions').insert([
            {type:'expense', category:'exchange_out', description:`Döviz Bozum (${desc})`, amount:outA, currency:outC},
            {type:'income', category:'exchange_in', description:`Döviz Giriş (${desc})`, amount:inA, currency:inC}
        ]);
        window.ui.closeModal('modal-exchange'); this.refreshDashboard(); btn.disabled=false; 
    },

    // --- DETAY VE SİLME ---
    openTransactionDetail: function(txId) {
        const tx = this.allTransactions.find(t => t.id === txId); if(!tx) return;
        this.selectedTxId = txId;
        document.getElementById('td-date').innerText = new Date(tx.created_at).toLocaleString('tr-TR');
        document.getElementById('td-desc').innerText = tx.description;
        document.getElementById('td-cat').innerText = this.translateCat(tx.category);
        document.getElementById('td-amount').innerText = this.fmt(tx.amount, tx.currency);
        document.getElementById('td-id').innerText = tx.id;
        window.ui.openModal('modal-transaction-detail');
    },
    
    deleteTransaction: async function() {
        if(!this.selectedTxId) return;
        if(!confirm("Silmek istediğine emin misin?")) return;
        const { error } = await window.supabaseClient.from('transactions').delete().eq('id', this.selectedTxId);
        if(!error) { window.ui.closeModal('modal-transaction-detail'); this.refreshDashboard(); }
    },

    openEscrowDetails: async function() {
        window.ui.openModal('modal-escrow-details');
        const { data: list } = await window.supabaseClient.from('transactions').select('*').eq('is_escrow', true).order('created_at', {ascending:false});
        let html=''; if(list) list.forEach(t => { html += `<tr><td>${new Date(t.created_at).toLocaleDateString()}</td><td>${t.description}</td><td style="font-weight:bold; color:#f59e0b;">${this.fmt(t.amount, t.currency)}</td><td><span class="badge badge-escrow">Emanet</span></td></tr>`; });
        document.getElementById('escrow-list-body').innerHTML = html || '<tr><td colspan="4">Veri yok</td></tr>';
    },

    updateText: function(id, t) { const el = document.getElementById(id); if(el) el.innerText = t; },
    fmt: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); }
};

window.addEventListener('load', () => {
    window.accounting.refreshDashboard();
    if(document.getElementById('form-exchange')) document.getElementById('form-exchange').onsubmit = window.accounting.saveExchange;
    if(document.getElementById('form-expense')) document.getElementById('form-expense').onsubmit = window.accounting.saveExpense;
    if(document.getElementById('form-escrow')) document.getElementById('form-escrow').onsubmit = window.accounting.saveEscrow;
    if(document.getElementById('form-extra-income')) document.getElementById('form-extra-income').onsubmit = window.accounting.saveExtraIncome;
});
