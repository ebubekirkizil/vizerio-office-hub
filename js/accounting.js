// js/accounting.js - CANLI KASA ve AKILLI GRAFİK MOTORU (FULL)

window.accounting = {
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    allTransactions: [], // Tüm veriyi hafızada tutacağız
    chartInstance: null,
    chartState: { profit: true, income: false, expense: false }, // Hangi çizgiler açık?
    currentPeriod: '1w', // Varsayılan zaman
    
    // 1. SİSTEMİ BAŞLAT
    refreshDashboard: async function() {
        console.log("💰 Veriler işleniyor...");
        
        // Kurları Çek
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const d = await res.json();
            this.liveRates = { TRY: 1, USD: (1/d.rates.USD), EUR: (1/d.rates.EUR) };
            if(document.getElementById('live-rates-display')) 
                document.getElementById('live-rates-display').innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
        } catch (e) { console.warn("Kur çekilemedi."); }

        // Verileri Çek
        const { data: list, error } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return;
        this.allTransactions = list; // Hafızaya al

        // Kasaları Hesapla (Dashboard Üstü)
        this.calculateWallets(list);

        // Tabloyu Doldur (Son 10)
        this.renderTable(list.slice(0, 10));
        
        // Grafiği Çiz (Varsayılan ayarlarla)
        this.updateChartRender();
    },

    // 2. KASA HESAPLAMA (Üst Kısım)
    calculateWallets: function(list) {
        let wTRY=0, wUSD=0, wEUR=0, tInc=0, tExp=0, tEsc=0;
        
        list.forEach(t => {
            const amt = parseFloat(t.amount);
            // Gelir
            if(t.type==='income') {
                if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt;
                if(!t.is_escrow) tInc += amt * (this.liveRates[t.currency]||1);
            } 
            // Gider
            else if(t.type==='expense') {
                if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt;
                tExp += amt * (this.liveRates[t.currency]||1);
            }
            // Emanet
            if(t.is_escrow) {
                if(t.currency==='EUR') tEsc+=amt; else tEsc+=(amt * (this.liveRates[t.currency]||1) / this.liveRates.EUR);
            }
        });

        this.updateText('wallet-try', this.fmt(wTRY, 'TRY'));
        this.updateText('wallet-usd', this.fmt(wUSD, 'USD'));
        this.updateText('wallet-eur', this.fmt(wEUR, 'EUR'));
        this.updateText('val-usd', `≈ ${this.fmt(wUSD*this.liveRates.USD, 'TRY')}`);
        this.updateText('val-eur', `≈ ${this.fmt(wEUR*this.liveRates.EUR, 'TRY')}`);
        this.updateText('total-equity', this.fmt(wTRY+(wUSD*this.liveRates.USD)+(wEUR*this.liveRates.EUR), 'TRY'));

        this.updateText('money-profit', this.fmt(tInc-tExp, 'TRY'));
        this.updateText('money-income', this.fmt(tInc, 'TRY'));
        this.updateText('money-expense', this.fmt(tExp, 'TRY'));
        this.updateText('money-escrow', this.fmt(tEsc, 'EUR'));
    },

    // 3. GRAFİK MOTORU (EN KRİTİK KISIM)
    updateChartRender: function() {
        const ctx = document.getElementById('financeChart');
        if (!ctx) return;
        
        // Seçili Para Birimi
        const targetCurrency = document.getElementById('chart-currency').value; // TRY, USD, EUR
        const targetRate = this.liveRates[targetCurrency] || 1; // TRY ise 1, USD ise 34.5

        // Zaman Filtresi ve Gruplama
        const now = new Date();
        let labels = [];
        let dataMap = {}; // { "Pzt": {income:0, expense:0}, "Sal":... }

        // Tarih Aralığı Belirle
        let startTime = new Date();
        let formatType = 'day'; // hour, day, month

        if(this.currentPeriod === '24h') { startTime.setHours(now.getHours() - 24); formatType = 'hour'; }
        if(this.currentPeriod === '1w') { startTime.setDate(now.getDate() - 7); formatType = 'day'; }
        if(this.currentPeriod === '1m') { startTime.setDate(now.getDate() - 30); formatType = 'day'; }
        if(this.currentPeriod === '6m') { startTime.setMonth(now.getMonth() - 6); formatType = 'month'; }
        if(this.currentPeriod === '1y') { startTime.setFullYear(now.getFullYear() - 1); formatType = 'month'; }
        if(this.currentPeriod === 'all') { startTime = new Date(0); formatType = 'month'; } // 1970'ten beri

        // Filtrelenmiş Veriyi İşle
        const filteredList = this.allTransactions.filter(t => new Date(t.created_at) >= startTime);

        // Verileri Grupla (Kova Mantığı)
        // Önce boş kovaları hazırla ki grafik boşluklu olmasın
        // (Şimdilik basitlik için sadece var olan verileri dizeceğiz ama sıralı olması lazım)
        // Sıralı gitmek için: transactions zaten tarihe göre sıralı (created_at desc).
        // Grafikte soldan sağa (eskiden yeniye) gitmeli.
        const sortedList = [...filteredList].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));

        let labelsSet = new Set();
        let incomeData = [], expenseData = [], profitData = [];
        let tempMap = {};

        sortedList.forEach(t => {
            if(t.is_escrow) return; // Emanet grafiğe girmez

            const date = new Date(t.created_at);
            let label = '';

            // Zaman Etiketi Oluştur
            if(formatType === 'hour') label = date.getHours() + ":00";
            else if(formatType === 'day') label = date.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' }); // Pzt 12
            else if(formatType === 'month') label = date.toLocaleDateString('tr-TR', { month: 'long' }); // Ocak

            if(!tempMap[label]) tempMap[label] = { income: 0, expense: 0 };

            // Tutarı Hedef Para Birimine Çevir
            // Formül: (Tutar * KendiKuru) / HedefKur
            // Örn: 100 USD -> TRY (100 * 34) / 1 = 3400 TL
            // Örn: 3400 TL -> USD (3400 * 1) / 34 = 100 USD
            const amountInTRY = parseFloat(t.amount) * (this.liveRates[t.currency] || 1);
            const amountInTarget = amountInTRY / this.liveRates[targetCurrency]; // Hedef kura bölüyoruz çünkü liveRates '1 Birim = X TL' tutuyor. 
            // Düzeltme: liveRates {USD: 34} means 1 USD = 34 TRY.
            // Converting TRY to USD: Amount / 34.
            
            if(t.type === 'income') tempMap[label].income += amountInTarget;
            else if(t.type === 'expense') tempMap[label].expense += amountInTarget;
        });

        // Map'ten Array'e Dönüştür
        Object.keys(tempMap).forEach(lbl => {
            labels.push(lbl);
            let inc = tempMap[lbl].income;
            let exp = tempMap[lbl].expense;
            incomeData.push(inc);
            expenseData.push(exp);
            profitData.push(inc - exp);
        });

        // Grafik Oluştur
        if(this.chartInstance) this.chartInstance.destroy();

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { 
                        label: 'Net Kâr', data: profitData, 
                        borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4,
                        hidden: !this.chartState.profit 
                    },
                    { 
                        label: 'Ciro', data: incomeData, 
                        borderColor: '#3b82f6', borderDash: [5, 5], tension: 0.4,
                        hidden: !this.chartState.income 
                    },
                    { 
                        label: 'Gider', data: expenseData, 
                        borderColor: '#ef4444', tension: 0.4,
                        hidden: !this.chartState.expense 
                    }
                ]
            },
            options: { 
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { 
                    legend: { display: false },
                    tooltip: { 
                        callbacks: { 
                            label: function(context) {
                                return context.dataset.label + ': ' + new Intl.NumberFormat('tr-TR', { style: 'currency', currency: targetCurrency }).format(context.raw);
                            }
                        }
                    }
                },
                scales: { y: { beginAtZero: true } }
            }
        });
    },

    // Zaman Butonları
    filterChartDate: function(period, btn) {
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentPeriod = period;
        this.updateChartRender();
    },

    // Kartlara Tıklama (Toggle)
    toggleChartData: function(type, cardElement) {
        this.chartState[type] = !this.chartState[type];
        if(this.chartState[type]) {
            cardElement.classList.remove('inactive');
            let title = cardElement.querySelector('.card-title');
            if(title) title.innerText = title.innerText.replace('(AÇIK)', '(KAPALI)').replace('(KAPALI)', '(AÇIK)'); // Basit toggle
        } else {
            cardElement.classList.add('inactive');
            let title = cardElement.querySelector('.card-title');
            if(title) title.innerText = title.innerText.replace('(AÇIK)', '(KAPALI)');
        }
        this.updateChartRender();
    },

    // TABLO VE EMANET (Aynı kaldı, sadece renkler eklendi)
    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR', {day:'numeric', month:'long', hour:'2-digit', minute:'2-digit'});
            let rowClass = 'row-expense', symbol = '-', colorClass = 'text-red';
            if (t.type === 'income') { rowClass = 'row-income'; symbol = '+'; colorClass = 'text-green'; }
            if (t.is_escrow) { rowClass = 'row-escrow'; symbol = ''; colorClass = 'text-orange'; }
            if (t.category && t.category.includes('exchange')) { rowClass = 'row-exchange'; colorClass = 'text-indigo'; }

            const row = `<tr class="${rowClass}">
                <td style="color:#64748b; font-size:12px; padding:15px;">${date}</td>
                <td style="padding:15px; font-weight:600; color:#334155;">${t.description || '-'}</td>
                <td style="padding:15px;"><span class="badge badge-gray">${t.category}</span></td>
                <td style="padding:15px; text-align:right; font-weight:800; class="${colorClass}">${symbol} ${this.fmt(t.amount, t.currency)}</td>
            </tr>`;
            tbody.innerHTML += row;
        });
    },

    // EMANET DETAYLARI
    openEscrowDetails: async function() {
        window.ui.openModal('modal-escrow-details');
        const tbody = document.getElementById('escrow-list-body');
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Veriler...</td></tr>';
        const { data: list } = await window.supabaseClient.from('transactions').select('*').eq('is_escrow', true).order('created_at', {ascending:false});
        let pEUR=0, pUSD=0, pTRY=0; tbody.innerHTML = '';
        if(list) list.forEach(t => {
            const amt = parseFloat(t.amount);
            if(t.currency==='EUR') pEUR+=amt; if(t.currency==='USD') pUSD+=amt; if(t.currency==='TRY') pTRY+=amt;
            tbody.innerHTML += `<tr><td>${new Date(t.created_at).toLocaleDateString()}</td><td>${t.description}</td><td style="font-weight:bold; color:#f59e0b;">${this.fmt(amt, t.currency)}</td><td><span class="badge bg-orange-light">Emanette</span></td></tr>`;
        });
        this.updateText('pool-eur', this.fmt(pEUR, 'EUR'));
        this.updateText('pool-usd', this.fmt(pUSD, 'USD'));
        this.updateText('pool-try', this.fmt(pTRY, 'TRY'));
    },

    // KAYIT FONKSİYONLARI (Formlar için)
    saveExchange: async function(e) { 
        e.preventDefault(); const btn=e.target.querySelector('button'); btn.disabled=true;
        const outA=document.getElementById('ex-amount-out').value, outC=document.getElementById('ex-currency-out').value;
        const inA=document.getElementById('ex-amount-in').value, inC=document.getElementById('ex-currency-in').value;
        const desc=document.getElementById('ex-desc').value;
        const { error } = await window.supabaseClient.from('transactions').insert([
            {type:'expense', category:'exchange_out', description:`Döviz Bozum (${desc})`, amount:outA, currency:outC},
            {type:'income', category:'exchange_in', description:`Döviz Giriş (${desc})`, amount:inA, currency:inC}
        ]);
        if(!error) { window.ui.closeModal('modal-exchange'); this.refreshDashboard(); } else alert(error.message); btn.disabled=false; 
    },
    saveExpense: async function(e) { e.preventDefault(); this.genericSave(e, 'expense', 'modal-expense'); },
    saveEscrow: async function(e) { e.preventDefault(); this.genericSave(e, 'escrow', 'modal-escrow'); },
    saveExtraIncome: async function(e) { e.preventDefault(); this.genericSave(e, 'income', 'modal-extra-income'); },

    genericSave: async function(e, type, modalId) {
        const form = e.target; const btn = form.querySelector('button'); btn.disabled=true;
        const cat = form.querySelector('select')?.value || 'general';
        const desc = form.querySelector('input[type="text"]').value;
        const amt = form.querySelector('input[type="number"]').value;
        const cur = form.querySelectorAll('select')[1].value;
        const { error } = await window.supabaseClient.from('transactions').insert([{
            type: type === 'escrow' ? 'income' : type, category: type==='escrow'?'escrow_deposit':cat,
            description: desc, amount: amt, currency: cur, is_escrow: type==='escrow'
        }]);
        if(!error) { window.ui.closeModal(modalId); form.reset(); this.refreshDashboard(); } else alert(error.message); btn.disabled=false;
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
