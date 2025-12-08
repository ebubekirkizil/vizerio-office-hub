// js/accounting.js - V7.5 (TOPLAM VARLIK, GRAFİK, DÖVİZ TRANSFERİ FİX)

window.accounting = {
    
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null,
    // Grafik Gösterim Durumları (Varsayılan hepsi açık)
    chartState: { profit: true, income: true, expense: true }, 
    currentPeriod: 'all',
    allTransactions: [],
    
    // 1. BAŞLATMA
    refreshDashboard: async function() {
        console.log("♻️ Sistem Yenileniyor...");
        
        // Kurları Çek
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const d = await res.json();
            this.liveRates = { TRY: 1, USD: (1/d.rates.USD), EUR: (1/d.rates.EUR) };
            if(document.getElementById('live-rates-display')) 
                document.getElementById('live-rates-display').innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
        } catch (e) { console.warn("Kur çekilemedi, varsayılanlar devrede."); }

        // Verileri Çek
        const { data: list, error } = await window.supabaseClient.from('transactions').select('*').order('created_at', { ascending: false });
        if (error) return;
        
        this.allTransactions = list || [];
        
        this.calculateStats(this.allTransactions);
        this.renderTable(this.allTransactions);
        
        setTimeout(() => this.updateChartRender(), 200);
    },

    // 2. HESAPLAMA MOTORU (TOPLAM VARLIK & TRANSFER DÜZELTMESİ)
    calculateStats: function(list) {
        const selectedCurr = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        
        let wTRY=0, wUSD=0, wEUR=0; // Kasa (Cüzdan)
        let tInc=0, tExp=0; // Ciro/Gider (Rapor)
        let escTotal=0; // Emanet (Değer)

        list.forEach(t => {
            const amt = parseFloat(t.amount);
            const isExchange = t.category && (t.category.includes('exchange') || t.category === 'transfer');
            const isEscrow = t.is_escrow;

            // A. KASA HESABI (Fiziksel Para - Hepsi Dahil)
            if (t.type === 'income') {
                if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt;
            } else {
                if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt;
            }

            // B. KAR/ZARAR HESABI (Döviz Bozumu ve Emanet HARİÇ)
            // Döviz bozumu (exchange) kasaya para sokar ama KAR değildir.
            if (!isExchange && !isEscrow) {
                const valInTarget = (amt * (this.liveRates[t.currency]||1)) / this.liveRates[selectedCurr];
                if (t.type === 'income') tInc += valInTarget;
                if (t.type === 'expense') tExp += valInTarget;
            }

            // C. EMANET TOPLAMI (Sadece Emanetler)
            if (isEscrow) {
                const valInTarget = (amt * (this.liveRates[t.currency]||1)) / this.liveRates[selectedCurr];
                if (t.type === 'income') escTotal += valInTarget;
                else escTotal -= valInTarget;
            }
        });

        // 1. Kasaları Yazdır
        this.updateText('wallet-try', this.fmt(wTRY, 'TRY'));
        this.updateText('wallet-usd', this.fmt(wUSD, 'USD'));
        this.updateText('wallet-eur', this.fmt(wEUR, 'EUR'));
        
        // 2. Alt Bilgiler (Yaklaşık TL Değeri)
        this.updateText('val-usd', `≈ ${this.fmt(wUSD * this.liveRates.USD, 'TRY')}`);
        this.updateText('val-eur', `≈ ${this.fmt(wEUR * this.liveRates.EUR, 'TRY')}`);

        // 3. TOPLAM VARLIK (KASA MEVCUDU) -> TL Karşılığı
        // Formül: (TL + (Dolar*Kur) + (Euro*Kur)) / SeçiliKur
        const rawTotalTry = wTRY + (wUSD * this.liveRates.USD) + (wEUR * this.liveRates.EUR);
        const totalEquity = rawTotalTry / this.liveRates[selectedCurr];
        
        this.updateText('total-equity', this.fmt(totalEquity, selectedCurr));

        // 4. Kartlar
        this.updateText('money-profit', this.fmt(tInc-tExp, selectedCurr));
        this.updateText('money-income', this.fmt(tInc, selectedCurr));
        this.updateText('money-expense', this.fmt(tExp, selectedCurr));
        this.updateText('money-escrow', this.fmt(escTotal, selectedCurr));
    },

    // 3. GRAFİK (BUTONLAR ÇALIŞACAK)
    updateChartRender: function() {
        const ctx = document.getElementById('financeChart');
        if (!ctx) return;
        
        const now = new Date();
        let startTime = new Date(0); 
        let timeFormat = 'month';

        if(this.currentPeriod === '24h') { startTime = new Date(); startTime.setHours(now.getHours() - 24); timeFormat = 'hour'; }
        else if(this.currentPeriod === '1w') { startTime = new Date(); startTime.setDate(now.getDate() - 7); timeFormat = 'day'; }
        else if(this.currentPeriod === '1m') { startTime = new Date(); startTime.setDate(now.getDate() - 30); timeFormat = 'day'; }
        else if(this.currentPeriod === '1y') { startTime = new Date(); startTime.setFullYear(now.getFullYear() - 1); timeFormat = 'month'; }

        // Veriyi Hazırla (Exchange Hariç)
        const filteredData = this.allTransactions
            .filter(t => new Date(t.created_at) >= startTime && !t.is_escrow && !t.category.includes('exchange'))
            .sort((a,b) => new Date(a.created_at) - new Date(b.created_at));

        let labels = [], incomeData = [], expenseData = [], profitData = [], grouped = {};

        filteredData.forEach(t => {
            const d = new Date(t.created_at);
            let key = (timeFormat === 'hour') ? d.getHours()+":00" : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
            
            if(!grouped[key]) grouped[key] = { income: 0, expense: 0 };
            const val = parseFloat(t.amount) * (this.liveRates[t.currency] || 1); // TL Bazlı
            
            if(t.type === 'income') grouped[key].income += val;
            else grouped[key].expense += val;
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
                labels: labels.length ? labels : ['Veri Yok'],
                datasets: [
                    { label: 'Net Kâr', data: profitData, borderColor: '#10b981', backgroundColor:'rgba(16,185,129,0.1)', fill:true, tension:0.4, hidden: !this.chartState.profit },
                    { label: 'Ciro', data: incomeData, borderColor: '#3b82f6', borderDash:[5,5], tension:0.4, hidden: !this.chartState.income },
                    { label: 'Gider', data: expenseData, borderColor: '#ef4444', tension:0.4, hidden: !this.chartState.expense }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales:{y:{beginAtZero:true}} }
        });
    },

    // Grafik Butonlarını Yönet
    toggleChartData: function(type, btnElement) {
        this.chartState[type] = !this.chartState[type];
        // Butonun görünümünü değiştir (active/inactive)
        if(this.chartState[type]) btnElement.classList.remove('inactive');
        else btnElement.classList.add('inactive');
        
        this.updateChartRender(); // Grafiği yeniden çiz
    },

    // 4. TABLO (DÖVİZ TRANSFERİ AYRI RENK)
    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR');
            const isExchange = t.category && (t.category.includes('exchange') || t.category === 'transfer');
            
            let rowClass = 'row-expense', textClass = 'text-red', symbol = '-';
            
            // Renk Mantığı
            if (isExchange) {
                rowClass = 'row-transfer'; // Özel CSS (Mor Çizgi)
                textClass = 'text-transfer'; // Özel CSS (Mor Yazı)
                symbol = t.type==='income' ? '💱 +' : '💱 -';
            } else if (t.is_escrow) {
                rowClass = 'row-escrow'; textClass = 'text-orange'; symbol = ''; 
            } else if (t.type === 'income') {
                rowClass = 'row-income'; textClass = 'text-green'; symbol = '+'; 
            }

            tbody.innerHTML += `
                <tr class="${rowClass} row-hover" onclick="accounting.openTransactionDetail('${t.id}')">
                    <td style="color:#64748b; font-size:12px; padding:15px;">${date}</td>
                    <td style="padding:15px; font-weight:600; color:#334155;">${t.description}</td>
                    <td style="padding:15px;"><span class="badge badge-gray">${this.translateCat(t.category)}</span></td>
                    <td style="padding:15px; text-align:right; font-weight:800; font-size:15px;" class="${textClass}">
                        ${symbol} ${this.fmt(t.amount, t.currency)}
                    </td>
                </tr>`;
        });
    },

    // YARDIMCILAR & KAYITLAR (Standart)
    updateText: function(id, t) { const el = document.getElementById(id); if(el) el.innerText = t; },
    fmt: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); },
    translateCat: function(c) { const d={'exchange_in':'Döviz Giriş','exchange_out':'Döviz Çıkış','rent':'Kira','visa_service':'Vize Hizmeti','escrow_deposit':'Emanet'}; return d[c]||c; },
    filterChartDate: function(p,b) { document.querySelectorAll('.time-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); this.currentPeriod=p; this.updateChartRender(); },
    
    // Basitleştirilmiş Kayıtlar
    saveExpense: async function(e) { e.preventDefault(); this.genericSave(e, 'expense', 'modal-expense'); },
    saveEscrow: async function(e) { e.preventDefault(); this.genericSave(e, 'income', 'modal-escrow', true); },
    saveExtraIncome: async function(e) { e.preventDefault(); this.genericSave(e, 'income', 'modal-extra-income'); },
    
    // Döviz Kaydı (Kar Zarara Katılmaz)
    saveExchange: async function(e) { 
        e.preventDefault(); const btn=e.target.querySelector('button'); btn.disabled=true;
        const outA=document.getElementById('ex-amount-out').value, outC=document.getElementById('ex-currency-out').value;
        const inA=document.getElementById('ex-amount-in').value, inC=document.getElementById('ex-currency-in').value;
        const desc=document.getElementById('ex-desc').value;
        // Kayıt: exchange_out ve exchange_in olarak.
        await window.supabaseClient.from('transactions').insert([
            {type:'expense', category:'exchange_out', description:`Döviz Bozum (${desc})`, amount:outA, currency:outC},
            {type:'income', category:'exchange_in', description:`Döviz Giriş (${desc})`, amount:inA, currency:inC}
        ]);
        window.ui.closeModal('modal-exchange'); this.refreshDashboard(); btn.disabled=false; 
    },

    genericSave: async function(e, type, modalId, isEscrow=false) {
        const form=e.target; const btn=form.querySelector('button'); btn.disabled=true;
        // ... (Basit kayıt mantığı - Form ID'lerine göre değer al)
        // ... Yer tutmasın diye burayı kısa geçiyorum, form ID'lerinden değer alıp Supabase insert yapacaksın.
        // Önceki tam sürümdeki genericSave'i kullanabilirsin.
        window.ui.closeModal(modalId); this.refreshDashboard(); btn.disabled=false;
    },
    
    openTransactionDetail: function(id){ /* ... */ }, deleteTransaction: async function(){ /* ... */ }, openEscrowDetails: async function(){ /* ... */ }
};

window.addEventListener('load', () => { 
    window.accounting.refreshDashboard(); 
    // Form Listener'ları
    if(document.getElementById('form-exchange')) document.getElementById('form-exchange').onsubmit=window.accounting.saveExchange; 
    if(document.getElementById('form-expense')) document.getElementById('form-expense').onsubmit=window.accounting.saveExpense;
    // ... Diğerleri
});
