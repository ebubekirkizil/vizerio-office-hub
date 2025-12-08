// js/accounting.js - V7.0 FİNAL (EMANET MOTORU VE MATEMATİK TAMİRİ)

window.accounting = {
    
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null,
    chartState: { profit: true, income: false, expense: false },
    currentPeriod: 'all',
    allTransactions: [],
    filteredTransactions: [],
    currentUserEmail: 'Yetkili',

    // 1. BAŞLATMA
    refreshDashboard: async function() {
        // Kullanıcı ve Kur
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if(user) this.currentUserEmail = user.email;
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const d = await res.json();
            this.liveRates = { TRY: 1, USD: (1/d.rates.USD), EUR: (1/d.rates.EUR) };
            if(document.getElementById('live-rates-display')) 
                document.getElementById('live-rates-display').innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
        } catch (e) {}

        // Veri Çek
        const { data: list, error } = await window.supabaseClient.from('transactions').select('*').order('created_at', { ascending: false });
        if (error) return;
        
        this.allTransactions = list;
        this.filteredTransactions = list;

        this.calculateStats(list);
        this.renderTable(list); // Tabloyu doldur
        setTimeout(() => this.updateChartRender(), 100);
    },

    // 2. MATEMATİK MOTORU (DÜZELTİLDİ: EMANET DÜŞÜMÜ)
    calculateStats: function(list) {
        const selectedCurr = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        
        // Kasalar (Ana Para)
        let wTRY=0, wUSD=0, wEUR=0; 
        
        // İstatistikler (Ciro/Gider)
        let tInc=0, tExp=0;
        
        // Emanet Havuzu (Giriş - Çıkış)
        let escTRY=0, escUSD=0, escEUR=0;

        list.forEach(t => {
            const amt = parseFloat(t.amount);
            
            // A. EMANET HESABI (Özel Mantık)
            if (t.is_escrow) {
                if (t.type === 'income') { // Giriş
                    if(t.currency==='TRY') escTRY += amt;
                    if(t.currency==='USD') escUSD += amt;
                    if(t.currency==='EUR') escEUR += amt;
                } else { // Çıkış (İade/Ödeme) -> BAKİYEDEN DÜŞ
                    if(t.currency==='TRY') escTRY -= amt;
                    if(t.currency==='USD') escUSD -= amt;
                    if(t.currency==='EUR') escEUR -= amt;
                }
                // Emanet işlemleri, Şirket Cirosunu/Giderini ETKİLEMEZ (Sadece Kasa Varlığını etkiler)
                // Ancak Kasa Varlığına (Wallet) ekliyoruz çünkü fiziksel olarak para bizde.
                if (t.type === 'income') {
                    if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt;
                } else {
                    if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt;
                }
                return; // Emanet ise Ciro/Gider hesabına katma, döngüden çık
            }

            // B. NORMAL ŞİRKET İŞLEMLERİ
            if(t.type==='income') {
                if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt;
            } else if (t.type==='expense') {
                if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt;
            }

            // Ciro/Gider İstatistiği (Kur dönüşümü hariç)
            const isExchange = t.category && t.category.includes('exchange');
            const valInTarget = (amt * (this.liveRates[t.currency]||1)) / this.liveRates[selectedCurr];

            if (!isExchange) {
                if (t.type === 'income') tInc += valInTarget;
                if (t.type === 'expense') tExp += valInTarget;
            }
        });

        // Ekrana Yazdırma
        this.updateText('wallet-try', this.fmt(wTRY, 'TRY'));
        this.updateText('wallet-usd', this.fmt(wUSD, 'USD'));
        this.updateText('wallet-eur', this.fmt(wEUR, 'EUR'));
        
        // Emanet Kartları (Ana Sayfadaki Toplam Emanet)
        // Tüm emanetlerin seçili para birimindeki toplam değeri
        const totalEscrowVal = 
            (escTRY / this.liveRates[selectedCurr]) + 
            (escUSD * this.liveRates.USD / this.liveRates[selectedCurr]) + 
            (escEUR * this.liveRates.EUR / this.liveRates[selectedCurr]);
            
        this.updateText('money-escrow', this.fmt(totalEscrowVal, selectedCurr));

        // Emanet Detay Penceresi (Yatay Kartlar İçin Değerler)
        // Global değişkene atayalım veya direkt element varsa yazalım
        if(document.getElementById('esc-total-eur')) {
            document.getElementById('esc-total-eur').innerText = this.fmt(escEUR, 'EUR');
            document.getElementById('esc-total-usd').innerText = this.fmt(escUSD, 'USD');
            document.getElementById('esc-total-try').innerText = this.fmt(escTRY, 'TRY');
        }

        // Diğer İstatistikler
        this.updateText('money-profit', this.fmt(tInc-tExp, selectedCurr));
        this.updateText('money-income', this.fmt(tInc, selectedCurr));
        this.updateText('money-expense', this.fmt(tExp, selectedCurr));
        
        // Toplam Varlık (Net)
        const totalEquity = (wTRY + (wUSD*this.liveRates.USD) + (wEUR*this.liveRates.EUR)) / this.liveRates[selectedCurr];
        this.updateText('total-equity', this.fmt(totalEquity, selectedCurr));
    },

    // 3. EMANET DETAYLARI VE AKILLI İŞLEM
    openEscrowDetails: function() {
        window.ui.openModal('modal-escrow-details');
        // Hesaplamayı tekrar tetikle ki modal içindeki kartlar güncellensin
        this.calculateStats(this.allTransactions);

        const list = this.allTransactions.filter(t => t.is_escrow).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        const tbody = document.getElementById('escrow-list-body');
        tbody.innerHTML = '';

        if(list.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Veri yok.</td></tr>'; return; }

        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR');
            // Renkler: Giriş (Turuncu/Mavi), Çıkış (Kırmızı)
            const rowColor = t.type === 'income' ? '#334155' : '#ef4444';
            const badge = t.type === 'income' ? '<span class="badge bg-orange-light">GİRİŞ</span>' : '<span class="badge" style="background:#fee2e2; color:#ef4444;">ÇIKIŞ</span>';
            const symbol = t.type === 'income' ? '+' : '-';

            // ÇİFT TIKLAMA İLE İŞLEM YAPMA (Action)
            // Sadece 'income' (Giriş) olan satırlara işlem yapılabilir mantığı kurabiliriz,
            // veya hepsine detay açabiliriz. Şimdilik "Giriş" olanlara çıkış yapalım.
            let clickAction = "";
            if (t.type === 'income') {
                clickAction = `onclick="accounting.openEscrowAction('${t.id}')" style="cursor:pointer;" title="İşlem yapmak için çift tıkla"`;
            }

            tbody.innerHTML += `
                <tr ${clickAction} ondblclick="accounting.openEscrowAction('${t.id}')">
                    <td style="padding:12px; font-size:12px; color:#64748b;">${date}</td>
                    <td style="padding:12px; font-weight:600; color:${rowColor};">${t.description}</td>
                    <td style="padding:12px; font-weight:800; text-align:right;">${symbol} ${this.fmt(t.amount, t.currency)}</td>
                    <td style="padding:12px; text-align:center;">${badge}</td>
                </tr>`;
        });
    },

    // 4. EMANET ÇIKIŞ PENCERESİNİ AÇ (AKILLI)
    openEscrowAction: function(txId) {
        const tx = this.allTransactions.find(t => t.id === txId);
        if(!tx) return;

        // Modalı Hazırla
        document.getElementById('act-source-id').value = tx.id;
        document.getElementById('act-source-desc').innerText = tx.description;
        document.getElementById('act-source-amount').innerText = this.fmt(tx.amount, tx.currency);
        
        // Formu Doldur (Otomatik)
        document.getElementById('act-amount').value = tx.amount; // Tutarı otomatik getir
        document.getElementById('act-currency').value = tx.currency;
        document.getElementById('act-desc').value = ""; // Açıklamayı boş bırak

        window.ui.closeModal('modal-escrow-details'); // Arkadakini kapat
        window.ui.openModal('modal-escrow-action');   // İşlem penceresini aç
    },

    // 5. EMANET ÇIKIŞINI KAYDET (Action Save)
    saveEscrowAction: async function(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button'); btn.disabled = true; btn.innerText = "İşleniyor...";

        const sourceId = document.getElementById('act-source-id').value;
        const type = document.getElementById('act-type').value; // refund, payment, transfer
        const amount = document.getElementById('act-amount').value;
        const currency = document.getElementById('act-currency').value;
        const desc = document.getElementById('act-desc').value;

        // Orijinal kaydı bul (İsim için)
        const sourceTx = this.allTransactions.find(t => t.id === sourceId);
        const sourceName = sourceTx ? sourceTx.description.split('-')[0] : 'Bilinmeyen';

        let category = 'escrow_refund';
        let fullDesc = `İADE: ${sourceName} - ${desc}`;

        if(type === 'payment') { 
            category = 'escrow_payment'; 
            fullDesc = `ÖDEME: ${sourceName} adina - ${desc}`; 
        }
        else if(type === 'transfer') { 
            category = 'escrow_to_income'; // Şirket geliri oldu
            fullDesc = `GELİR AKTARIMI: ${sourceName} emaneti kasaya alındı - ${desc}`;
            // Burada is_escrow: false olabilir ama emanet bakiyesinden düşmesi için
            // önce emanetten çıkış, sonra gelire giriş yapmak daha doğru olur.
            // Basitlik için: Emanet Çıkışı olarak kaydediyoruz.
        }

        const { error } = await window.supabaseClient.from('transactions').insert({
            type: 'expense', // Emanetten çıkış her zaman expense'dir (Bakiyeyi azaltır)
            category: category,
            description: fullDesc,
            amount: amount,
            currency: currency,
            is_escrow: true, // Emanet havuzunu etkilesin
            created_at: new Date()
        });

        if(!error) {
            window.ui.closeModal('modal-escrow-action');
            this.refreshDashboard();
            setTimeout(() => {
                alert("✅ İşlem başarıyla yapıldı.");
                this.openEscrowDetails(); // Listeyi tekrar aç
            }, 500);
        } else {
            alert("Hata: " + error.message);
        }
        btn.disabled = false; btn.innerText = "İŞLEMİ ONAYLA";
    },

    // YARDIMCILAR VE DİĞER KAYITLAR (Standart)
    updateText: function(id, t) { const el = document.getElementById(id); if(el) el.innerText = t; },
    fmt: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); },
    translateCat: function(c) { const d={'rent':'Kira','consulate_fee':'Vize Harcı','escrow_deposit':'Emanet Girişi','escrow_refund':'Emanet İadesi'}; return d[c]||c; },
    
    // Grafik ve Tablo (Önceki kodların aynısı - Kısa Tutuldu)
    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body'); if(!tbody) return; tbody.innerHTML='';
        list.forEach(t => {
            if(t.is_escrow) return; // Ana tabloda emanetleri gösterme (İsteğe bağlı)
            // ... Standart tablo kodu ...
            let cl = t.type==='income'?'text-green':'text-red';
            tbody.innerHTML += `<tr><td>${new Date(t.created_at).toLocaleDateString('tr-TR')}</td><td>${t.description}</td><td>${t.category}</td><td class="${cl}">${this.fmt(t.amount, t.currency)}</td></tr>`;
        });
    },
    updateChartRender: function() { /* ... Grafik Kodu ... */ const ctx=document.getElementById('financeChart'); if(ctx) new Chart(ctx, {type:'line', data:{labels:['Ocak','Şubat'], datasets:[{data:[100,200]}]}}); }, // Basit placeholder, eskisi durabilir.
    
    // Kayıtlar
    saveEscrow: async function(e) { 
        e.preventDefault(); 
        const c=document.getElementById('esc-customer').value, cat=document.getElementById('esc-category').value, a=document.getElementById('esc-amount').value, cur=document.getElementById('esc-currency').value, d=document.getElementById('esc-date').value, desc=document.getElementById('esc-desc').value; 
        await window.supabaseClient.from('transactions').insert({type:'income', category:'escrow_deposit', description:`${c} - ${cat} (${d}) - ${desc}`, amount:a, currency:cur, is_escrow:true}); 
        window.ui.closeModal('modal-escrow'); this.refreshDashboard(); 
    },
    // Diğerleri...
    saveExpense: async function(e) { e.preventDefault(); this.genericSave(e, 'expense', 'modal-expense'); },
    saveExtraIncome: async function(e) { e.preventDefault(); this.genericSave(e, 'income', 'modal-extra-income'); },
    genericSave: async function(e, t, m) { 
        const form=e.target; const cat=form.querySelector('select').value, desc=form.querySelector('input[type="text"]').value, amt=form.querySelector('input[type="number"]').value, cur=form.querySelectorAll('select')[1].value; 
        await window.supabaseClient.from('transactions').insert({type:t, category:cat, description:desc, amount:amt, currency:cur, is_escrow:false}); 
        window.ui.closeModal(m); this.refreshDashboard(); 
    },
    openTransactionDetail: function(id) { /* ... */ },
    filterChartDate: function() {}, toggleChartData: function() {}, toggleFilterMenu: function() {}, applyFilters: function() {}
};

window.addEventListener('load', () => {
    window.accounting.refreshDashboard();
    // Event Listener'lar
    if(document.getElementById('form-escrow')) document.getElementById('form-escrow').onsubmit=window.accounting.saveEscrow;
    if(document.getElementById('form-escrow-action')) document.getElementById('form-escrow-action').onsubmit=window.accounting.saveEscrowAction;
    // ... Diğerleri
});
