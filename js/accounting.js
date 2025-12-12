// js/accounting.js - VIZERIO PRO (EMANET// js/accounting.js - VIZERIO PRO (FİNAL BİRLEŞTİRİLMİŞ SÜRÜM - V10.0)

window.accounting = {
    
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null,
    chartState: { profit: true, income: true, expense: true },
    currentPeriod: 'all',
    allTransactions: [],
    escrowTotals: { EUR: 0, USD: 0, TRY: 0 },
    activeEscrowTab: 'EUR',
    currentUserEmail: 'Bilinmiyor',
    userIP: '0.0.0.0',
    
    // 1. SİSTEMİ BAŞLAT
    refreshDashboard: async function() {
        console.log("🚀 Sistem Başlatılıyor...");
        
        if (!window.supabaseClient) return alert("KRİTİK HATA: Veritabanı bağlantısı yok!");

        // Kullanıcı ve IP Bilgisi
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if(user && user.email) this.currentUserEmail = user.email;
            const ipRes = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipRes.json();
            this.userIP = ipData.ip;
        } catch(e) {}

        // Kurlar
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

        if (error) {
            console.error("Veri Hatası:", error);
            document.getElementById('transactions-body').innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Hata: ${error.message}</td></tr>`;
            return;
        }
        
        this.allTransactions = list || [];
        this.calculateStats(this.allTransactions);
        this.renderTable(this.allTransactions);
        this.updateCardStatus('profit'); 
        this.updateCardStatus('income'); 
        this.updateCardStatus('expense');
        setTimeout(() => this.updateChartRender(), 200);
    },

    // 2. YENİ EK GELİR KAYDI (GELİR + MALİYET + DOSYA)
    saveExtraIncomeNew: async function(e) {
        e.preventDefault();
        const btn = document.querySelector('#form-extra-income button[type="submit"]');
        const oldText = btn.innerText;
        btn.disabled = true; btn.innerText = "İşleniyor...";

        try {
            const customer = document.getElementById('ei-customer').value;
            const category = document.getElementById('ei-category').value;
            const desc = document.getElementById('ei-desc').value;
            const incomeAmt = document.getElementById('ei-amount').value;
            const currency = document.getElementById('ei-currency').value;
            
            // Dosya Notu
            const fileInput = document.getElementById('ei-file');
            let fileNote = "";
            if(fileInput.files.length > 0) fileNote = ` [Dosya: ${fileInput.files[0].name}]`;

            const fullDesc = `${customer} - ${desc}${fileNote}`;

            // İşlem Listesi (Gelir kesin var)
            const transactions = [
                {
                    type: 'income',
                    category: 'extra_service',
                    description: fullDesc,
                    amount: incomeAmt,
                    currency: currency,
                    is_escrow: false,
                    created_by: this.currentUserEmail,
                    user_ip: this.userIP
                }
            ];

            // Maliyet varsa Gider de ekle
            const hasCost = document.getElementById('ei-has-cost').checked;
            if (hasCost) {
                const costAmt = document.getElementById('ei-cost-amount').value;
                if (costAmt > 0) {
                    transactions.push({
                        type: 'expense',
                        category: 'service_cost',
                        description: `Maliyet: ${fullDesc}`,
                        amount: costAmt,
                        currency: currency,
                        is_escrow: false,
                        created_by: this.currentUserEmail,
                        user_ip: this.userIP
                    });
                }
            }

            const { error } = await window.supabaseClient.from('transactions').insert(transactions);
            if (error) throw error;

            alert("✅ İşlem başarıyla kaydedildi.");
            window.ui.closeModal('modal-extra-income');
            document.getElementById('form-extra-income').reset();
            document.getElementById('ei-file-text').innerText = "Dosya seçmek için tıklayın";
            document.getElementById('cost-box').style.display = 'none';
            this.refreshDashboard();

        } catch (err) { alert("Hata: " + err.message); } 
        finally { btn.disabled = false; btn.innerText = oldText; }
    },

    // 3. DİĞER KAYITLAR (GİDER, EMANET GİRİŞİ)
    genericSave: async function(type, modalId, isEscrow=false) {
        const form = document.querySelector(`#${modalId} form`);
        const btn = form.querySelector('button');
        const oldText = btn.innerText;
        btn.disabled = true; btn.innerText = "⏳...";

        try {
            let cat='general', desc='', amt=0, curr='TRY';
            if(modalId==='modal-expense'){ 
                cat=document.getElementById('exp-category').value; 
                desc=document.getElementById('exp-title').value; 
                amt=document.getElementById('exp-amount').value; 
                curr=document.getElementById('exp-currency').value; 
            }
            else if(modalId==='modal-escrow'){ 
                cat='escrow_deposit'; 
                desc=document.getElementById('esc-customer').value; 
                amt=document.getElementById('esc-amount').value; 
                curr=document.getElementById('esc-currency').value; 
            }

            if(!amt || amt<=0) throw new Error("Lütfen tutar giriniz.");

            const { error } = await window.supabaseClient.from('transactions').insert({ 
                type: type, category: cat, description: desc, amount: amt, currency: curr, is_escrow: isEscrow,
                created_by: this.currentUserEmail, user_ip: this.userIP
            });

            if (error) throw error;

            alert("✅ Kayıt Başarılı!");
            window.ui.closeModal(modalId);
            form.reset();
            this.refreshDashboard();

        } catch (err) { alert("🛑 HATA: " + err.message); } 
        finally { btn.disabled = false; btn.innerText = oldText; }
    },

    // 4. EMANET İŞLEM (ÇIKIŞ/İADE/SİLME)
    saveEscrowAction: async function(e) {
        e.preventDefault();
        const btn = document.querySelector('#form-escrow-action button[type="submit"]'); 
        const oldText = btn.innerText;
        btn.disabled = true; btn.innerText = "İşleniyor...";

        try {
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
            else if (type === 'profit') { category = 'visa_service'; descPrefix = 'GELİR: '; }

            const { error: insertError } = await window.supabaseClient.from('transactions').insert({
                type: 'expense', category: category, description: `${descPrefix}${refName} - ${note}`,
                amount: amount, currency: currency, is_escrow: true, created_at: new Date(),
                created_by: this.currentUserEmail, user_ip: this.userIP
            });
            if(insertError) throw insertError;

            await window.supabaseClient.from('transactions').update({ category: 'archived_escrow' }).eq('id', sourceId);

            window.ui.closeModal('modal-escrow-action');
            this.refreshDashboard(); 
            setTimeout(() => { this.openEscrowDetails(); alert("✅ İşlem Tamamlandı."); }, 500);

        } catch (err) { alert("🛑 Hata: " + err.message); } 
        finally { btn.disabled = false; btn.innerText = oldText; }
    },

    // 5. EMANET GÖRÜNTÜLEME (AKILLI SEKME)
    openEscrowDetails: function() {
        window.ui.openModal('modal-escrow-details');
        this.calculateStats(this.allTransactions);
        // Son aktif işlemi bul
        const lastActive = this.allTransactions.find(t => this.isEscrowItem(t) && t.type === 'income' && t.category !== 'archived_escrow');
        this.switchEscrowTab(lastActive ? lastActive.currency : 'EUR');
    },

    switchEscrowTab: function(currency, btnElement) {
        this.activeEscrowTab = currency;
        const btns = document.querySelectorAll('.esc-tab-btn');
        if(btns.length > 0) { btns.forEach(b => { b.classList.remove('active'); if(b.innerText.includes(currency)) b.classList.add('active'); }); }
        if(btnElement) btnElement.classList.add('active');

        const container = document.getElementById('escrow-dynamic-content');
        if(!container) return;

        const bgClass = `big-bg-${currency.toLowerCase()}`;
        const icon = currency === 'EUR' ? 'euro' : (currency === 'USD' ? 'attach_money' : 'currency_lira');
        
        let html = `<div class="big-escrow-card ${bgClass}"><div><div class="big-esc-label">AKTİF ${currency} EMANETİ</div><div class="big-esc-amount">${this.fmt(this.escrowTotals[currency], currency)}</div></div><span class="material-icons-round big-esc-icon">${icon}</span></div>`;
        
        const list = this.allTransactions.filter(t => this.isEscrowItem(t) && t.currency === currency && t.type === 'income' && t.category !== 'archived_escrow').sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        
        html += `<div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02);"><div style="padding:15px 20px; border-bottom:1px solid #f1f5f9; background: #fff; display:flex; justify-content:space-between;"><span style="font-weight: 700; color: #64748b; font-size: 12px;">BEKLEYEN ${currency} İŞLEMLERİ</span><span style="font-size:11px; color:#94a3b8;">${list.length} Kayıt</span></div><div class="table-container" style="max-height: 350px; overflow-y: auto;"><table class="data-table" style="margin:0;"><thead style="position: sticky; top: 0; background: white; z-index: 10;"><tr><th style="width: 120px;">Tarih</th><th>Müşteri / Açıklama</th><th style="text-align: right;">Tutar</th><th style="text-align: center; width: 100px;">İşlem</th></tr></thead><tbody>`;

        if(list.length === 0) html += `<tr><td colspan="4" style="text-align:center; padding:40px; color:#94a3b8;">Bu para biriminde aktif emanet yok.<br><small>Diğer sekmeleri kontrol ediniz.</small></td></tr>`;
        else list.forEach(t => { html += `<tr class="row-hover" style="cursor:pointer;" ondblclick="accounting.openEscrowAction('${t.id}')" title="Çift Tıkla"><td style="padding:15px; font-size:13px; color:#64748b;">${new Date(t.created_at).toLocaleDateString('tr-TR')}</td><td style="padding:15px; font-weight:600; color:#334155;">${t.description}</td><td style="padding:15px; text-align:right; font-weight:800; font-size:14px; color:#10b981;">+ ${this.fmt(t.amount, t.currency)}</td><td style="padding:15px; text-align:center;"><span class="badge" style="background:#ecfdf5; color:#059669; font-weight:700; font-size:10px;">AKTİF</span></td></tr>`; });
        html += `</tbody></table></div></div>`;
        container.innerHTML = html;
    },

    // --- YARDIMCILAR ---
    isEscrowItem: function(t) { return t.is_escrow === true || (t.category && t.category.toLowerCase().includes('escrow')); },
    calculateStats: function(list) {
        const sel = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        let wT=0, wU=0, wE=0, tI=0, tE=0, eT=0; this.escrowTotals = { EUR: 0, USD: 0, TRY: 0 };
        list.forEach(t => {
            const a = parseFloat(t.amount); const isE = this.isEscrowItem(t);
            if (t.type === 'income') { if(t.currency==='TRY')wT+=a; if(t.currency==='USD')wU+=a; if(t.currency==='EUR')wE+=a; } else { if(t.currency==='TRY')wT-=a; if(t.currency==='USD')wU-=a; if(t.currency==='EUR')wE-=a; }
            if (isE && t.category !== 'archived_escrow') { if(t.type==='income') this.escrowTotals[t.currency]+=a; else this.escrowTotals[t.currency]-=a; const v=(a*(this.liveRates[t.currency]||1))/this.liveRates[sel]; if(t.type==='income')eT+=v; else eT-=v; }
            else if (!t.category.toLowerCase().includes('exchange')) { const v=(a*(this.liveRates[t.currency]||1))/this.liveRates[sel]; if(t.type==='income')tI+=v; else tE+=v; }
        });
        this.updateText('wallet-try', this.fmt(wT,'TRY')); this.updateText('wallet-usd', this.fmt(wU,'USD')); this.updateText('wallet-eur', this.fmt(wE,'EUR'));
        const tot = (wT + (wU*this.liveRates.USD) + (wE*this.liveRates.EUR)) / this.liveRates[sel];
        this.updateText('total-equity', this.fmt(tot, sel)); this.updateText('money-profit', this.fmt(tI-tE, sel)); this.updateText('money-income', this.fmt(tI, sel)); this.updateText('money-expense', this.fmt(tE, sel)); this.updateText('money-escrow', this.fmt(eT, sel));
    },
    updateChartRender: function() {
        const ctx = document.getElementById('financeChart'); if(!ctx) return;
        const tc = document.getElementById('chart-currency').value; const now=new Date(); let st=new Date(0);
        if(this.currentPeriod==='24h') st.setHours(now.getHours()-24); else if(this.currentPeriod==='1w') st.setDate(now.getDate()-7); else if(this.currentPeriod==='1m') st.setDate(now.getDate()-30); else if(this.currentPeriod==='1y') st.setFullYear(now.getFullYear()-1);
        const f = this.allTransactions.filter(t => new Date(t.created_at) >= st && !this.isEscrowItem(t) && !t.category.toLowerCase().includes('exchange')).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
        let l=[],i=[],e=[],p=[]; f.forEach(t => { l.push(new Date(t.created_at).toLocaleDateString('tr-TR')); const v = parseFloat(t.amount)*(this.liveRates[t.currency]||1)/this.liveRates[tc]; if(t.type==='income'){i.push(v);e.push(0);p.push(v);}else{i.push(0);e.push(v);p.push(-v);} });
        if(this.chartInstance) this.chartInstance.destroy();
        this.chartInstance = new Chart(ctx, { type:'line', data:{labels:l.length?l:['Wait'],datasets:[{label:'Net',data:p,borderColor:'#10b981',hidden:!this.chartState.profit},{label:'Ciro',data:i,borderColor:'#3b82f6',hidden:!this.chartState.income},{label:'Gider',data:e,borderColor:'#ef4444',hidden:!this.chartState.expense}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}} });
    },
    translateCat: function(c) { const d={'rent':'Kira','bills':'Fatura','visa_service':'Vize Hizmeti','extra_service':'Ek Hizmet','escrow_deposit':'Emanet Girişi','escrow_refund':'Emanet İadesi','service_cost':'Hizmet Maliyeti','exchange_in':'Döviz Giriş','exchange_out':'Döviz Çıkış','archived_escrow':'Emanet (Kapandı)'}; return d[c]||c; },
    renderTable: function(l) {
        const tb = document.getElementById('transactions-body'); if(!tb) return; tb.innerHTML = '';
        if (l.length === 0) { tb.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px;">Kayıt yok.</td></tr>'; return; }
        l.forEach(t => {
            let cl='row-expense', txt='text-red', sym='-';
            if(t.type==='income'){ cl='row-income'; txt='text-green'; sym='+'; }
            if(this.isEscrowItem(t)){ cl='row-escrow'; txt='text-orange'; } 
            if(t.category && t.category.toLowerCase().includes('exchange')){ cl='row-transfer'; txt='text-primary'; sym='💱'; }
            let cn = this.translateCat(t.category); if(t.category === 'archived_escrow') { cn = 'EMANET (KAPANDI)'; cl = 'row-escrow'; }
            tb.innerHTML += `<tr class="${cl}" onclick="accounting.openTransactionDetail('${t.id}')"><td>${new Date(t.created_at).toLocaleDateString('tr-TR')}</td><td>${t.description}</td><td style="font-size:11px; font-weight:700;">${cn.toUpperCase()}</td><td class="${txt}" style="text-align:right; font-weight:800;">${sym} ${this.fmt(t.amount, t.currency)}</td></tr>`;
        });
    },
    // Yardımcılar
    updateText: function(i, t) { const e = document.getElementById(i); if(e) e.innerText = t; },
    fmt: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); },
    toggleChartData: function(t,e){ this.chartState[t]=!this.chartState[t]; e.classList.toggle('inactive'); this.updateCardStatus(t); this.updateChartRender(); },
    updateCardStatus: function(t){ const el=document.getElementById(t==='profit'?'lbl-profit':(t==='income'?'lbl-income':'lbl-expense')); if(el) el.innerText=`${t==='profit'?'NET KÂR':(t==='income'?'TOPLAM CİRO':'TOPLAM GİDER')} ${this.chartState[t]?'(AÇIK)':'(KAPALI)'}`; },
    filterChartDate: function(p,b){ document.querySelectorAll('.time-btn').forEach(e=>e.classList.remove('active')); b.classList.add('active'); this.currentPeriod=p; this.updateChartRender(); },
    saveExchange: async function(e){ e.preventDefault(); const oa=document.getElementById('ex-out-amt').value, oc=document.getElementById('ex-out-curr').value, ia=document.getElementById('ex-in-amt').value, ic=document.getElementById('ex-in-curr').value; await window.supabaseClient.from('transactions').insert([{type:'expense',category:'exchange_out',description:'Döviz Bozum',amount:oa,currency:oc,created_by:this.currentUserEmail,user_ip:this.userIP},{type:'income',category:'exchange_in',description:'Döviz Giriş',amount:ia,currency:ic,created_by:this.currentUserEmail,user_ip:this.userIP}]); window.ui.closeModal('modal-exchange'); this.refreshDashboard(); },
    deleteEscrowTransaction: async function(){ const id=document.getElementById('act-source-id').value; if(confirm("Silinecek mi?")){ await window.supabaseClient.from('transactions').delete().eq('id',id); window.ui.closeModal('modal-escrow-action'); this.refreshDashboard(); setTimeout(()=>this.openEscrowDetails(),500); } },
    openEscrowAction: function(txId) { const tx = this.allTransactions.find(t => t.id === txId); if(!tx) return; document.getElementById('act-source-id').value=tx.id; document.getElementById('act-currency').value=tx.currency; document.getElementById('act-desc-display').innerText=tx.description; document.getElementById('act-amount-display').innerText=this.fmt(tx.amount, tx.currency); document.getElementById('act-amount').value=tx.amount; document.getElementById('act-note').value=""; window.ui.openModal('modal-escrow-action'); },
    openEscrowActionSimple: async function(){ const c=this.activeEscrowTab; const a=prompt(`Hızlı Çıkış (${c}):`); if(a){ await window.supabaseClient.from('transactions').insert({type:'expense', category:'escrow_refund', description:'Hızlı Çıkış', amount:a, currency:c, is_escrow:true, created_by:this.currentUserEmail, user_ip:this.userIP}); this.refreshDashboard(); setTimeout(()=>this.openEscrowDetails(),500); } },
    openTransactionDetail: function(txId) {
        const tx = this.allTransactions.find(t => t.id === txId); if(!tx) return;
        document.getElementById('td-amount').innerText = this.fmt(tx.amount, tx.currency); document.getElementById('td-amount').className = tx.type === 'income' ? 'receipt-amount text-green' : 'receipt-amount text-red'; document.getElementById('td-cat').innerText = this.translateCat(tx.category).toUpperCase(); document.getElementById('td-date').innerText = new Date(tx.created_at).toLocaleString('tr-TR'); document.getElementById('td-id').innerText = tx.id; document.getElementById('td-desc').innerText = tx.description;
        document.getElementById('td-created-by').innerText = tx.created_by || 'Eski Kayıt'; document.getElementById('td-ip').innerText = tx.user_ip || '-';
        this.selectedTxId = txId; window.ui.openModal('modal-transaction-detail');
    },
    deleteTransaction: async function(){ if(!this.selectedTxId) return; if(!confirm("Silmek istiyor musunuz?")) return; await window.supabaseClient.from('transactions').delete().eq('id', this.selectedTxId); window.ui.closeModal('modal-transaction-detail'); this.refreshDashboard(); },
    downloadBackup: function(){ if(!this.allTransactions.length) return alert("Veri yok."); let c="data:text/csv;charset=utf-8,Tarih,Aciklama,Tutar,Birim,Tip,Kategori,IP,Kullanici\n"; this.allTransactions.forEach(t=>{c+=`${new Date(t.created_at).toLocaleDateString()},"${t.description.replace(/"/g,'""')}",${t.amount},${t.currency},${t.type},${t.category},${t.user_ip||''},${t.created_by||''}\n`}); const e=encodeURI(c); const l=document.createElement("a"); l.setAttribute("href",e); l.setAttribute("download","Vizerio_Yedek.csv"); document.body.appendChild(l); l.click(); document.body.removeChild(l); }
};

// BUTON BAĞLANTILARI (FİX)
window.addEventListener('load', () => { 
    window.accounting.refreshDashboard(); 
    if(document.getElementById('form-expense')) document.getElementById('form-expense').onsubmit = (e) => { e.preventDefault(); window.accounting.genericSave('expense', 'modal-expense'); };
    if(document.getElementById('form-extra-income')) document.getElementById('form-extra-income').onsubmit = (e) => window.accounting.saveExtraIncomeNew(e);
    if(document.getElementById('form-escrow')) document.getElementById('form-escrow').onsubmit = (e) => { e.preventDefault(); window.accounting.genericSave('income', 'modal-escrow', true); };
    if(document.getElementById('form-exchange')) document.getElementById('form-exchange').onsubmit = (e) => window.accounting.saveExchange(e);
    if(document.getElementById('form-escrow-action')) document.getElementById('form-escrow-action').onsubmit = (e) => window.accounting.saveEscrowAction(e);
});
 FİKS SÜRÜM)
