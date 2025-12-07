// js/accounting.js - GRAFİK MOTORU TAMİRİ (FİNAL VERSİYON)

window.accounting = {
    
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null,
    chartState: { profit: true, income: false, expense: false },
    currentPeriod: '1w',
    allTransactions: [], // Tüm veriyi burada tutacağız

    // 1. BAŞLATMA
    refreshDashboard: async function() {
        console.log("💰 Sistem yenileniyor...");
        
        // Kurları Çek (Hata olsa da devam et)
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const d = await res.json();
            this.liveRates = { TRY: 1, USD: (1/d.rates.USD), EUR: (1/d.rates.EUR) };
            if(document.getElementById('live-rates-display')) 
                document.getElementById('live-rates-display').innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
        } catch (e) {}

        // Verileri Çek
        const { data: list, error } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return;
        this.allTransactions = list; 

        // Hesaplamalar
        this.calculateStats(list);
        this.renderTable(list.slice(0, 10));
        
        // Grafiği Çiz (Önemli: Biraz bekletip çizelim ki DOM otursun)
        setTimeout(() => this.updateChartRender(), 100);
    },

    // 2. KASA VE İSTATİSTİK
    calculateStats: function(list) {
        const selectedCurr = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        
        let wTRY=0, wUSD=0, wEUR=0; 
        let tInc=0, tExp=0, tEsc=0;

        list.forEach(t => {
            const amt = parseFloat(t.amount);
            // Kasa (Fiziksel)
            if(t.type==='income') {
                if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt;
            } else if (t.type==='expense') {
                if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt;
            }

            // İstatistik (Ciro/Gider) - Kur dönüşümü hariç
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
        
        // Toplam Varlık
        const totalEquity = (wTRY + (wUSD*this.liveRates.USD) + (wEUR*this.liveRates.EUR)) / this.liveRates[selectedCurr];
        this.updateText('total-equity', this.fmt(totalEquity, selectedCurr));

        // Kartlar
        this.updateText('money-profit', this.fmt(tInc-tExp, selectedCurr));
        this.updateText('money-income', this.fmt(tInc, selectedCurr));
        this.updateText('money-expense', this.fmt(tExp, selectedCurr));
        this.updateText('money-escrow', this.fmt(tEsc, selectedCurr));
    },

    // 3. GRAFİK MOTORU (DÜZELTİLDİ)
    updateChartRender: function() {
        const ctx = document.getElementById('financeChart');
        if (!ctx) return;
        
        const targetCurrency = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        const now = new Date();
        let startTime = new Date();
        let timeFormat = 'day';

        // Zaman Aralığı
        if(this.currentPeriod === '24h') { startTime.setHours(now.getHours() - 24); timeFormat = 'hour'; }
        if(this.currentPeriod === '1w') { startTime.setDate(now.getDate() - 7); timeFormat = 'day'; }
        if(this.currentPeriod === '1m') { startTime.setDate(now.getDate() - 30); timeFormat = 'day'; }
        if(this.currentPeriod === '6m') { startTime.setMonth(now.getMonth() - 6); timeFormat = 'month'; }
        if(this.currentPeriod === '1y') { startTime.setFullYear(now.getFullYear() - 1); timeFormat = 'month'; }
        if(this.currentPeriod === 'all') { startTime = new Date(0); timeFormat = 'month'; }

        // Veriyi Hazırla (Sıralı)
        // Kur dönüşümü ve Emanet hariç
        const filteredData = this.allTransactions
            .filter(t => new Date(t.created_at) >= startTime && !t.is_escrow && !(t.category && t.category.includes('exchange')))
            .sort((a,b) => new Date(a.created_at) - new Date(b.created_at));

        let labels = [], incomeData = [], expenseData = [], profitData = [];
        let grouped = {};

        // Verileri Grupla
        filteredData.forEach(t => {
            const d = new Date(t.created_at);
            let key = '';
            
            if(timeFormat === 'hour') key = d.getHours() + ":00";
            else if(timeFormat === 'day') key = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
            else if(timeFormat === 'month') key = d.toLocaleDateString('tr-TR', { month: 'long' });

            if(!grouped[key]) grouped[key] = { income: 0, expense: 0 };

            // Çeviri
            const val = (parseFloat(t.amount) * (this.liveRates[t.currency] || 1)) / this.liveRates[targetCurrency];
            
            if(t.type === 'income') grouped[key].income += val;
            else if(t.type === 'expense') grouped[key].expense += val;
        });

        // Grafik Noktalarını Oluştur
        Object.keys(grouped).forEach(key => {
            labels.push(key);
            incomeData.push(grouped[key].income);
            expenseData.push(grouped[key].expense);
            profitData.push(grouped[key].income - grouped[key].expense);
        });

        // Eğer veri yoksa boş grafik yerine düz çizgi göster (Görsel bozulmasın)
        if(labels.length === 0) { 
            labels=["Veri Yok"]; incomeData=[0]; expenseData=[0]; profitData=[0]; 
        }

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

    // Diğer Fonksiyonlar (Aynı Kalıyor)
    filterChartDate: function(period, btn) { 
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active')); 
        btn.classList.add('active'); 
        this.currentPeriod = period; 
        this.updateChartRender(); 
    },
    toggleChartData: function(type, cardElement) { 
        this.chartState[type] = !this.chartState[type]; 
        if(this.chartState[type]) { cardElement.classList.remove('inactive'); } 
        else { cardElement.classList.add('inactive'); }
        this.updateChartRender();
    },
    
    // TABLO (Renkli)
    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body'); if(!tbody) return; tbody.innerHTML = '';
        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
            let rowClass = 'row-expense', textClass = 'text-red', symbol = '-';
            
            if (t.type === 'income') { rowClass = 'row-income'; textClass = 'text-green'; symbol = '+'; }
            if (t.is_escrow) { rowClass = 'row-escrow'; textClass = 'text-orange'; symbol = ''; }
            if (t.category && t.category.includes('exchange')) { rowClass = 'row-exchange'; textClass = 'text-navy'; symbol = t.type==='income'?'+':'-'; }

            const row = `<tr class="${rowClass}" style="cursor:pointer;" ondblclick="accounting.openTransactionDetail('${t.id}')">
                <td style="color:#64748b; font-size:12px; padding:15px;">${date}</td>
                <td style="padding:15px; font-weight:600; color:#334155;">${t.description || '-'}</td>
                <td style="padding:15px;"><span class="badge badge-gray">${this.translateCat(t.category)}</span></td>
                <td style="padding:15px; text-align:right; font-weight:800;" class="${textClass}">${symbol} ${this.fmt(t.amount, t.currency)}</td>
            </tr>`;
            tbody.innerHTML += row;
        });
    },

    // Detay ve Silme
    openTransactionDetail: function(txId) {
        const tx = this.allTransactions.find(t => t.id === txId);
        if(!tx) return;
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

    // Kategori Çeviri
    translateCat: function(cat) {
        const dict = {'rent':'Kira','bills':'Fatura','food':'Yemek','consulate_fee':'Vize Harcı','salary':'Maaş','marketing':'Reklam','exchange_in':'Döviz Giriş','exchange_out':'Döviz Çıkış'};
        return dict[cat] || cat;
    },

    // Emanet
    openEscrowDetails: async function() {
        window.ui.openModal('modal-escrow-details');
        const { data: list } = await window.supabaseClient.from('transactions').select('*').eq('is_escrow', true).order('created_at', {ascending:false});
        let pEUR=0, pUSD=0, pTRY=0, html='';
        if(list) list.forEach(t => {
            const amt = parseFloat(t.amount);
            if(t.currency==='EUR') pEUR+=amt; if(t.currency==='USD') pUSD+=amt; if(t.currency==='TRY') pTRY+=amt;
            html += `<tr><td>${new Date(t.created_at).toLocaleDateString()}</td><td>${t.description}</td><td style="font-weight:bold; color:#f59e0b;">${this.fmt(amt, t.currency)}</td><td><span class="badge bg-orange-light">Emanet</span></td></tr>`;
        });
        document.getElementById('escrow-list-body').innerHTML = html || '<tr><td colspan="4">Veri yok</td></tr>';
        this.updateText('pool-eur', this.fmt(pEUR, 'EUR')); this.updateText('pool-usd', this.fmt(pUSD, 'USD')); this.updateText('pool-try', this.fmt(pTRY, 'TRY'));
    },

    // Kayıtlar (Aynı)
    saveExpense: async function(e) { e.preventDefault(); this.genericSave(e, 'expense', 'modal-expense'); },
    // EMANET KAYDET (GÜNCELLENMİŞ)
    saveEscrow: async function(event) {
        event.preventDefault();
        const btn = event.target.querySelector('button'); 
        btn.disabled = true; btn.innerHTML = "Kaydediliyor...";

        // Form Verilerini Al
        const customer = document.getElementById('esc-customer').value;
        const category = document.getElementById('esc-category').value; // emanet türü
        const amount = document.getElementById('esc-amount').value;
        const currency = document.getElementById('esc-currency').value;
        const date = document.getElementById('esc-date').value;
        const desc = document.getElementById('esc-desc').value;

        // Açıklamayı birleştir (Müşteri + Tür + Tarih)
        const fullDescription = `${customer} - ${category.toUpperCase()} (Tarih: ${date}) - ${desc}`;

        const { error } = await window.supabaseClient.from('transactions').insert({
            type: 'income', // Kasaya girdiği için income gibi davranır
            category: 'escrow_deposit', 
            description: fullDescription, 
            amount: amount, 
            currency: currency, 
            is_escrow: true, // Emanet olduğunu işaretle
            created_at: new Date()
        });

        if(!error) {
            window.ui.closeModal('modal-escrow'); 
            document.getElementById('form-escrow').reset(); 
            window.accounting.refreshDashboard();
            alert("✅ Emanet başarıyla kaydedildi.");
        } else { 
            alert("Hata: " + error.message); 
        }
        btn.disabled = false; btn.innerHTML = '<span class="material-icons-round">save_alt</span> EMANETİ KASAYA AL';
    },
    saveExtraIncome: async function(e) { e.preventDefault(); this.genericSave(e, 'income', 'modal-extra-income'); },
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
    genericSave: async function(e, type, modalId) {
        const form = e.target; const btn = form.querySelector('button'); btn.disabled=true;
        const cat = form.querySelector('select')?.value || 'general';
        const desc = form.querySelector('input[type="text"]').value;
        const amt = form.querySelector('input[type="number"]').value;
        const cur = form.querySelectorAll('select')[1].value;
        await window.supabaseClient.from('transactions').insert([{
            type: type === 'escrow' ? 'income' : type, category: type==='escrow'?'escrow_deposit':cat,
            description: desc, amount: amt, currency: cur, is_escrow: type==='escrow'
        }]);
        window.ui.closeModal(modalId); form.reset(); this.refreshDashboard(); btn.disabled=false;
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
