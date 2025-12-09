// js/accounting.js - VIZERIO HATA TESPİT SÜRÜMÜ

window.accounting = {
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null,
    chartState: { profit: true, income: true, expense: true },
    currentPeriod: 'all',
    allTransactions: [],
    
    refreshDashboard: async function() {
        console.log("🔍 Veri Çekme Başlatıldı...");
        
        // 1. SUPABASE İSTEMCİSİ KONTROLÜ
        if (!window.supabaseClient) {
            alert("KRİTİK HATA: Veritabanı bağlantı motoru (supabaseClient) bulunamadı! js/supabase.js dosyasını kontrol edin.");
            return;
        }

        // 2. KURLARI ÇEK (Hata verirse önemseme)
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const d = await res.json();
            this.liveRates = { TRY: 1, USD: (1/d.rates.USD), EUR: (1/d.rates.EUR) };
            if(document.getElementById('live-rates-display')) 
                document.getElementById('live-rates-display').innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
        } catch (e) { console.log("Kur hatası (Önemsiz):", e); }

        // 3. VERİLERİ ÇEK (HATA YAKALAYICI)
        const { data: list, error } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });

        // --- HATA VARSA EKRANA BAS ---
        if (error) {
            console.error("VERİTABANI HATASI:", error);
            const msg = `VERİ ALINAMADI: ${error.message} (Kod: ${error.code})`;
            alert(msg); // Ekrana fırlat
            document.getElementById('transactions-body').innerHTML = `<tr><td colspan="4" style="color:red; text-align:center; padding:20px; font-weight:bold;">${msg}</td></tr>`;
            return;
        }

        // --- LİSTE BOŞSA UYAR ---
        if (!list || list.length === 0) {
            console.log("Veritabanı boş.");
            document.getElementById('transactions-body').innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#64748b;">Henüz hiç kayıt yok. İlk kaydı ekleyin.</td></tr>`;
            
            // Boş olsa bile grafiği sıfırlarla çiz
            this.allTransactions = [];
            this.calculateStats([]);
            this.updateChartRender();
            return;
        }
        
        // 4. HER ŞEY YOLUNDAYSA İŞLE
        this.allTransactions = list;
        this.calculateStats(list);
        this.renderTable(list);
        setTimeout(() => this.updateChartRender(), 200);
    },

    // --- HESAPLAMA MOTORU ---
    calculateStats: function(list) {
        const selectedCurr = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        let wTRY=0, wUSD=0, wEUR=0, tInc=0, tExp=0, escTotal=0;
        let escEUR=0, escUSD=0, escTRY=0;

        list.forEach(t => {
            const amt = parseFloat(t.amount);
            // Kasa
            if (t.type === 'income') { if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt; }
            else { if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt; }
            
            // Emanet
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
            // Ciro
            else if (!t.category.includes('exchange')) {
                const val = (amt * (this.liveRates[t.currency]||1)) / this.liveRates[selectedCurr];
                if (t.type === 'income') tInc += val; else tExp += val;
            }
        });

        this.updateText('wallet-try', this.fmt(wTRY, 'TRY'));
        this.updateText('wallet-usd', this.fmt(wUSD, 'USD'));
        this.updateText('wallet-eur', this.fmt(wEUR, 'EUR'));
        
        const totalEq = (wTRY + (wUSD*this.liveRates.USD) + (wEUR*this.liveRates.EUR)) / this.liveRates[selectedCurr];
        this.updateText('total-equity', this.fmt(totalEq, selectedCurr));

        this.updateText('money-profit', this.fmt(tInc-tExp, selectedCurr));
        this.updateText('money-income', this.fmt(tInc, selectedCurr));
        this.updateText('money-expense', this.fmt(tExp, selectedCurr));
        this.updateText('money-escrow', this.fmt(escTotal, selectedCurr));

        // Emanet Detayları
        if(document.getElementById('esc-total-eur')) document.getElementById('esc-total-eur').innerText=this.fmt(escEUR,'EUR');
        if(document.getElementById('esc-total-usd')) document.getElementById('esc-total-usd').innerText=this.fmt(escUSD,'USD');
        if(document.getElementById('esc-total-try')) document.getElementById('esc-total-try').innerText=this.fmt(escTRY,'TRY');
    },

    // --- TABLO ---
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
                <td style="font-size:11px; font-weight:700; color:#64748b;">${t.category.toUpperCase()}</td>
                <td class="${txt}">${sym} ${this.fmt(t.amount, t.currency)}</td>
            </tr>`;
        });
    },

    // --- GRAFİK ---
    updateChartRender: function() {
        const ctx = document.getElementById('financeChart');
        if (!ctx) return;
        
        const targetCurrency = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        
        // Basit tarih filtresi
        const now = new Date();
        let startTime = new Date(0); 
        if(this.currentPeriod === '24h') startTime.setHours(now.getHours() - 24);
        else if(this.currentPeriod === '1w') startTime.setDate(now.getDate() - 7);
        else if(this.currentPeriod === '1m') startTime.setDate(now.getDate() - 30);
        else if(this.currentPeriod === '1y') startTime.setFullYear(now.getFullYear() - 1);

        const filteredData = this.allTransactions
            .filter(t => new Date(t.created_at) >= startTime && !t.is_escrow && !t.category.includes('exchange'))
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
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    },

    // --- YARDIMCILAR ---
    updateText: function(id, t) { const el = document.getElementById(id); if(el) el.innerText = t; },
    fmt: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); },
    toggleChartData: function(type, cardElement) { 
        this.chartState[type] = !this.chartState[type]; 
        if(this.chartState[type]) cardElement.classList.remove('inactive'); else cardElement.classList.add('inactive'); 
        this.updateCardStatus(type);
        this.updateChartRender(); 
    },
    updateCardStatus: function(type) {
        const el = document.getElementById(type==='profit'?'lbl-profit':(type==='income'?'lbl-income':'lbl-expense'));
        if(el) {
            const base = type==='profit'?'NET KÂR':(type==='income'?'TOPLAM CİRO':'TOPLAM GİDER');
            el.innerText = `${base} ${this.chartState[type]?'(AÇIK)':'(KAPALI)'}`;
        }
    },
    filterChartDate: function(period, btn) { 
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active')); 
        btn.classList.add('active'); this.currentPeriod = period; this.updateChartRender(); 
    },

    // --- KAYITLAR ---
    saveExpense: async function(e) { e.preventDefault(); this.genericSave('expense', 'modal-expense'); },
    saveExtraIncome: async function(e) { e.preventDefault(); this.genericSave('income', 'modal-extra-income'); },
    saveEscrow: async function(e) { e.preventDefault(); this.genericSave('income', 'modal-escrow', true); },
    saveExchange: async function(e) { 
        e.preventDefault(); const oa=document.getElementById('ex-out-amt').value, oc=document.getElementById('ex-out-curr').value, ia=document.getElementById('ex-in-amt').value, ic=document.getElementById('ex-in-curr').value; 
        await window.supabaseClient.from('transactions').insert([{type:'expense',category:'exchange_out',description:'Döviz Bozum',amount:oa,currency:oc},{type:'income',category:'exchange_in',description:'Döviz Giriş',amount:ia,currency:ic}]); 
        window.ui.closeModal('modal-exchange'); this.refreshDashboard(); 
    },
    genericSave: async function(type, modalId, isEscrow=false) {
        // Form verilerini al
        let cat='general', desc='', amt=0, curr='TRY';
        if(modalId==='modal-expense'){ cat=document.getElementById('exp-category').value; desc=document.getElementById('exp-title').value; amt=document.getElementById('exp-amount').value; curr=document.getElementById('exp-currency').value; }
        else if(modalId==='modal-extra-income'){ cat='extra_service'; desc=document.getElementById('ei-customer').value; amt=document.getElementById('ei-amount').value; curr=document.getElementById('ei-currency').value; }
        else if(modalId==='modal-escrow'){ cat='escrow_deposit'; desc=document.getElementById('esc-customer').value; amt=document.getElementById('esc-amount').value; curr=document.getElementById('esc-currency').value; }

        const { error } = await window.supabaseClient.from('transactions').insert({ type, category: cat, description: desc, amount: amt, currency: curr, is_escrow: isEscrow });
        
        if(error) alert("Kayıt Başarısız: " + error.message);
        else { window.ui.closeModal(modalId); this.refreshDashboard(); }
    },

    // Emanet Detay & Aksiyon
    openEscrowDetails: function(){ window.ui.openModal('modal-escrow-details'); this.calculateStats(this.allTransactions); this.renderEscrowTable(); },
    renderEscrowTable: function(){
        const list=this.allTransactions.filter(t=>t.is_escrow).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
        const tbody=document.getElementById('escrow-list-body'); if(!tbody)return; tbody.innerHTML='';
        if(list.length===0) tbody.innerHTML='<tr><td colspan="4" style="text-align:center;">İşlem yok.</td></tr>';
        list.forEach(t=>{ 
            const sym=t.type==='income'?'+':'-'; const col=t.type==='income'?'text-green':'text-red';
            tbody.innerHTML+=`<tr class="row-hover" style="cursor:pointer;" onclick="accounting.openEscrowAction('${t.id}')"><td>${new Date(t.created_at).toLocaleDateString()}</td><td>${t.description}</td><td class="${col}" style="text-align:right;">${sym} ${this.fmt(t.amount,t.currency)}</td><td style="text-align:center;">${t.type==='income'?'GİRİŞ':'ÇIKIŞ'}</td></tr>`;
        });
    },
    openEscrowAction: function(id){ 
        const t=this.allTransactions.find(x=>x.id===id); if(!t)return;
        document.getElementById('act-source-id').value=id; document.getElementById('act-currency').value=t.currency;
        document.getElementById('act-desc-display').innerText=t.description; document.getElementById('act-amount-display').innerText=this.fmt(t.amount,t.currency);
        document.getElementById('act-amount').value=t.amount;
        window.ui.openModal('modal-escrow-action');
    },
    saveEscrowAction: async function(e){
        e.preventDefault(); const amt=document.getElementById('act-amount').value; const cur=document.getElementById('act-currency').value; const type=document.getElementById('act-type').value; const note=document.getElementById('act-note').value;
        const {error}=await window.supabaseClient.from('transactions').insert({type:'expense', category:type==='profit'?'visa_service':'escrow_refund', description:`İşlem: ${note}`, amount:amt, currency:cur, is_escrow:true});
        if(!error){ window.ui.closeModal('modal-escrow-action'); this.refreshDashboard(); setTimeout(()=>this.openEscrowDetails(),500); }
        else alert(error.message);
    },
    deleteEscrowTransaction: async function(){
        const id=document.getElementById('act-source-id').value;
        if(confirm("Silmek istediğine emin misin?")){
            await window.supabaseClient.from('transactions').delete().eq('id',id);
            window.ui.closeModal('modal-escrow-action'); this.refreshDashboard(); setTimeout(()=>this.openEscrowDetails(),500);
        }
    },
    openTransactionDetail: function(id){} // Detay modalı şimdilik kapalı
};

window.addEventListener('load', () => { 
    window.accounting.refreshDashboard(); 
    if(document.getElementById('form-expense')) document.getElementById('form-expense').onsubmit=window.accounting.saveExpense;
    if(document.getElementById('form-extra-income')) document.getElementById('form-extra-income').onsubmit=window.accounting.saveExtraIncome;
    if(document.getElementById('form-escrow')) document.getElementById('form-escrow').onsubmit=window.accounting.saveEscrow;
    if(document.getElementById('form-exchange')) document.getElementById('form-exchange').onsubmit=window.accounting.saveExchange;
    if(document.getElementById('form-escrow-action')) document.getElementById('form-escrow-action').onsubmit=window.accounting.saveEscrowAction;
});
