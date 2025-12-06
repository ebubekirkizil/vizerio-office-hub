// js/accounting.js - CANLI KASA, AKILLI GRAFİK ve RENKLİ TABLO (FİNAL)

window.accounting = {
    
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null,
    chartState: { profit: true, income: false, expense: false },
    currentPeriod: '1w', // Varsayılan: 1 Hafta
    allTransactions: [], // Tüm veriyi burada tutacağız

    // 1. BAŞLATMA
    refreshDashboard: async function() {
        console.log("💰 Sistem yenileniyor...");
        
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
        this.allTransactions = list; // Hafızaya al (Grafik için lazım)

        // Hesaplamalar (Kasa ve İstatistik)
        let wTRY=0, wUSD=0, wEUR=0, tInc=0, tExp=0, tEsc=0;
        
        list.forEach(t => {
            const amt = parseFloat(t.amount);
            // Gelir
            if(t.type==='income') {
                if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt;
                if(!t.is_escrow) tInc += amt * (this.liveRates[t.currency]||1);
            } 
            // Gider
            else if (t.type==='expense') {
                if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt;
                tExp += amt * (this.liveRates[t.currency]||1);
            }
            // Emanet
            if(t.is_escrow) {
                if(t.currency==='EUR') tEsc+=amt; else tEsc+=(amt/this.liveRates.EUR);
            }
        });

        // Ekrana Yaz
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

        // Tabloyu Doldur (Renkler korundu)
        this.renderTable(list.slice(0, 10));
        
        // Grafiği Çiz (Akıllı Mod)
        this.updateChartRender();
    },

    // 2. AKILLI GRAFİK MOTORU (DÜZELTİLDİ)
    updateChartRender: function() {
        const ctx = document.getElementById('financeChart');
        if (!ctx) return;
        
        // Zaman Filtresi Mantığı
        const now = new Date();
        let startTime = new Date();
        let timeFormat = 'day'; // hour, day, month

        if(this.currentPeriod === '24h') { startTime.setHours(now.getHours() - 24); timeFormat = 'hour'; }
        if(this.currentPeriod === '1w') { startTime.setDate(now.getDate() - 7); timeFormat = 'day'; }
        if(this.currentPeriod === '1m') { startTime.setDate(now.getDate() - 30); timeFormat = 'day'; }
        if(this.currentPeriod === '6m') { startTime.setMonth(now.getMonth() - 6); timeFormat = 'month'; }
        if(this.currentPeriod === '1y') { startTime.setFullYear(now.getFullYear() - 1); timeFormat = 'month'; }
        if(this.currentPeriod === 'all') { startTime = new Date(0); timeFormat = 'month'; }

        // Verileri filtrele ve eskiden yeniye sırala
        const filteredData = this.allTransactions
            .filter(t => new Date(t.created_at) >= startTime && !t.is_escrow)
            .sort((a,b) => new Date(a.created_at) - new Date(b.created_at));

        // Verileri Grupla (Labels ve Data)
        let labels = [];
        let incomeData = [];
        let expenseData = [];
        let profitData = [];
        let grouped = {};

        filteredData.forEach(t => {
            const d = new Date(t.created_at);
            let key = '';
            
            // Etiket Formatı (Saat, Gün veya Ay)
            if(timeFormat === 'hour') key = d.getHours() + ":00";
            else if(timeFormat === 'day') key = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }); // 12 Kas
            else if(timeFormat === 'month') key = d.toLocaleDateString('tr-TR', { month: 'long' }); // Ocak

            if(!grouped[key]) grouped[key] = { income: 0, expense: 0 };

            // TL'ye çevirip topla
            const val = parseFloat(t.amount) * (this.liveRates[t.currency] || 1);
            if(t.type === 'income') grouped[key].income += val;
            else if(t.type === 'expense') grouped[key].expense += val;
        });

        // Grafik Dizilerini Oluştur
        Object.keys(grouped).forEach(key => {
            labels.push(key);
            incomeData.push(grouped[key].income);
            expenseData.push(grouped[key].expense);
            profitData.push(grouped[key].income - grouped[key].expense);
        });

        // Boşsa boş grafik göster
        if(labels.length === 0) { labels = ["Veri Yok"]; incomeData=[0]; expenseData=[0]; profitData=[0]; }

        // Grafiği Yeniden Çiz
        if (this.chartInstance) this.chartInstance.destroy();

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
                plugins: { legend: { display: false } }, // Efsaneyi gizle (Kutucuklar var)
                scales: { y: { beginAtZero: true } }
            }
        });
    },

    // 3. ZAMAN FİLTRESİ BUTONLARI
    filterChartDate: function(period, btn) {
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentPeriod = period;
        this.updateChartRender(); // Grafiği yeniden hesapla ve çiz
    },

    // 4. KARTLARA TIKLAYINCA (TOGGLE)
    toggleChartData: function(type, cardElement) {
        this.chartState[type] = !this.chartState[type];
        if(this.chartState[type]) { 
            cardElement.classList.remove('inactive'); 
            let t = cardElement.querySelector('.card-title'); if(t) t.innerText = t.innerText.replace('(KAPALI)', '(AÇIK)');
        } else { 
            cardElement.classList.add('inactive'); 
            let t = cardElement.querySelector('.card-title'); if(t) t.innerText = t.innerText.replace('(AÇIK)', '(KAPALI)');
        }
        this.updateChartRender();
    },

    // 5. TABLO DOLDURMA (RENK MANTIĞI KORUNDU)
    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR', {day:'numeric', month:'long', hour:'2-digit', minute:'2-digit'});
            let rowClass = 'row-expense', textClass = 'text-red', symbol = '-';

            if (t.type === 'income') { rowClass = 'row-income'; textClass = 'text-green'; symbol = '+'; }
            if (t.is_escrow) { rowClass = 'row-escrow'; textClass = 'text-orange'; symbol = ''; }
            if (t.category && t.category.includes('exchange')) { rowClass = 'row-exchange'; textClass = 'text-navy'; symbol = t.type==='income'?'+':'-'; }

            const row = `
                <tr class="${rowClass}">
                    <td style="color:#64748b; font-size:12px; padding:15px;">${date}</td>
                    <td style="padding:15px; font-weight:600; color:#334155;">${t.description || '-'}</td>
                    <td style="padding:15px;"><span class="badge badge-gray">${t.category}</span></td>
                    <td style="padding:15px; text-align:right; font-weight:800; font-size:15px;" class="${textClass}">
                        ${symbol} ${this.fmt(t.amount, t.currency)}
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    },

    // 6. EMANET DETAYLARI
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

    // 7. KAYITLAR (AYNEN KORUNDU)
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
        const tData = { type: type === 'escrow' ? 'income' : type, category: type==='escrow'?'escrow_deposit':cat, description: desc, amount: amt, currency: cur, is_escrow: type==='escrow' };
        const { error } = await window.supabaseClient.from('transactions').insert([tData]);
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
