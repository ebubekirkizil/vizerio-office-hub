// js/accounting.js - VIZERIO PRO (FULL FİNAL SÜRÜM - EMANET & FİLTRE DAHİL)

window.accounting = {
    
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null,
    chartState: { profit: true, income: false, expense: false },
    currentPeriod: 'all', // Varsayılan TÜMÜ
    allTransactions: [],
    filteredTransactions: [],
    selectedTxId: null,
    currentUserEmail: 'Yetkili Personel',

    // 1. SİSTEMİ BAŞLAT
    refreshDashboard: async function() {
        console.log("💰 Sistem yenileniyor...");
        
        // Kullanıcıyı Bul
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if(user && user.email) this.currentUserEmail = user.email;

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
        
        this.allTransactions = list;
        this.filteredTransactions = list;

        this.calculateStats(list);
        this.renderTable(this.filteredTransactions);
        
        // Grafiği çiz
        setTimeout(() => this.updateChartRender(), 100);
    },

    // 2. KASA VE İSTATİSTİK HESAPLAMA
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
        
        // Küçük Yazılar (TL Karşılığı)
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

    // 3. GRAFİK MOTORU
    updateChartRender: function() {
        const ctx = document.getElementById('financeChart');
        if (!ctx) return;
        
        const targetCurrency = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        const now = new Date();
        let startTime = new Date(0); // 1970 (Tümü)
        let timeFormat = 'month';

        if(this.currentPeriod === '24h') { startTime = new Date(); startTime.setHours(now.getHours() - 24); timeFormat = 'hour'; }
        else if(this.currentPeriod === '1w') { startTime = new Date(); startTime.setDate(now.getDate() - 7); timeFormat = 'day'; }
        else if(this.currentPeriod === '1m') { startTime = new Date(); startTime.setDate(now.getDate() - 30); timeFormat = 'day'; }
        else if(this.currentPeriod === '1y') { startTime = new Date(); startTime.setFullYear(now.getFullYear() - 1); timeFormat = 'month'; }

        // Veri Hazırlama
        const filteredData = this.allTransactions
            .filter(t => new Date(t.created_at) >= startTime && !t.is_escrow && !(t.category && t.category.includes('exchange')))
            .sort((a,b) => new Date(a.created_at) - new Date(b.created_at));

        let labels = [], incomeData = [], expenseData = [], profitData = [], grouped = {};

        filteredData.forEach(t => {
            const d = new Date(t.created_at);
            let key = '';
            if(timeFormat === 'hour') key = d.getHours() + ":00";
            else if(timeFormat === 'day') key = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
            else if(timeFormat === 'month') key = d.toLocaleDateString('tr-TR', { month: 'long', year: '2-digit' });

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

    // 4. TABLO VE ÇEVİRİ
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

    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        const displayList = list.length > 0 ? list : [];
        if(displayList.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:#999;">İşlem bulunamadı.</td></tr>'; return; }
        
        displayList.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
            let rowClass = 'row-expense', textClass = 'text-red', symbol = '-';
            
            if (t.type === 'income') { rowClass = 'row-income'; textClass = 'text-green'; symbol = '+'; }
            if (t.is_escrow) { rowClass = 'row-escrow'; textClass = 'text-orange'; symbol = ''; }
            if (t.category && t.category.includes('exchange')) { rowClass = 'row-exchange'; textClass = 'text-navy'; symbol = t.type==='income'?'+':'-'; }

            const categoryName = this.translateCat(t.category);

            tbody.innerHTML += `<tr class="${rowClass} row-hover" onclick="accounting.openTransactionDetail('${t.id}')">
                <td style="color:#64748b; font-size:12px; padding:15px;">${date}</td>
                <td style="padding:15px; font-weight:600; color:#334155;">${t.description || '-'}</td>
                <td style="padding:15px;"><span class="badge badge-gray">${categoryName}</span></td>
                <td style="padding:15px; text-align:right; font-weight:800; font-size:15px;" class="${textClass}">${symbol} ${this.fmt(t.amount, t.currency)}</td>
            </tr>`;
        });
    },

    // 5. YENİ EMANET SİSTEMİ (PREMIUM & İŞLEVSEL)
    openEscrowDetails: async function() {
        window.ui.openModal('modal-escrow-details');
        document.getElementById('escrow-list-body').innerHTML = '<tr><td colspan="3" style="text-align:center; padding:30px;">Yükleniyor...</td></tr>';

        // Sadece emanet işlemlerini çek
        const { data: list } = await window.supabaseClient.from('transactions').select('*').eq('is_escrow', true).order('created_at', { ascending: false });

        let totalEUR = 0, totalUSD = 0, totalTRY = 0;
        let tableHTML = '';

        if (list && list.length > 0) {
            list.forEach(t => {
                const amt = parseFloat(t.amount);
                // Giriş/Çıkış Hesabı
                if (t.type === 'income') { 
                    if (t.currency === 'EUR') totalEUR += amt;
                    else if (t.currency === 'USD') totalUSD += amt;
                    else if (t.currency === 'TRY') totalTRY += amt;
                } else if (t.type === 'expense') { 
                    if (t.currency === 'EUR') totalEUR -= amt;
                    else if (t.currency === 'USD') totalUSD -= amt;
                    else if (t.currency === 'TRY') totalTRY -= amt;
                }

                // Tablo Satırı
                const date = new Date(t.created_at).toLocaleDateString('tr-TR');
                const colorClass = t.type === 'income' ? 'text-green' : 'text-red';
                const prefix = t.type === 'income' ? '+' : '-';
                
                tableHTML += `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                        <td style="padding:12px;">${date}</td>
                        <td style="padding:12px; font-weight:600;">${t.description}</td>
                        <td style="padding:12px; text-align:right;" class="${colorClass}">
                            ${prefix} ${this.fmt(amt, t.currency)}
                        </td>
                    </tr>`;
            });
        } else {
            tableHTML = '<tr><td colspan="3" style="text-align:center; padding:30px;">Emanet işlem yok.</td></tr>';
        }

        // Özet Kartları Doldur
        document.getElementById('esc-total-eur').innerText = this.fmt(totalEUR, 'EUR');
        document.getElementById('esc-total-usd').innerText = this.fmt(totalUSD, 'USD');
        document.getElementById('esc-total-try').innerText = this.fmt(totalTRY, 'TRY');
        
        // Alt TL karşılıkları
        const eurInTry = totalEUR * (this.liveRates.EUR || 0);
        const usdInTry = totalUSD * (this.liveRates.USD || 0);
        document.getElementById('esc-total-eur-tl').innerText = `≈ ${this.fmt(eurInTry, 'TRY')}`;
        document.getElementById('esc-total-usd-tl').innerText = `≈ ${this.fmt(usdInTry, 'TRY')}`;

        document.getElementById('escrow-list-body').innerHTML = tableHTML;
    },

    // 6. EMANET ÇIKIŞ / İADE PENCERESİNİ AÇ
    openEscrowWithdrawModal: function() {
        window.ui.closeModal('modal-escrow-details');
        window.ui.openModal('modal-escrow-withdraw');
        document.getElementById('form-escrow-withdraw').reset();
    },

    // 7. EMANET ÇIKIŞINI KAYDET
    saveEscrowWithdraw: async function(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerHTML = "İşleniyor...";

        const type = document.getElementById('ew-type').value;
        const amount = document.getElementById('ew-amount').value;
        const currency = document.getElementById('ew-currency').value;
        const desc = document.getElementById('ew-desc').value;

        let category = 'escrow_refund';
        let descPrefix = 'İade: ';
        
        if (type === 'service_payment') {
            category = 'escrow_service_deduction';
            descPrefix = 'Hizmet Kesintisi: ';
        }

        const { error } = await window.supabaseClient.from('transactions').insert([{
            type: 'expense', // Emanetten çıkış olduğu için expense
            category: category,
            description: descPrefix + desc,
            amount: amount,
            currency: currency,
            is_escrow: true, // Emanet hesabını etkile
            created_at: new Date()
        }]);

        if(!error) {
            window.ui.closeModal('modal-escrow-withdraw');
            this.refreshDashboard(); // Ana ekranı güncelle
            setTimeout(() => {
                this.openEscrowDetails(); // Emanet detayını tekrar aç ve güncelle
                alert("✅ Emanet çıkışı yapıldı.");
            }, 500);
        } else {
            alert("Hata: " + error.message);
        }
        btn.disabled = false; btn.innerHTML = "İŞLEMİ ONAYLA";
    },

    // 8. FİLTRELEME & YARDIMCILAR
    toggleFilterMenu: function() { document.getElementById('filter-menu').classList.toggle('show'); },
    applyFilters: function() {
        const fType = document.getElementById('f-type').value;
        const fCurr = document.getElementById('f-currency').value;
        const fMin = parseFloat(document.getElementById('f-min').value) || 0;
        const fMax = parseFloat(document.getElementById('f-max').value) || 999999999;

        this.filteredTransactions = this.allTransactions.filter(t => {
            let pass = true;
            if (fType !== 'all') {
                if (fType === 'income' && t.type !== 'income') pass = false;
                if (fType === 'expense' && t.type !== 'expense') pass = false;
                if (fType === 'escrow' && !t.is_escrow) pass = false;
            }
            if (fCurr !== 'all' && t.currency !== fCurr) pass = false;
            const amt = parseFloat(t.amount);
            if (amt < fMin || amt > fMax) pass = false;
            return pass;
        });
        this.renderTable(this.filteredTransactions);
        document.getElementById('filter-menu').classList.remove('show');
    },

    openTransactionDetail: function(txId) {
        const tx = this.allTransactions.find(t => t.id === txId);
        if(!tx) return;
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

    // KAYIT FONKSİYONLARI (STANDART)
    saveExpense: async function(e) { e.preventDefault(); this.genericSave(e, 'expense', 'modal-expense'); },
    saveEscrow: async function(e) { 
        e.preventDefault(); const btn=e.target.querySelector('button'); btn.disabled=true; 
        const c=document.getElementById('esc-customer').value, cat=document.getElementById('esc-category').value, a=document.getElementById('esc-amount').value, cur=document.getElementById('esc-currency').value, d=document.getElementById('esc-date').value, desc=document.getElementById('esc-desc').value; 
        await window.supabaseClient.from('transactions').insert({type:'income', category:'escrow_deposit', description:`${c} - ${cat.toUpperCase()} (${d}) - ${desc}`, amount:a, currency:cur, is_escrow:true}); 
        window.ui.closeModal('modal-escrow'); this.refreshDashboard(); btn.disabled=false; 
    },
    saveExtraIncome: async function(e) { 
        e.preventDefault(); const btn=e.target.querySelector('button'); btn.disabled=true; 
        const c=document.getElementById('ei-customer').value, cat=document.getElementById('ei-category').value, a=document.getElementById('ei-amount').value, cur=document.getElementById('ei-currency').value, desc=document.getElementById('ei-desc').value; 
        await window.supabaseClient.from('transactions').insert({type:'income', category:'extra_service', description:`${cat.toUpperCase()} - ${c} (${desc})`, amount:a, currency:cur, is_escrow:false}); 
        window.ui.closeModal('modal-extra-income'); this.refreshDashboard(); btn.disabled=false; 
    },
    saveExchange: async function(e) { 
        e.preventDefault(); const btn=e.target.querySelector('button'); btn.disabled=true; 
        const oa=document.getElementById('ex-amount-out').value, oc=document.getElementById('ex-currency-out').value, ia=document.getElementById('ex-amount-in').value, ic=document.getElementById('ex-currency-in').value, d=document.getElementById('ex-desc').value; 
        await window.supabaseClient.from('transactions').insert([{type:'expense',category:'exchange_out',description:`Döviz Bozum (${d})`,amount:oa,currency:oc},{type:'income',category:'exchange_in',description:`Döviz Giriş (${d})`,amount:ia,currency:ic}]); 
        window.ui.closeModal('modal-exchange'); this.refreshDashboard(); btn.disabled=false; 
    },
    genericSave: async function(e, type, modalId) { 
        const form=e.target; const btn=form.querySelector('button'); btn.disabled=true; 
        const cat=form.querySelector('select').value, desc=form.querySelector('input[type="text"]').value, amt=form.querySelector('input[type="number"]').value, cur=form.querySelectorAll('select')[1].value; 
        await window.supabaseClient.from('transactions').insert([{type:'expense',category:cat,description:desc,amount:amt,currency:cur,is_escrow:false}]); 
        window.ui.closeModal(modalId); form.reset(); this.refreshDashboard(); btn.disabled=false; 
    },

    updateText: function(id, t) { const el = document.getElementById(id); if(el) el.innerText = t; },
    fmt: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); },
    filterChartDate: function(period, btn) { document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); this.currentPeriod = period; this.updateChartRender(); },
    toggleChartData: function(type, cardElement) { this.chartState[type] = !this.chartState[type]; if(this.chartState[type]) cardElement.classList.remove('inactive'); else cardElement.classList.add('inactive'); this.updateChartRender(); }
};

window.addEventListener('load', () => { 
    window.accounting.refreshDashboard(); 
    if(document.getElementById('form-exchange')) document.getElementById('form-exchange').onsubmit=window.accounting.saveExchange; 
    if(document.getElementById('form-expense')) document.getElementById('form-expense').onsubmit=window.accounting.saveExpense; 
    if(document.getElementById('form-escrow')) document.getElementById('form-escrow').onsubmit=window.accounting.saveEscrow; 
    if(document.getElementById('form-extra-income')) document.getElementById('form-extra-income').onsubmit=window.accounting.saveExtraIncome;
    // YENİ: EMANET ÇIKIŞ LİSTENER'I
    if(document.getElementById('form-escrow-withdraw')) document.getElementById('form-escrow-withdraw').onsubmit=window.accounting.saveEscrowWithdraw.bind(window.accounting);
});
