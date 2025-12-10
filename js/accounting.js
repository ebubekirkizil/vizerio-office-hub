// js/accounting.js - VIZERIO PRO (IP DENETİM & GÜVENLİK MODU)

window.accounting = {
    
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null,
    chartState: { profit: true, income: true, expense: true },
    currentPeriod: 'all',
    allTransactions: [],
    escrowTotals: { EUR: 0, USD: 0, TRY: 0 },
    activeEscrowTab: 'EUR',
    
    // GÜVENLİK VERİLERİ
    currentUserEmail: 'Bilinmiyor',
    userIP: '0.0.0.0',

    // 1. SİSTEMİ BAŞLAT
    refreshDashboard: async function() {
        console.log("🚀 Güvenlik Protokolleri ve Veriler Yükleniyor...");
        
        if (!window.supabaseClient) return alert("HATA: Veritabanı yok!");

        // A. KULLANICI E-POSTASINI BUL
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if(user && user.email) {
                this.currentUserEmail = user.email;
                if(document.getElementById('p-email')) document.getElementById('p-email').value = user.email;
            }
        } catch(e) {}

        // B. IP ADRESİNİ BUL (Dış Servis)
        try {
            const ipRes = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipRes.json();
            this.userIP = ipData.ip;
            if(document.getElementById('current-user-ip')) 
                document.getElementById('current-user-ip').innerText = this.userIP;
        } catch(e) { console.warn("IP Bulunamadı"); }

        // C. KURLARI ÇEK
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const d = await res.json();
            this.liveRates = { TRY: 1, USD: (1/d.rates.USD), EUR: (1/d.rates.EUR) };
            if(document.getElementById('live-rates-display')) 
                document.getElementById('live-rates-display').innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
        } catch (e) {}

        // D. VERİLERİ ÇEK
        const { data: list, error } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) { console.error("Veri Hatası:", error); return; }
        
        this.allTransactions = list || [];
        this.calculateStats(this.allTransactions);
        this.renderTable(this.allTransactions);
        this.updateCardStatus('profit'); this.updateCardStatus('income'); this.updateCardStatus('expense');
        setTimeout(() => this.updateChartRender(), 200);
    },

    // 2. KAYIT (IP VE EMAIL İLE BİRLİKTE)
    genericSave: async function(type, modalId, isEscrow=false) {
        const form = document.querySelector(`#${modalId} form`);
        const btn = form.querySelector('button');
        const oldText = btn.innerText;
        btn.disabled = true; btn.innerText = "⏳...";

        try {
            let cat='general', desc='', amt=0, curr='TRY';
            if(modalId==='modal-expense'){ cat=document.getElementById('exp-category').value; desc=document.getElementById('exp-title').value; amt=document.getElementById('exp-amount').value; curr=document.getElementById('exp-currency').value; }
            else if(modalId==='modal-extra-income'){ cat='extra_service'; desc=document.getElementById('ei-customer').value; amt=document.getElementById('ei-amount').value; curr=document.getElementById('ei-currency').value; }
            else if(modalId==='modal-escrow'){ cat='escrow_deposit'; desc=document.getElementById('esc-customer').value; amt=document.getElementById('esc-amount').value; curr=document.getElementById('esc-currency').value; }

            if(!amt || amt<=0) throw new Error("Tutar giriniz.");

            // VERİTABANINA IP VE KULLANICI BİLGİSİYLE KAYDET
            const { error } = await window.supabaseClient.from('transactions').insert({ 
                type: type, 
                category: cat, 
                description: desc, 
                amount: amt, 
                currency: curr, 
                is_escrow: isEscrow,
                created_by: this.currentUserEmail, // Sabit Kimlik
                user_ip: this.userIP               // Sabit IP
            });

            if (error) throw error;

            window.ui.closeModal(modalId); form.reset(); this.refreshDashboard();
            alert("✅ Kayıt ve Denetim Bilgisi Eklendi.");
        } catch (err) { alert("🛑 HATA: " + err.message); } 
        finally { btn.disabled = false; btn.innerText = oldText; }
    },

    // 3. İŞLEM DETAYINI GÖR (IP GÖSTEREN VERSİYON)
    openTransactionDetail: function(txId) {
        const tx = this.allTransactions.find(t => t.id === txId);
        if(!tx) return;
        
        // Temel Bilgiler
        document.getElementById('td-amount').innerText = this.fmt(tx.amount, tx.currency);
        document.getElementById('td-amount').className = tx.type === 'income' ? 'receipt-amount text-green' : 'receipt-amount text-red';
        document.getElementById('td-cat').innerText = this.translateCat(tx.category).toUpperCase();
        document.getElementById('td-date').innerText = new Date(tx.created_at).toLocaleString('tr-TR');
        document.getElementById('td-id').innerText = tx.id;
        document.getElementById('td-desc').innerText = tx.description;

        // GÜVENLİK BİLGİLERİ (VERİTABANINDAN)
        // Eğer eski kayıtsa ve bilgi yoksa 'Bilinmiyor' yaz.
        document.getElementById('td-created-by').innerText = tx.created_by || 'Sistem / Eski Kayıt';
        document.getElementById('td-ip').innerText = tx.user_ip || 'Kayıtlı Değil';

        this.selectedTxId = txId;
        window.ui.openModal('modal-transaction-detail');
    },

    // --- DİĞER FONKSİYONLAR (AYNI) ---
    saveEscrowAction: async function(e) {
        e.preventDefault(); const btn = document.querySelector('#form-escrow-action button[type="submit"]'); const oldText = btn.innerText; btn.disabled=true; btn.innerText="...";
        try {
            const sourceId=document.getElementById('act-source-id').value; const type=document.getElementById('act-type').value; const amt=document.getElementById('act-amount').value; const note=document.getElementById('act-note').value; const curr=document.getElementById('act-currency').value;
            const sourceTx=this.allTransactions.find(t=>t.id===sourceId); const refName=sourceTx?sourceTx.description.split('-')[0]:'Kayıt';
            let cat='escrow_refund', descPrefix='İADE: ';
            if(type==='payment'){cat='escrow_payment'; descPrefix='ÖDEME: ';} else if(type==='profit'){cat='visa_service'; descPrefix='GELİR: ';}
            
            await window.supabaseClient.from('transactions').insert({
                type:'expense', category:cat, description:`${descPrefix}${refName} - ${note}`, amount:amt, currency:curr, is_escrow:true, created_at:new Date(),
                created_by: this.currentUserEmail, user_ip: this.userIP 
            });
            await window.supabaseClient.from('transactions').update({category:'archived_escrow'}).eq('id',sourceId);
            window.ui.closeModal('modal-escrow-action'); this.refreshDashboard(); setTimeout(()=>{this.openEscrowDetails();alert("✅ İşlem Tamamlandı.");},500);
        } catch(err){alert(err.message);} finally{btn.disabled=false; btn.innerText=oldText;}
    },
    // ... (calculateStats, renderTable, updateChartRender, switchEscrowTab vb. önceki kodların aynısı) ...
    // Yer kazanmak için standart kısımları buraya tekrar uzun uzun yazmadım, önceki çalışan versiyonla aynıdır.
    // Ancak hata olmaması için bu dosyanın tamamını kullanırken, önceki cevabımdaki 'calculateStats', 'renderTable' vb. fonksiyonları da buraya eklemeyi unutma.
    // YA DA: Sadece 'genericSave', 'saveEscrowAction', 'openTransactionDetail' ve 'refreshDashboard' fonksiyonlarını güncelle.
    
    // KOLAYLIK OLSUN DİYE GEREKLİ TÜM FONKSİYONLARI AŞAĞIYA EKLİYORUM:
    calculateStats: function(list){const sel=document.getElementById('chart-currency').value; let wT=0,wU=0,wE=0,tI=0,tE=0,eT=0; this.escrowTotals={EUR:0,USD:0,TRY:0}; list.forEach(t=>{const a=parseFloat(t.amount); if(t.type==='income'){if(t.currency==='TRY')wT+=a;if(t.currency==='USD')wU+=a;if(t.currency==='EUR')wE+=a;}else{if(t.currency==='TRY')wT-=a;if(t.currency==='USD')wU-=a;if(t.currency==='EUR')wE-=a;} if(t.is_escrow){if(t.type==='income')this.escrowTotals[t.currency]+=a;else this.escrowTotals[t.currency]-=a; const v=(a*(this.liveRates[t.currency]||1))/this.liveRates[sel]; if(t.type==='income')eT+=v;else eT-=v;} else if(!t.category.includes('exchange')){const v=(a*(this.liveRates[t.currency]||1))/this.liveRates[sel]; if(t.type==='income')tI+=v;else tE+=v;}}); this.updateText('wallet-try',this.fmt(wT,'TRY')); this.updateText('wallet-usd',this.fmt(wU,'USD')); this.updateText('wallet-eur',this.fmt(wE,'EUR')); const tot=(wT+wU*this.liveRates.USD+wE*this.liveRates.EUR)/this.liveRates[sel]; this.updateText('total-equity',this.fmt(tot,sel)); this.updateText('money-profit',this.fmt(tI-tE,sel)); this.updateText('money-income',this.fmt(tI,sel)); this.updateText('money-expense',this.fmt(tE,sel)); this.updateText('money-escrow',this.fmt(eT,sel));},
    openEscrowDetails: function(){window.ui.openModal('modal-escrow-details'); this.calculateStats(this.allTransactions); this.switchEscrowTab(this.activeEscrowTab);},
    switchEscrowTab: function(c,b){this.activeEscrowTab=c; if(b){document.querySelectorAll('.esc-tab-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active');} const con=document.getElementById('escrow-dynamic-content'); if(!con)return; const bg=`big-bg-${c.toLowerCase()}`; const ico=c==='EUR'?'euro':(c==='USD'?'attach_money':'currency_lira'); let h=`<div class="big-escrow-card ${bg}"><div><div class="big-esc-label">AKTİF ${c} EMANETİ</div><div class="big-esc-amount">${this.fmt(this.escrowTotals[c],c)}</div></div><span class="material-icons-round big-esc-icon">${ico}</span></div>`; const l=this.allTransactions.filter(t=>t.is_escrow&&t.currency===c&&t.type==='income'&&t.category!=='archived_escrow').sort((x,y)=>new Date(y.created_at)-new Date(x.created_at)); h+=`<div style="background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;"><div style="padding:15px;border-bottom:1px solid #f1f5f9;font-weight:700;color:#64748b;font-size:12px;">BEKLEYEN İŞLEMLER</div><div class="table-container" style="max-height:300px;overflow-y:auto;"><table class="data-table" style="margin:0;"><tbody>`; if(l.length===0)h+=`<tr><td colspan="4" style="text-align:center;padding:30px;color:#94a3b8;">Bekleyen işlem yok.</td></tr>`; else l.forEach(t=>{h+=`<tr class="row-hover" style="cursor:pointer;" ondblclick="accounting.openEscrowAction('${t.id}')"><td>${new Date(t.created_at).toLocaleDateString('tr-TR')}</td><td>${t.description}</td><td style="text-align:right;font-weight:700;color:#10b981;">+ ${this.fmt(t.amount,t.currency)}</td><td style="text-align:center;"><span class="badge" style="background:#ecfdf5;color:#059669;font-weight:700;font-size:10px;">AKTİF</span></td></tr>`;}); h+=`</tbody></table></div></div>`; con.innerHTML=h;},
    openEscrowAction: function(id){const t=this.allTransactions.find(x=>x.id===id); if(!t)return; document.getElementById('act-source-id').value=id; document.getElementById('act-currency').value=t.currency; document.getElementById('act-desc-display').innerText=t.description; document.getElementById('act-amount-display').innerText=this.fmt(t.amount,t.currency); document.getElementById('act-amount').value=t.amount; document.getElementById('act-note').value=""; window.ui.openModal('modal-escrow-action');},
    renderTable: function(l){const tb=document.getElementById('transactions-body'); if(!tb)return; tb.innerHTML=''; if(l.length===0){tb.innerHTML='<tr><td colspan="4" style="text-align:center;padding:20px;">Kayıt yok.</td></tr>';return;} l.forEach(t=>{let c='row-expense',tx='text-red',s='-'; if(t.type==='income'){c='row-income';tx='text-green';s='+';} if(t.is_escrow){c='row-escrow';tx='text-orange';} if(t.category.includes('exchange')){c='row-transfer';tx='text-primary';s='💱';} let cn=this.translateCat(t.category); if(t.category==='archived_escrow'){cn='EMANET (KAPANDI)';c='row-escrow';} tb.innerHTML+=`<tr class="${c}" onclick="accounting.openTransactionDetail('${t.id}')"><td>${new Date(t.created_at).toLocaleDateString('tr-TR')}</td><td>${t.description}</td><td style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">${cn}</td><td class="${tx}" style="text-align:right;font-weight:800;">${s} ${this.fmt(t.amount,t.currency)}</td></tr>`;});},
    updateChartRender: function(){const ctx=document.getElementById('financeChart'); if(!ctx)return; const tc=document.getElementById('chart-currency').value; const now=new Date(); let st=new Date(0); if(this.currentPeriod==='24h')st.setHours(now.getHours()-24); else if(this.currentPeriod==='1w')st.setDate(now.getDate()-7); else if(this.currentPeriod==='1m')st.setDate(now.getDate()-30); else if(this.currentPeriod==='1y')st.setFullYear(now.getFullYear()-1); const f=this.allTransactions.filter(t=>new Date(t.created_at)>=st&&!t.is_escrow&&!t.category.includes('exchange')).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)); let l=[],i=[],e=[],p=[]; f.forEach(t=>{l.push(new Date(t.created_at).toLocaleDateString('tr-TR')); const v=parseFloat(t.amount)*(this.liveRates[t.currency]||1)/this.liveRates[tc]; if(t.type==='income'){i.push(v);e.push(0);p.push(v);}else{i.push(0);e.push(v);p.push(-v);}}); if(this.chartInstance)this.chartInstance.destroy(); this.chartInstance=new Chart(ctx,{type:'line',data:{labels:l.length?l:['Wait'],datasets:[{label:'Net',data:p,borderColor:'#10b981',hidden:!this.chartState.profit},{label:'Ciro',data:i,borderColor:'#3b82f6',hidden:!this.chartState.income},{label:'Gider',data:e,borderColor:'#ef4444',hidden:!this.chartState.expense}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true},x:{grid:{display:false}}}}});},
    translateCat: function(c){const d={'rent':'Kira','bills':'Fatura','visa_service':'Vize','extra_service':'Ek Hizmet','escrow_deposit':'Emanet Girişi','escrow_refund':'Emanet İadesi','exchange_in':'Döviz Giriş','exchange_out':'Döviz Çıkış','archived_escrow':'Emanet (Kapandı)'}; return d[c]||c;},
    updateText: function(i,t){const e=document.getElementById(i); if(e)e.innerText=t;},
    fmt: function(a,c){return new Intl.NumberFormat('tr-TR',{style:'currency',currency:c}).format(a);},
    saveExchange: async function(e){ e.preventDefault(); const oa=document.getElementById('ex-out-amt').value, oc=document.getElementById('ex-out-curr').value, ia=document.getElementById('ex-in-amt').value, ic=document.getElementById('ex-in-curr').value; await window.supabaseClient.from('transactions').insert([{type:'expense',category:'exchange_out',description:'Döviz Bozum',amount:oa,currency:oc,created_by:this.currentUserEmail,user_ip:this.userIP},{type:'income',category:'exchange_in',description:'Döviz Giriş',amount:ia,currency:ic,created_by:this.currentUserEmail,user_ip:this.userIP}]); window.ui.closeModal('modal-exchange'); this.refreshDashboard(); },
    filterChartDate: function(p,b){document.querySelectorAll('.time-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); this.currentPeriod=p; this.updateChartRender();},
    updateCardStatus: function(t){const el=document.getElementById(t==='profit'?'lbl-profit':(t==='income'?'lbl-income':'lbl-expense')); if(el) el.innerText=`${t==='profit'?'NET KÂR':(t==='income'?'TOPLAM CİRO':'TOPLAM GİDER')} ${this.chartState[t]?'(AÇIK)':'(KAPALI)'}`;},
    toggleChartData: function(t,e){this.chartState[t]=!this.chartState[t]; e.classList.toggle('inactive'); this.updateCardStatus(t); this.updateChartRender();},
    downloadBackup: function(){if(!this.allTransactions.length)return alert("Veri yok."); let c="data:text/csv;charset=utf-8,Tarih,Aciklama,Tutar,Birim,Tip,Kategori,IP,Kullanici\n"; this.allTransactions.forEach(t=>{c+=`${new Date(t.created_at).toLocaleDateString()},"${t.description}",${t.amount},${t.currency},${t.type},${t.category},${t.user_ip||''},${t.created_by||''}\n`}); const e=encodeURI(c); const l=document.createElement("a"); l.setAttribute("href",e); l.setAttribute("download","Vizerio_Yedek.csv"); document.body.appendChild(l); l.click(); document.body.removeChild(l);},
    deleteTransaction: async function(){if(!this.selectedTxId)return; if(!confirm("Silmek istiyor musunuz?"))return; await window.supabaseClient.from('transactions').delete().eq('id',this.selectedTxId); window.ui.closeModal('modal-transaction-detail'); this.refreshDashboard();}
};

window.addEventListener('load', () => { 
    window.accounting.refreshDashboard(); 
    if(document.getElementById('form-expense')) document.getElementById('form-expense').onsubmit = (e) => { e.preventDefault(); window.accounting.genericSave('expense', 'modal-expense'); };
    if(document.getElementById('form-extra-income')) document.getElementById('form-extra-income').onsubmit = (e) => { e.preventDefault(); window.accounting.genericSave('income', 'modal-extra-income'); };
    if(document.getElementById('form-escrow')) document.getElementById('form-escrow').onsubmit = (e) => { e.preventDefault(); window.accounting.genericSave('income', 'modal-escrow', true); };
    if(document.getElementById('form-exchange')) document.getElementById('form-exchange').onsubmit = (e) => window.accounting.saveExchange(e);
    if(document.getElementById('form-escrow-action')) document.getElementById('form-escrow-action').onsubmit = (e) => window.accounting.saveEscrowAction(e);
});
