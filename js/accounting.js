// js/accounting.js - VIZERIO PRO (EMANET FİKS SÜRÜM)

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
        console.log("🚀 Veriler Güncelleniyor...");
        if (!window.supabaseClient) return alert("HATA: Veritabanı bağlantısı yok!");

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

        if (error) console.error("Veri Hatası:", error);
        
        this.allTransactions = list || [];
        this.calculateStats(this.allTransactions);
        this.renderTable(this.allTransactions);
        this.updateCardStatus('profit'); 
        this.updateCardStatus('income'); 
        this.updateCardStatus('expense');
        setTimeout(() => this.updateChartRender(), 200);
    },

    // 2. EMANET Mİ KONTROLÜ (ESNEK - ÇOK ÖNEMLİ)
    isEscrowItem: function(t) {
        // Hem işarete bak, hem kategori ismine bak (Garanti olsun)
        if (t.is_escrow === true) return true;
        if (t.category && t.category.toLowerCase().includes('escrow')) return true;
        return false;
    },

    // 3. HESAPLAMA MOTORU
    calculateStats: function(list) {
        const selectedCurr = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        let wTRY=0, wUSD=0, wEUR=0; 
        let tInc=0, tExp=0, escTotalVal=0;
        this.escrowTotals = { EUR: 0, USD: 0, TRY: 0 };

        list.forEach(t => {
            const amt = parseFloat(t.amount);
            const isEsc = this.isEscrowItem(t);

            // KASA
            if (t.type === 'income') {
                if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt;
            } else {
                if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt;
            }

            // EMANET (Burada arşivlenenler hesaba katılmaz, sadece aktifler)
            if (isEsc && t.category !== 'archived_escrow') {
                if(t.type === 'income') this.escrowTotals[t.currency] += amt;
                else this.escrowTotals[t.currency] -= amt;
                
                const val = (amt * (this.liveRates[t.currency]||1)) / this.liveRates[selectedCurr];
                if(t.type === 'income') escTotalVal += val; else escTotalVal -= val;
            } 
            
            // KAR/ZARAR
            else if (!t.category.toLowerCase().includes('exchange')) {
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
        this.updateText('money-escrow', this.fmt(escTotalVal, selectedCurr));
    },

    // 4. EMANET DETAYLARI (AKILLI SEKME & YÜKLENİYOR FİKSİ)
    openEscrowDetails: function() {
        window.ui.openModal('modal-escrow-details');
        
        // Verileri tazelemek için tekrar hesapla
        this.calculateStats(this.allTransactions);

        // EN SON EKLENEN AKTİF EMANETİ BUL
        // Böylece sen TL girdiysen, pencere otomatik TL açılır.
        const lastActive = this.allTransactions.find(t => 
            this.isEscrowItem(t) && 
            t.type === 'income' && 
            t.category !== 'archived_escrow'
        );
        
        // Eğer aktif kayıt varsa onun para birimini aç, yoksa EUR aç
        if (lastActive && lastActive.currency) {
            console.log("Otomatik Sekme Seçildi:", lastActive.currency);
            this.switchEscrowTab(lastActive.currency);
        } else {
            this.switchEscrowTab('EUR');
        }
    },

    switchEscrowTab: function(currency, btnElement) {
        this.activeEscrowTab = currency;
        
        // Buton renklerini ayarla
        const btns = document.querySelectorAll('.esc-tab-btn');
        if(btns.length > 0) {
            btns.forEach(b => {
                b.classList.remove('active');
                if(b.innerText.includes(currency)) b.classList.add('active');
            });
        }
        if(btnElement) btnElement.classList.add('active');

        // İçerik kutusunu bul
        const container = document.getElementById('escrow-dynamic-content');
        if(!container) {
            console.error("HATA: 'escrow-dynamic-content' ID'li kutu HTML'de bulunamadı!");
            return;
        }

        // Kart Rengi ve İkonu
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

        // LİSTELEME MANTIĞI (ÇOK DİKKATLİ FİLTRE)
        const list = this.allTransactions
            .filter(t => 
                this.isEscrowItem(t) &&           // Emanet mi?
                t.currency === currency &&        // Şu anki sekme mi?
                t.type === 'income' &&            // Giriş mi?
                t.category !== 'archived_escrow'  // Arşivlenmemiş mi?
            )
            .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

        html += `
            <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                <div style="padding:15px 20px; border-bottom:1px solid #f1f5f9; background: #fff; display:flex; justify-content:space-between;">
                    <span style="font-weight: 700; color: #64748b; font-size: 12px;">BEKLEYEN ${currency} İŞLEMLERİ</span>
                    <span style="font-size:11px; color:#94a3b8;">${list.length} Kayıt</span>
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
            html += `<tr><td colspan="4" style="text-align:center; padding:40px; color:#94a3b8;">
                <span class="material-icons-round" style="font-size:32px; display:block; margin-bottom:10px; opacity:0.5;">folder_off</span>
                Bu para biriminde (${currency}) aktif emanet yok.<br>
                <small>Diğer sekmeleri (EUR/USD/TRY) kontrol ediniz.</small>
            </td></tr>`;
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
        
        // HTML'i bas
        container.innerHTML = html;
    },

    // 5. İŞLEM PENCERESİ AÇ
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

    // 6. İŞLEMİ KAYDET VE ARŞİVLE
    saveEscrowAction: async function(e) {
        e.preventDefault();
        const btn = document.querySelector('#form-escrow-action button[type="submit"]'); 
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
                amount: amount, currency: currency, is_escrow: true, created_at: new Date()
            });
            if(insertError) throw insertError;

            // Arşivle (Listeden kaldır)
            await window.supabaseClient.from('transactions').update({ category: 'archived_escrow' }).eq('id', sourceId);

            window.ui.closeModal('modal-escrow-action');
            this.refreshDashboard(); 
            setTimeout(() => { this.openEscrowDetails(); alert("✅ İşlem Tamamlandı."); }, 500);

        } catch (err) { alert("🛑 Hata: " + err.message); } 
        finally { btn.disabled = false; btn.innerText = "İŞLEMİ ONAYLA"; }
    },

    // --- DİĞERLERİ ---
    deleteEscrowTransaction: async function(){ const id=document.getElementById('act-source-id').value; if(confirm("Silinecek mi?")){ await window.supabaseClient.from('transactions').delete().eq('id',id); window.ui.closeModal('modal-escrow-action'); this.refreshDashboard(); setTimeout(()=>this.openEscrowDetails(),500); } },
    openEscrowActionSimple: async function(){ const curr = this.activeEscrowTab; const amt = prompt(`Hızlı Çıkış (${curr}):`); if(amt) { await window.supabaseClient.from('transactions').insert({ type: 'expense', category: 'escrow_refund', description: `Hızlı Çıkış`, amount: amt, currency: curr, is_escrow: true }); this.refreshDashboard(); setTimeout(() => this.openEscrowDetails(), 500); } },
    
    // --- STANDART TABLO, GRAFİK, BUTONLAR ---
    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body'); if(!tbody) return; tbody.innerHTML = '';
        if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px;">Kayıt yok.</td></tr>'; return; }
        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('t
            let cl='row-expense', txt='text-red', sym='-';
            // Esnek Emanet Kontrolü
            const isEsc = this.isEscrowItem(t);

            if(t.type==='income'){ cl='row-income'; txt='text-green'; sym='+'; }
            if(isEsc){ cl='row-escrow'; txt='text-orange'; } 
            if(t.category && t.category.toLowerCase().includes('exchange')){ cl='row-transfer'; txt='text-primary'; sym='💱'; }
            let catName = this.translateCat(t.category); 
            if(t.category === 'archived_escrow') { catName = 'EMANET (KAPANDI)'; cl = 'row-escrow'; }

            tbody.innerHTML += `<tr class="${cl}" onclick="accounting.openTransactionDetail('${t.id}')"><td>${date}</td><td>${t.description}</td><td style="font-size:11px; font-weight:700; color:#64748b;">${catName.toUpperCase()}</td><td class="${txt}" style="text-align:right; font-weight:800;">${sym} ${this.fmt(t.amount, t.currency)}</td></tr>`;
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

        const filtered = this.allTransactions.filter(t => new Date(t.created_at) >= startTime && !this.isEscrowItem(t) && !t.category.toLowerCase().includes('exchange')).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
        let labels=[], inc=[], exp=[], prof=[];
        filtered.forEach(t => {
            labels.push(new Date(t.created_at).toLocaleDateString('tr-TR'));
            const v = parseFloat(t.amount) * (this.liveRates[t.currency] || 1) / this.liveRates[targetCurrency];
            if(t.type==='income') { inc.push(v); exp.push(0); prof.push(v); } else { inc.push(0); exp.push(v); prof.push(-v); }
        });
        if(this.chartInstance) this.chartInstance.destroy();
        this.chartInstance = new Chart(ctx, { type: 'line', data: { labels: labels.length?labels:['Wait'], datasets: [{ label: 'Net Kâr', data: prof, borderColor: '#10b981', hidden:!this.chartState.profit }, { label: 'Ciro', data: inc, borderColor: '#3b82f6', hidden:!this.chartState.income }, { label: 'Gider', data: exp, borderColor: '#ef4444', hidden:!this.chartState.expense }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } });
    },
    translateCat: function(cat) { const d={'rent':'Kira','bills':'Fatura','visa_service':'Vize Hizmeti','extra_service':'Ek Hizmet','escrow_deposit':'Emanet Girişi','escrow_refund':'Emanet İadesi','escrow_service_deduction':'Hizmet Kesintisi','exchange_in':'Döviz Giriş','exchange_out':'Döviz Çıkış','archived_escrow':'Emanet (Kapandı)'}; return d[cat]||cat; },
    updateText: function(id, t) { const el = document.getElementById(id); if(el) el.innerText = t; },
    fmt: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); },
    toggleChartData: function(t,e){ this.chartState[t]=!this.chartState[t]; e.classList.toggle('inactive'); this.updateCardStatus(t); this.updateChartRender(); },
    updateCardStatus: function(t){ const el=document.getElementById(t==='profit'?'lbl-profit':(t==='income'?'lbl-income':'lbl-expense')); if(el) el.innerText=`${t==='profit'?'NET KÂR':(t==='income'?'TOPLAM CİRO':'TOPLAM GİDER')} ${this.chartState[t]?'(AÇIK)':'(KAPALI)'}`; },
    filterChartDate: function(p,b){ document.querySelectorAll('.time-btn').forEach(e=>e.classList.remove('active')); b.classList.add('active'); this.currentPeriod=p; this.updateChartRender(); },
    
    // Kayıtlar
    saveExpense: async function(e){ e.preventDefault(); this.genericSave('expense','modal-expense'); },
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

    // YENİ EK HİZMET KAYDI (GELİR + GİDER + DOSYA)
    saveExtraIncomeNew: async function(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const oldText = btn.innerText;
        btn.disabled = true; btn.innerText = "İşleniyor...";

        try {
            const customer = document.getElementById('ei-customer').value;
            const category = document.getElementById('ei-category').value;
            const desc = document.getElementById('ei-desc').value;
            const incomeAmt = document.getElementById('ei-amount').value;
            const currency = document.getElementById('ei-currency').value;
            
            // Dosya Kontrolü
            const fileInput = document.getElementById('ei-file');
            let fileNote = "";
            if(fileInput.files.length > 0) {
                fileNote = ` [Dosya: ${fileInput.files[0].name}]`;
            }

            const fullDesc = `${customer} - ${desc}${fileNote}`;

            // 1. GELİRİ KAYDET
            const transactions = [
                {
                    type: 'income',
                    category: 'extra_service', // veya category değişkeni
                    description: fullDesc,
                    amount: incomeAmt,
                    currency: currency,
                    is_escrow: false,
                    created_by: this.currentUserEmail,
                    user_ip: this.userIP
                }
            ];

            // 2. MALİYET VARSA ONU DA GİDER OLARAK EKLE
            const hasCost = document.getElementById('ei-has-cost').checked;
            if (hasCost) {
                const costAmt = document.getElementById('ei-cost-amount').value;
                if (costAmt > 0) {
                    transactions.push({
                        type: 'expense',
                        category: 'service_cost', // Hizmet Maliyeti
                        description: `Maliyet: ${fullDesc}`,
                        amount: costAmt,
                        currency: currency, // Genelde aynı para birimidir
                        is_escrow: false,
                        created_by: this.currentUserEmail,
                        user_ip: this.userIP
                    });
                }
            }

            // HEPSİNİ TEK SEFERDE GÖNDER
            const { error } = await window.supabaseClient.from('transactions').insert(transactions);

            if (error) throw error;

            alert("✅ İşlem başarıyla kaydedildi.");
            window.ui.closeModal('modal-extra-income');
            e.target.reset();
            document.getElementById('ei-file-text').innerText = "Dosya seçmek için tıklayın (PDF, JPG, PNG)";
            document.getElementById('cost-box').style.display = 'none'; // Maliyet kutusunu gizle
            this.refreshDashboard();

        } catch (err) {
            alert("Hata: " + err.message);
        } finally {
            btn.disabled = false;
            btn.innerText = oldText;
        }
    },

window.addEventListener('load', () => { 
    window.accounting.refreshDashboard(); 
    if(document.getElementById('form-expense')) document.getElementById('form-expense').onsubmit = (e) => { e.preventDefault(); window.accounting.genericSave('expense', 'modal-expense'); };
        if(document.getElementById('form-extra-income')) {
        // YENİSİ BU OLACAK:
        document.getElementById('form-extra-income').onsubmit = (e) => window.accounting.saveExtraIncomeNew(e);
    }
    if(document.getElementById('form-escrow')) document.getElementById('form-escrow').onsubmit = (e) => { e.preventDefault(); window.accounting.genericSave('income', 'modal-escrow', true); };
    if(document.getElementById('form-exchange')) document.getElementById('form-exchange').onsubmit = (e) => window.accounting.saveExchange(e);
    if(document.getElementById('form-escrow-action')) document.getElementById('form-escrow-action').onsubmit = (e) => window.accounting.saveEscrowAction(e);
});
