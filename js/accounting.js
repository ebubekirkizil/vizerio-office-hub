// js/accounting.js - VIZERIO PRO V7.1 (KURTARMA VE STABİLİZASYON SÜRÜMÜ)

window.accounting = {
    
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 }, // Yedek Kurlar
    chartInstance: null,
    chartState: { profit: true, income: false, expense: false },
    currentPeriod: 'all', // Varsayılan TÜMÜ (Veri kaybını önler)
    allTransactions: [],
    filteredTransactions: [],
    selectedTxId: null,
    currentUserEmail: 'Yetkili Personel',

    // 1. BAŞLATMA VE VERİ ÇEKME (GÜÇLENDİRİLMİŞ)
    refreshDashboard: async function() {
        console.log("🚀 Sistem Başlatılıyor...");
        
        // Kullanıcıyı Bul
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if(user && user.email) this.currentUserEmail = user.email;

        // Kurları Çek (Hata olursa devam et)
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const d = await res.json();
            this.liveRates = { TRY: 1, USD: (1/d.rates.USD), EUR: (1/d.rates.EUR) };
            if(document.getElementById('live-rates-display')) 
                document.getElementById('live-rates-display').innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
        } catch (e) { console.warn("Kur servisine ulaşılamadı, yedek kurlar devrede."); }

        // Verileri Çek (Limit yok, hepsi gelsin)
        const { data: list, error } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Veri Hatası:", error);
            alert("Veriler çekilemedi! İnternet bağlantınızı kontrol edin.");
            return;
        }
        
        this.allTransactions = list || [];
        this.filteredTransactions = list || [];

        // Hesapla ve Çiz
        this.calculateStats(this.allTransactions);
        this.renderTable(this.filteredTransactions);
        
        // Grafiği çiz (Hafif gecikmeli)
        setTimeout(() => this.updateChartRender(), 200);
    },

    // 2. KASA VE İSTATİSTİK (MATEMATİK DÜZELTİLDİ)
    calculateStats: function(list) {
        const selectedCurr = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        
        let wTRY=0, wUSD=0, wEUR=0; // Kasa (Fiziksel)
        let escTRY=0, escUSD=0, escEUR=0; // Emanet Havuzu
        let tInc=0, tExp=0; // Ciro/Gider (Rapor)

        list.forEach(t => {
            const amt = parseFloat(t.amount);
            
            // A. EMANET İŞLEMLERİ
            if (t.is_escrow) {
                // Emanet Bakiyesi Hesapla
                if (t.type === 'income') { // Giriş
                    if(t.currency==='TRY') escTRY += amt;
                    if(t.currency==='USD') escUSD += amt;
                    if(t.currency==='EUR') escEUR += amt;
                } else { // Çıkış
                    if(t.currency==='TRY') escTRY -= amt;
                    if(t.currency==='USD') escUSD -= amt;
                    if(t.currency==='EUR') escEUR -= amt;
                }
            }

            // B. KASA (CÜZDAN) HESABI (Fiziksel Para)
            // Emanet de olsa, normal de olsa para kasaya girer/çıkar
            if (t.type === 'income') {
                if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt;
            } else if (t.type==='expense') {
                if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt;
            }

            // C. RAPOR (CİRO/GİDER) - Emanet ve Kur Dönüşümü HARİÇ
            const isExchange = t.category && t.category.includes('exchange');
            const valInTarget = (amt * (this.liveRates[t.currency]||1)) / this.liveRates[selectedCurr];

            if (!isExchange && !t.is_escrow) {
                if (t.type === 'income') tInc += valInTarget;
                if (t.type === 'expense') tExp += valInTarget;
            }
        });

        // Kasaları Yaz
        this.updateText('wallet-try', this.fmt(wTRY, 'TRY'));
        this.updateText('wallet-usd', this.fmt(wUSD, 'USD'));
        this.updateText('wallet-eur', this.fmt(wEUR, 'EUR'));
        
        // Küçük Yazılar
        const usdValInTry = wUSD * this.liveRates.USD;
        const eurValInTry = wEUR * this.liveRates.EUR;
        this.updateText('val-usd', `≈ ${this.fmt(usdValInTry, 'TRY')}`);
        this.updateText('val-eur', `≈ ${this.fmt(eurValInTry, 'TRY')}`);
        
        // Toplam Varlık (Emanet Dahil Her Şey)
        const totalEquity = (wTRY + (wUSD*this.liveRates.USD) + (wEUR*this.liveRates.EUR)) / this.liveRates[selectedCurr];
        this.updateText('total-equity', this.fmt(totalEquity, selectedCurr));

        // Emanet Toplamı (Seçili kurda)
        const totalEscrowVal = (escTRY / this.liveRates[selectedCurr]) + 
                               (escUSD * this.liveRates.USD / this.liveRates[selectedCurr]) + 
                               (escEUR * this.liveRates.EUR / this.liveRates[selectedCurr]);

        this.updateText('money-profit', this.fmt(tInc-tExp, selectedCurr));
        this.updateText('money-income', this.fmt(tInc, selectedCurr));
        this.updateText('money-expense', this.fmt(tExp, selectedCurr));
        this.updateText('money-escrow', this.fmt(totalEscrowVal, selectedCurr));

        // Modal İçi Emanet Değerlerini Güncelle (Varsa)
        if(document.getElementById('esc-total-eur')) {
            document.getElementById('esc-total-eur').innerText = this.fmt(escEUR, 'EUR');
            document.getElementById('esc-total-usd').innerText = this.fmt(escUSD, 'USD');
            document.getElementById('esc-total-try').innerText = this.fmt(escTRY, 'TRY');
        }
    },

    // 3. GRAFİK MOTORU (GÜVENLİ MOD)
    updateChartRender: function() {
        const ctx = document.getElementById('financeChart');
        if (!ctx) return;
        
        const targetCurrency = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        const now = new Date();
        let startTime = new Date(0); // 1970 (Tümü)
        let timeFormat = 'month';

        // Zaman Filtresi
        if(this.currentPeriod === '24h') { startTime = new Date(); startTime.setHours(now.getHours() - 24); timeFormat = 'hour'; }
        else if(this.currentPeriod === '1w') { startTime = new Date(); startTime.setDate(now.getDate() - 7); timeFormat = 'day'; }
        else if(this.currentPeriod === '1m') { startTime = new Date(); startTime.setDate(now.getDate() - 30); timeFormat = 'day'; }
        else if(this.currentPeriod === '1y') { startTime = new Date(); startTime.setFullYear(now.getFullYear() - 1); timeFormat = 'month'; }

        // Veriyi Hazırla (Emanet ve Kur Dönüşümü Hariç)
        const filteredData = this.allTransactions
            .filter(t => new Date(t.created_at) >= startTime && !t.is_escrow && !(t.category && t.category.includes('exchange')))
            .sort((a,b) => new Date(a.created_at) - new Date(b.created_at));

        let labels = [], incomeData = [], expenseData = [], profitData = [], grouped = {};

        filteredData.forEach(t => {
            const d = new Date(t.created_at);
            let key = '';
            
            // Basit Tarih Formatı
            if(timeFormat === 'hour') key = d.getHours() + ":00";
            else if(timeFormat === 'day') key = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
            else key = d.toLocaleDateString('tr-TR', { month: 'long', year: '2-digit' });

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

        // Boşsa Düz Çizgi Göster (Hata vermemesi için)
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

    // 4. TABLO ve ÇEVİRİ
    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        if(!list || list.length === 0) { 
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:#999;">İşlem bulunamadı.</td></tr>'; 
            return; 
        }
        
        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
            let rowClass = 'row-expense', textClass = 'text-red', symbol = '-';
            
            if (t.type === 'income') { rowClass = 'row-income'; textClass = 'text-green'; symbol = '+'; }
            if (t.is_escrow) { rowClass = 'row-escrow'; textClass = 'text-orange'; symbol = ''; }
            if (t.category && t.category.includes('exchange')) { rowClass = 'row-exchange'; textClass = 'text-navy'; symbol = t.type==='income'?'+':'-'; }

            const categoryName = this.translateCat(t.category);

            tbody.innerHTML += `
                <tr class="${rowClass} row-hover" onclick="accounting.openTransactionDetail('${t.id}')">
                    <td style="color:#64748b; font-size:12px; padding:15px;">${date}</td>
                    <td style="padding:15px; font-weight:600; color:#334155;">${t.description || '-'}</td>
                    <td style="padding:15px;"><span class="badge badge-gray">${categoryName}</span></td>
                    <td style="padding:15px; text-align:right; font-weight:800; font-size:15px;" class="${textClass}">${symbol} ${this.fmt(t.amount, t.currency)}</td>
                </tr>`;
        });
    },

    translateCat: function(cat) { 
        const dict = {
            'visa_service': 'Vize Hizmeti', 'extra_service': 'Ek Hizmet', 'escrow_deposit': 'Emanet Girişi',
            'escrow_refund': 'Emanet İadesi', 'escrow_service_deduction': 'Emanet Hizmet Kesintisi',
            'exchange_in': 'Döviz Giriş', 'exchange_out': 'Döviz Çıkış', 'rent': 'Kira/Ofis',
            'bills': 'Fatura', 'food': 'Yemek/Mutfak', 'consulate_fee': 'Konsolosluk Harcı',
            'salary': 'Personel Maaş', 'marketing': 'Reklam Gideri', 'office_supplies': 'Ofis Malzemesi',
            'flight_ticket': 'Uçak Bileti', 'hotel_booking': 'Otel Rezervasyonu', 'travel_insurance': 'Seyahat Sigortası'
        }; 
        return dict[cat] || cat;
    },

    // 5. DETAYLAR VE İŞLEMLER
    openTransactionDetail: function(txId) {
        const tx = this.allTransactions.find(t => t.id === txId); if(!tx) return;
        this.selectedTxId = txId;
        const amountEl = document.getElementById('td-amount');
        amountEl.className = tx.type === 'income' ? 'receipt-amount text-green' : 'receipt-amount text-red';
        document.getElementById('td-amount').innerText = this.fmt(tx.amount, tx.currency);
        document.getElementById('td-cat').innerText = this.translateCat(tx.category);
        document.getElementById('td-date').innerText = new Date(tx.created_at).toLocaleString('tr-TR');
        document.getElementById('td-id').innerText = tx.id.substring(0, 8) + '...';
        document.getElementById('td-desc').innerText = tx.description;
        document.getElementById('td-user').innerText = this.currentUserEmail; 
        document.querySelector('.user-avatar').innerText = this.currentUserEmail.charAt(0).toUpperCase();
        window.ui.openModal('modal-transaction-detail');
    },

    deleteTransaction: async function() { 
        if(!this.selectedTxId) return; 
        if(!confirm("Silmek istediğine emin misin?")) return; 
        await window.supabaseClient.from('transactions').delete().eq('id', this.selectedTxId); 
        window.ui.closeModal('modal-transaction-detail'); this.refreshDashboard(); 
    },

    openEscrowDetails: function() {
        window.ui.openModal('modal-escrow-details');
        this.calculateStats(this.allTransactions); // Kartları güncelle
        const list = this.allTransactions.filter(t => t.is_escrow).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        const tbody = document.getElementById('escrow-list-body');
        tbody.innerHTML = '';
        if(list.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Veri yok.</td></tr>'; return; }
        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR');
            const rowColor = t.type === 'income' ? '#334155' : '#ef4444';
            const badge = t.type === 'income' ? '<span class="badge bg-orange-light">GİRİŞ</span>' : '<span class="badge" style="background:#fee2e2; color:#ef4444;">ÇIKIŞ</span>';
            const clickAction = t.type === 'income' ? `onclick="accounting.openEscrowAction('${t.id}')" style="cursor:pointer;"` : '';
            tbody.innerHTML += `<tr ${clickAction}>
                <td style="padding:12px; font-size:12px; color:#64748b;">${date}</td>
                <td style="padding:12px; font-weight:600; color:${rowColor};">${t.description}</td>
                <td style="padding:12px; font-weight:800; text-align:right;">${t.type==='income'?'+':'-'} ${this.fmt(t.amount, t.currency)}</td>
                <td style="padding:12px; text-align:center;">${badge}</td>
            </tr>`;
        });
    },

    openEscrowAction: function(txId) {
        const tx = this.allTransactions.find(t => t.id === txId); if(!tx) return;
        document.getElementById('act-source-id').value = tx.id;
        document.getElementById('act-source-desc').innerText = tx.description;
        document.getElementById('act-source-amount').innerText = this.fmt(tx.amount, tx.currency);
        document.getElementById('act-amount').value = tx.amount; 
        document.getElementById('act-currency').value = tx.currency;
        window.ui.closeModal('modal-escrow-details'); window.ui.openModal('modal-escrow-action');
    },

    saveEscrowAction: async function(e) {
        e.preventDefault(); const btn = e.target.querySelector('button'); btn.disabled = true; btn.innerText = "İşleniyor...";
        const sourceId = document.getElementById('act-source-id').value;
        const type = document.getElementById('act-type').value; 
        const amount = document.getElementById('act-amount').value;
        const currency = document.getElementById('act-currency').value;
        const desc = document.getElementById('act-desc').value;
        const sourceTx = this.allTransactions.find(t => t.id === sourceId);
        const sourceName = sourceTx ? sourceTx.description.split('-')[0] : 'Kayıt';
        
        let cat = 'escrow_refund', prefix = 'İADE: ';
        if(type === 'payment') { cat = 'escrow_payment'; prefix = 'ÖDEME: '; }
        else if(type === 'transfer') { cat = 'escrow_to_income'; prefix = 'GELİR AKTARIMI: '; }

        const { error } = await window.supabaseClient.from('transactions').insert({
            type: 'expense', category: cat, description: `${prefix}${sourceName} - ${desc}`,
            amount: amount, currency: currency, is_escrow: true, created_at: new Date()
        });
        if(!error) { window.ui.closeModal('modal-escrow-action'); this.refreshDashboard(); setTimeout(() => { this.openEscrowDetails(); }, 500); }
        else alert(error.message);
        btn.disabled = false; btn.innerText = "İŞLEMİ ONAYLA";
    },

    // YARDIMCILAR & KAYITLAR
    filterChartDate: function(p,b) { document.querySelectorAll('.time-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); this.currentPeriod=p; this.updateChartRender(); },
    toggleChartData: function(t,e) { this.chartState[t]=!this.chartState[t]; e.classList.toggle('inactive'); this.updateChartRender(); },
    toggleFilterMenu: function() { document.getElementById('filter-menu').classList.toggle('show'); },
    applyFilters: function() { /* Basit filtreleme */ this.renderTable(this.allTransactions); document.getElementById('filter-menu').classList.remove('show'); },
    updateText: function(id, t) { const el = document.getElementById(id); if(el) el.innerText = t; },
    fmt: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); },

    // Kayıt Fonksiyonları
    saveExpense: async function(e) { e.preventDefault(); this.genericSave(e, 'expense', 'modal-expense'); },
    saveEscrow: async function(e) { e.preventDefault(); this.genericSave(e, 'income', 'modal-escrow', true); },
    saveExtraIncome: async function(e) { e.preventDefault(); this.genericSave(e, 'income', 'modal-extra-income'); },
    saveExchange: async function(e) { e.preventDefault(); /* ... */ window.ui.closeModal('modal-exchange'); this.refreshDashboard(); },
    
    // Genel Kayıt (Escrow Desteğiyle)
    genericSave: async function(e, type, modalId, isEscrow=false) {
        const form=e.target; const btn=form.querySelector('button'); btn.disabled=true;
        let cat = form.querySelector('select')?.value || 'general';
        // Emanet formu özel alanları
        let desc = form.querySelector('input[type="text"]').value;
        let amount = form.querySelector('input[type="number"]').value;
        let currency = form.querySelectorAll('select')[1]?.value || 'TRY';

        if(modalId === 'modal-escrow') {
            const cust = document.getElementById('esc-customer').value;
            const date = document.getElementById('esc-date').value;
            cat = 'escrow_deposit';
            desc = `${cust} - ${document.getElementById('esc-category').value.toUpperCase()} (${date}) - ${document.getElementById('esc-desc').value}`;
            amount = document.getElementById('esc-amount').value;
            currency = document.getElementById('esc-currency').value;
        } else if (modalId === 'modal-extra-income') {
            const cust = document.getElementById('ei-customer').value;
            const srv = document.getElementById('ei-category').value;
            desc = `${srv.toUpperCase()} - ${cust} (${document.getElementById('ei-desc').value})`;
            amount = document.getElementById('ei-amount').value;
            currency = document.getElementById('ei-currency').value;
            cat = 'extra_service';
        }

        await window.supabaseClient.from('transactions').insert([{ type, category: cat, description: desc, amount, currency, is_escrow: isEscrow }]);
        window.ui.closeModal(modalId); form.reset(); this.refreshDashboard(); btn.disabled=false;
    }
};

window.addEventListener('load', () => { 
    window.accounting.refreshDashboard(); 
    if(document.getElementById('form-exchange')) document.getElementById('form-exchange').onsubmit=window.accounting.saveExchange; 
    if(document.getElementById('form-expense')) document.getElementById('form-expense').onsubmit=window.accounting.saveExpense; 
    if(document.getElementById('form-escrow')) document.getElementById('form-escrow').onsubmit=window.accounting.saveEscrow; 
    if(document.getElementById('form-extra-income')) document.getElementById('form-extra-income').onsubmit=window.accounting.saveExtraIncome;
    if(document.getElementById('form-escrow-action')) document.getElementById('form-escrow-action').onsubmit=window.accounting.saveEscrowAction;
});
