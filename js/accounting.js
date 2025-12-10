// js/accounting.js - VIZERIO PRO (AKILLI EMANET YÖNETİMİ)

window.accounting = {
    
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null,
    chartState: { profit: true, income: true, expense: true },
    currentPeriod: 'all',
    allTransactions: [],
    escrowTotals: { EUR: 0, USD: 0, TRY: 0 },
    activeEscrowTab: 'EUR',
    
    // 1. SİSTEMİ BAŞLAT
    refreshDashboard: async function() {
        console.log("🚀 Sistem Başlatılıyor...");
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
        } catch(e) {}

        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const d = await res.json();
            this.liveRates = { TRY: 1, USD: (1/d.rates.USD), EUR: (1/d.rates.EUR) };
            if(document.getElementById('live-rates-display')) 
                document.getElementById('live-rates-display').innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
        } catch (e) {}

        const { data: list, error } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) { console.error(error); return; }
        
        this.allTransactions = list || [];
        this.calculateStats(this.allTransactions);
        this.renderTable(this.allTransactions);
        this.updateCardStatus('profit'); this.updateCardStatus('income'); this.updateCardStatus('expense');
        setTimeout(() => this.updateChartRender(), 200);
    },

    // 2. HESAPLAMA (MATEMATİK)
    calculateStats: function(list) {
        const selectedCurr = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        let wTRY=0, wUSD=0, wEUR=0; 
        let tInc=0, tExp=0, escTotalVal=0;
        
        // Emanet Toplamlarını Sıfırla
        this.escrowTotals = { EUR: 0, USD: 0, TRY: 0 };

        list.forEach(t => {
            const amt = parseFloat(t.amount);
            
            // KASA (Fiziksel Para - Her şey dahil)
            if (t.type === 'income') {
                if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt;
            } else {
                if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt;
            }

            // EMANET BAKİYESİ (Ayrı Hesap)
            if (t.is_escrow) {
                if(t.type === 'income') this.escrowTotals[t.currency] += amt;
                else this.escrowTotals[t.currency] -= amt;
                
                const val = (amt * (this.liveRates[t.currency]||1)) / this.liveRates[selectedCurr];
                if(t.type === 'income') escTotalVal += val; else escTotalVal -= val;
            } 
            
            // KAR/ZARAR (Emanet ve Exchange HARİÇ)
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
        this.updateText('money-escrow', this.fmt(escTotalVal, selectedCurr));
    },

    // 3. EMANET PENCERESİ (FİLTRELİ - SADECE AKTİFLER)
    openEscrowDetails: function() {
        window.ui.openModal('modal-escrow-details');
        this.calculateStats(this.allTransactions);
        this.switchEscrowTab(this.activeEscrowTab);
    },

    switchEscrowTab: function(currency, btnElement) {
        this.activeEscrowTab = currency;
        if(btnElement) {
            document.querySelectorAll('.esc-tab-btn').forEach(b => b.classList.remove('active'));
            btnElement.classList.add('active');
        }

        const container = document.getElementById('escrow-dynamic-content');
        if(!container) return;

        // BÜYÜK KART
        const bgClass = `big-bg-${currency.toLowerCase()}`;
        const icon = currency === 'EUR' ? 'euro' : (currency === 'USD' ? 'attach_money' : 'currency_lira');
        
        let html = `
            <div class="big-escrow-card ${bgClass}">
                <div>
                    <div class="big-esc-label">AKTİF ${currency} EMANETİ</div>
                    <div class="big-esc-amount">${this.fmt(this.escrowTotals[currency], currency)}</div>
                </div>
                <span class="material-icons-round big-esc-icon">${icon}</span>
            </div>
        `;

        // TABLO (ÖNEMLİ KISIM BURASI)
        // 1. Sadece seçili para birimi
        // 2. Sadece GİRİŞ işlemleri (Çıkışlar zaten geçmişte kaldı)
        // 3. 'archived_escrow' kategorisindekileri GİZLE (İşlemi bitenler)
        const list = this.allTransactions
            .filter(t => t.is_escrow && t.currency === currency && t.type === 'income' && t.category !== 'archived_escrow')
            .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

        html += `
            <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                <div style="padding:15px 20px; border-bottom:1px solid #f1f5f9; background: #fff;">
                    <span style="font-weight: 700; color: #64748b; font-size: 12px;">BEKLEYEN EMANETLER (Çıkış için çift tıkla)</span>
                </div>
                <div class="table-container" style="max-height: 350px; overflow-y: auto;">
                    <table class="data-table" style="margin:0;">
                        <thead style="position: sticky; top: 0; background: white; z-index: 10;">
                            <tr>
                                <th style="width: 120px;">Tarih</th>
                                <th>Müşteri / Açıklama</th>
                                <th style="text-align: right;">Tutar</th>
                                <th style="text-align: center; width: 100px;">İşlem</th>
                            </tr>
                        </thead>
                        <tbody>`;

        if(list.length === 0) {
            html += `<tr><td colspan="4" style="text-align:center; padding:30px; color:#94a3b8;">Şu an bekleyen emanet yok.</td></tr>`;
        } else {
            list.forEach(t => {
                const date = new Date(t.created_at).toLocaleDateString('tr-TR');
                html += `
                    <tr class="row-hover" style="cursor:pointer;" ondblclick="accounting.openEscrowAction('${t.id}')" title="İşlemi kapatmak için çift tıkla">
                        <td style="padding:15px; color:#64748b; font-size:13px;">${date}</td>
                        <td style="padding:15px; font-weight:600; color:#334155;">${t.description}</td>
                        <td style="padding:15px; text-align:right; font-weight:800; font-size:14px; color:#10b981;">
                            + ${this.fmt(t.amount, t.currency)}
                        </td>
                        <td style="padding:15px; text-align:center;">
                            <span class="badge" style="background:#ecfdf5; color:#059669; font-weight:700; font-size:10px;">AKTİF</span>
                        </td>
                    </tr>`;
            });
        }
        html += `</tbody></table></div></div>`;
        container.innerHTML = html;
    },

    // 4. İŞLEM PENCERESİNİ AÇ
    openEscrowAction: function(txId) {
        const tx = this.allTransactions.find(t => t.id === txId);
        if(!tx) return;

        document.getElementById('act-source-id').value = tx.id;
        document.getElementById('act-currency').value = tx.currency;
        document.getElementById('act-desc-display').innerText = tx.description;
        document.getElementById('act-amount-display').innerText = this.fmt(tx.amount, tx.currency);
        
        document.getElementById('act-amount').value = tx.amount; 
        document.getElementById('act-note').value = "";

        window.ui.openModal('modal-escrow-action');
    },

    // 5. İŞLEMİ KAYDET VE DOSYAYI KAPAT (ARŞİVLE)
    saveEscrowAction: async function(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]'); 
        btn.disabled = true; btn.innerText = "İşleniyor...";

        const sourceId = document.getElementById('act-source-id').value;
        const type = document.getElementById('act-type').value;
        const amount = document.getElementById('act-amount').value;
        const note = document.getElementById('act-note').value;
        const currency = document.getElementById('act-currency').value;

        const sourceTx = this.allTransactions.find(t => t.id === sourceId);
        const refName = sourceTx ? sourceTx.description.split('-')[0] : 'Kayıt';

        let category = 'escrow_refund';
        let descPrefix = 'İADE: ';
        
        if (type === 'payment') { category = 'escrow_payment'; descPrefix = 'ÖDEME: '; } 
        else if (type === 'profit') { category = 'visa_service'; descPrefix = 'GELİR AKTARIMI: '; }

        // 1. ÇIKIŞ İŞLEMİNİ KAYDET (Parayı kasadan düş)
        const { error: insertError } = await window.supabaseClient.from('transactions').insert({
            type: 'expense', // Emanet çıkışı
            category: category,
            description: `${descPrefix}${refName} - ${note}`,
            amount: amount,
            currency: currency,
            is_escrow: true, // Emanet hesabını etkile
            created_at: new Date()
        });

        if(insertError) {
            alert("Hata: " + insertError.message);
            btn.disabled = false; btn.innerText = "İŞLEMİ ONAYLA";
            return;
        }

        // 2. ORİJİNAL GİRİŞİ "ARŞİVLENDİ" YAP (Listeden Gizle)
        // Burada 'category' alanını 'archived_escrow' yaparak listemizin filtresine takılmasını sağlıyoruz.
        const { error: updateError } = await window.supabaseClient
            .from('transactions')
            .update({ category: 'archived_escrow' }) 
            .eq('id', sourceId);

        if(updateError) console.error("Arşivleme hatası:", updateError);

        // Başarılı
        window.ui.closeModal('modal-escrow-action');
        this.refreshDashboard(); 
        setTimeout(() => {
            this.openEscrowDetails();
            alert("✅ İşlem tamamlandı ve kayıt listeden düşüldü.");
        }, 500);
        
        btn.disabled = false; btn.innerText = "İŞLEMİ ONAYLA";
    },

    deleteEscrowTransaction: async function() {
        const id = document.getElementById('act-source-id').value;
        if(confirm("Bu kaydı tamamen silmek istediğine emin misin?")) {
            await window.supabaseClient.from('transactions').delete().eq('id', id);
            window.ui.closeModal('modal-escrow-action'); this.refreshDashboard(); setTimeout(() => this.openEscrowDetails(), 500);
        }
    },

    openEscrowActionSimple: async function() {
        const curr = this.activeEscrowTab;
        const amt = prompt(`Hızlı Çıkış Tutarı (${curr}):`);
        if(amt) {
            await window.supabaseClient.from('transactions').insert({
                type: 'expense', category: 'escrow_refund', description: `Hızlı Çıkış (Manuel)`, 
                amount: amt, currency: curr, is_escrow: true 
            });
            this.refreshDashboard(); setTimeout(() => this.openEscrowDetails(), 500);
        }
    },

    // --- STANDART FONKSİYONLAR ---
    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        if(list.length===0) { tbody.innerHTML='<tr><td colspan="4" style="text-align:center; padding:20px;">Kayıt yok.</td></tr>'; return; }
        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR');
            let cl='row-expense', txt='text-red', sym='-';
            if(t.type==='income'){ cl='row-income'; txt='text-green'; sym='+'; }
            if(t.is_escrow){ cl='row-escrow'; txt='text-orange'; } 
            if(t.category.includes('exchange')){ cl='row-transfer'; txt='text-primary'; sym='💱'; }
            // Arşivlenenleri normal listede gösterelim ama ismini düzeltelim
            let catName = this.translateCat(t.category);
            if(t.category === 'archived_escrow') { catName = 'EMANET (KAPANDI)'; cl = 'row-escrow'; }

            tbody.innerHTML += `<tr class="${cl}" onclick="accounting.openTransactionDetail('${t.id}')">
                <td>${date}</td><td>${t.description}</td>
                <td style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">${catName}</td>
                <td class="${txt}" style="text-align:right; font-weight:800;">${sym} ${this.fmt(t.amount, t.currency)}</td>
            </tr>`;
        });
    },
    
    updateChartRender: function() {
        const ctx = document.getElementById('financeChart'); if(!ctx) return;
        const targetCurrency = document.getElementById('chart-currency').value;
        const now=new Date(); let startTime=new Date(0);
        if(this.currentPeriod==='24h') startTime.setHours(now.getHours()-24);
        else if(this.currentPeriod==='1w') startTime.setDate(now.getDate()-7);
        else if(this.currentPeriod==='1m') startTime.setDate(now.getDate()-30);
        else if(this.currentPeriod==='1y') startTime.setFullYear(now.getFullYear()-1);

        const filtered = this.allTransactions.filter(t => new Date(t.created_at) >= startTime && !t.is_escrow && !t.category.includes('exchange')).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
        let labels=[], inc=[], exp=[], prof=[];
        filtered.forEach(t => {
            labels.push(new Date(t.created_at).toLocaleDateString('tr-TR'));
            const v = parseFloat(t.amount) * (this.liveRates[t.currency] || 1) / this.liveRates[targetCurrency];
            if(t.type==='income') { inc.push(v); exp.push(0); prof.push(v); } else { inc.push(0); exp.push(v); prof.push(-v); }
        });
        if(this.chartInstance) this.chartInstance.destroy();
        this.chartInstance = new Chart(ctx, {
            type: 'line', data: { labels: labels.length?labels:['Wait'], datasets: [{label:'Net', data:prof, borderColor:'#10b981', hidden:!this.chartState.profit}, {label:'Ciro', data:inc, borderColor:'#3b82f6', hidden:!this.chartState.income}, {label:'Gider', data:exp, borderColor:'#ef4444', hidden:!this.chartState.expense}] },
            options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} }
        });
    },

    translateCat: function(cat) { const d={'rent':'Kira','bills':'Fatura','visa_service':'Vize','extra_service':'Ek Hizmet','escrow_deposit':'Emanet Girişi','escrow_refund':'Emanet İadesi','exchange_in':'Döviz Giriş','exchange_out':'Döviz Çıkış','archived_escrow':'Emanet (Kapandı)'}; return d[cat]||cat; },
    updateText: function(id, t) { const el = document.getElementById(id); if(el) el.innerText = t; },
    fmt: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); },
    toggleChartData: function(t,e){ this.chartState[t]=!this.chartState[t]; e.classList.toggle('inactive'); this.updateCardStatus(t); this.updateChartRender(); },
    updateCardStatus: function(t){ const el=document.getElementById(t==='profit'?'lbl-profit':(t==='income'?'lbl-income':'lbl-expense')); if(el) el.innerText=`${t==='profit'?'NET KÂR':(t==='income'?'TOPLAM CİRO':'TOPLAM GİDER')} ${this.chartState[t]?'(AÇIK)':'(KAPALI)'}`; },
    filterChartDate: function(p,b){ document.querySelectorAll('.time-btn').forEach(e=>e.classList.remove('active')); b.classList.add('active'); this.currentPeriod=p; this.updateChartRender(); },
    
    // Kayıtlar
    saveExpense: async function(e){ e.preventDefault(); this.genericSave('expense','modal-expense'); },
    saveExtraIncome: async function(e){ e.preventDefault(); this.genericSave('income','modal-extra-income'); },
    saveEscrow: async function(e){ e.preventDefault(); this.genericSave('income','modal-escrow',true); },
    saveExchange: async function(e){ e.preventDefault(); const oa=document.getElementById('ex-out-amt').value, oc=document.getElementById('ex-out-curr').value, ia=document.getElementById('ex-in-amt').value, ic=document.getElementById('ex-in-curr').value; await window.supabaseClient.from('transactions').insert([{type:'expense',category:'exchange_out',description:'Döviz Bozum',amount:oa,currency:oc},{type:'income',category:'exchange_in',description:'Döviz Giriş',amount:ia,currency:ic}]); window.ui.closeModal('modal-exchange'); this.refreshDashboard(); },
    genericSave: async function(type, modalId, isEscrow=false) {
        let cat='general', desc='', amt=0, curr='TRY';
        if(modalId==='modal-expense'){ cat=document.getElementById('exp-category').value; desc=document.getElementById('exp-title').value; amt=document.getElementById('exp-amount').value; curr=document.getElementById('exp-currency').value; }
        else if(modalId==='modal-extra-income'){ cat='extra_service'; desc=document.getElementById('ei-customer').value; amt=document.getElementById('ei-amount').value; curr=document.getElementById('ei-currency').value; }
        else if(modalId==='modal-escrow'){ cat='escrow_deposit'; desc=document.getElementById('esc-customer').value; amt=document.getElementById('esc-amount').value; curr=document.getElementById('esc-currency').value; }
        await window.supabaseClient.from('transactions').insert({ type, category: cat, description: desc, amount: amt, currency: curr, is_escrow: isEscrow });
        window.ui.closeModal(modalId); this.refreshDashboard();
    },
    openTransactionDetail: function(id){}
};

window.addEventListener('load', () => { 
    window.accounting.refreshDashboard(); 
    if(document.getElementById('form-expense')) document.getElementById('form-expense').onsubmit=window.accounting.saveExpense;
    if(document.getElementById('form-extra-income')) document.getElementById('form-extra-income').onsubmit=window.accounting.saveExtraIncome;
    if(document.getElementById('form-escrow')) document.getElementById('form-escrow').onsubmit=window.accounting.saveEscrow;
    if(document.getElementById('form-exchange')) document.getElementById('form-exchange').onsubmit=window.accounting.saveExchange;
    if(document.getElementById('form-escrow-action')) document.getElementById('form-escrow-action').onsubmit=window.accounting.saveEscrowAction;
});
