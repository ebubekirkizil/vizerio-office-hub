// js/accounting.js - V7.2 (ACİL DURUM MODU - VERİLERİ ZORLA GETİR)

window.accounting = {
    
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null,
    chartState: { profit: true, income: false, expense: false },
    currentPeriod: 'all', 
    allTransactions: [],
    
    // 1. SİSTEMİ BAŞLAT (FİLTRESİZ ÇEKİM)
    refreshDashboard: async function() {
        console.log("🚨 ACİL DURUM MODU: Veriler Çekiliyor...");
        
        // Kullanıcıyı bul (Hata verirse boşver, devam et)
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if(user) this.currentUserEmail = user.email;
        } catch(e) { console.log("Kullanıcı alınamadı"); }

        // Kurları çek
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const d = await res.json();
            this.liveRates = { TRY: 1, USD: (1/d.rates.USD), EUR: (1/d.rates.EUR) };
            if(document.getElementById('live-rates-display')) 
                document.getElementById('live-rates-display').innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
        } catch (e) {}

        // --- VERİLERİ ÇEK (FİLTRESİZ) ---
        const { data: list, error } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            alert("Veritabanı Hatası: " + error.message);
            return;
        }

        // Eğer veri yoksa uyarı ver
        if (!list || list.length === 0) {
            console.log("Veritabanı boş veya veri gelmedi.");
        }

        this.allTransactions = list || [];

        // HESAPLA VE TABLOYU DOLDUR
        this.calculateStats(this.allTransactions);
        this.renderTable(this.allTransactions); // Filtresiz direkt bas
        
        // Grafiği çiz
        setTimeout(() => this.updateChartRender(), 200);
    },

    // 2. TABLO DOLDURMA (BASİTLEŞTİRİLMİŞ)
    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        if(!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:red;">Veri Yok veya Çekilemedi!</td></tr>';
            return;
        }
        
        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR');
            let rowClass = 'row-expense', textClass = 'text-red', symbol = '-';
            
            if (t.type === 'income') { rowClass = 'row-income'; textClass = 'text-green'; symbol = '+'; }
            if (t.is_escrow) { rowClass = 'row-escrow'; textClass = 'text-orange'; symbol = ''; }
            
            // Kategori Çevirisi
            let catName = t.category;
            const dict = {'rent':'Kira', 'visa_service':'Vize', 'extra_service':'Ek Hizmet', 'escrow_deposit':'Emanet', 'consultancy':'Danışmanlık'};
            if(dict[t.category]) catName = dict[t.category];

            tbody.innerHTML += `
                <tr class="${rowClass}" onclick="accounting.openTransactionDetail('${t.id}')" style="cursor:pointer;">
                    <td style="color:#64748b; font-size:12px; padding:15px;">${date}</td>
                    <td style="padding:15px; font-weight:600; color:#334155;">${t.description || '-'}</td>
                    <td style="padding:15px;"><span class="badge badge-gray">${catName}</span></td>
                    <td style="padding:15px; text-align:right; font-weight:800; font-size:15px;" class="${textClass}">
                        ${symbol} ${this.fmt(t.amount, t.currency)}
                    </td>
                </tr>
            `;
        });
    },

    // 3. İSTATİSTİK MOTORU
    calculateStats: function(list) {
        const selectedCurr = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        let wTRY=0, wUSD=0, wEUR=0; // Kasa
        let tInc=0, tExp=0; // Rapor
        let escTRY=0, escUSD=0, escEUR=0; // Emanet

        list.forEach(t => {
            const amt = parseFloat(t.amount);
            
            // Emanet Hesaplaması
            if (t.is_escrow) {
                if (t.type === 'income') {
                    if(t.currency==='TRY') escTRY += amt;
                    if(t.currency==='USD') escUSD += amt;
                    if(t.currency==='EUR') escEUR += amt;
                } else {
                    if(t.currency==='TRY') escTRY -= amt;
                    if(t.currency==='USD') escUSD -= amt;
                    if(t.currency==='EUR') escEUR -= amt;
                }
            }

            // Kasa Hesaplaması
            if (t.type === 'income') {
                if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt;
            } else {
                if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt;
            }

            // Ciro/Gider (Emanet Hariç)
            const valInTarget = (amt * (this.liveRates[t.currency]||1)) / this.liveRates[selectedCurr];
            if (!t.is_escrow && !t.category.includes('exchange')) {
                if (t.type === 'income') tInc += valInTarget;
                if (t.type === 'expense') tExp += valInTarget;
            }
        });

        this.updateText('wallet-try', this.fmt(wTRY, 'TRY'));
        this.updateText('wallet-usd', this.fmt(wUSD, 'USD'));
        this.updateText('wallet-eur', this.fmt(wEUR, 'EUR'));
        
        // Küçük Yazılar
        this.updateText('val-usd', `≈ ${this.fmt(wUSD * this.liveRates.USD, 'TRY')}`);
        this.updateText('val-eur', `≈ ${this.fmt(wEUR * this.liveRates.EUR, 'TRY')}`);

        // Emanet Toplam
        const totalEscrow = (escTRY/this.liveRates[selectedCurr]) + (escUSD*this.liveRates.USD/this.liveRates[selectedCurr]) + (escEUR*this.liveRates.EUR/this.liveRates[selectedCurr]);
        this.updateText('money-escrow', this.fmt(totalEscrow, selectedCurr));

        // Kartlar
        this.updateText('money-profit', this.fmt(tInc-tExp, selectedCurr));
        this.updateText('money-income', this.fmt(tInc, selectedCurr));
        this.updateText('money-expense', this.fmt(tExp, selectedCurr));
    },

    // 4. GRAFİK (GARANTİLİ GÖSTERİM)
    updateChartRender: function() {
        const ctx = document.getElementById('financeChart');
        if (!ctx) return;
        
        // Tüm zamanları kapsayacak şekilde ayarla
        const filteredData = this.allTransactions.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
        
        let labels = [], incomeData = [], expenseData = [], profitData = [], grouped = {};

        filteredData.forEach(t => {
            if(t.is_escrow || t.category.includes('exchange')) return;
            
            const d = new Date(t.created_at);
            const key = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }); // Gün Gün göster

            if(!grouped[key]) grouped[key] = { income: 0, expense: 0 };
            const val = parseFloat(t.amount) * (this.liveRates[t.currency] || 1); // Hepsi TL bazlı grafik olsun şimdilik
            
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
                    { label: 'Net Kâr', data: profitData.length ? profitData : [0], borderColor: '#10b981', fill: true, tension: 0.4 },
                    { label: 'Ciro', data: incomeData.length ? incomeData : [0], borderColor: '#3b82f6', borderDash: [5, 5], tension: 0.4 },
                    { label: 'Gider', data: expenseData.length ? expenseData : [0], borderColor: '#ef4444', tension: 0.4 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    },

    // YARDIMCILAR & KAYITLAR (AKTİF)
    updateText: function(id, t) { const el = document.getElementById(id); if(el) el.innerText = t; },
    fmt: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); },
    
    // Basit Kayıt Fonksiyonları (Hata yapmaması için sadeleştirildi)
    saveExpense: async function(e) { 
        e.preventDefault(); 
        const form = e.target;
        const btn = form.querySelector('button'); btn.disabled=true;
        const cat = document.getElementById('exp-category').value;
        const title = document.getElementById('exp-title').value;
        const amount = document.getElementById('exp-amount').value;
        const curr = document.getElementById('exp-currency').value;
        
        await window.supabaseClient.from('transactions').insert({
            type: 'expense', category: cat, description: title, amount: amount, currency: curr, is_escrow: false
        });
        window.ui.closeModal('modal-expense'); this.refreshDashboard(); btn.disabled=false;
    },
    
    // Diğerlerini çağırma (UI üzerinden bağlanacak)
    filterChartDate: function() { this.refreshDashboard(); }, // Şimdilik hepsi yenilesin
    toggleFilterMenu: function() { document.getElementById('filter-menu').classList.toggle('show'); },
    applyFilters: function() { this.toggleFilterMenu(); }, // Şimdilik kapatır
    
    // Boş Fonksiyonlar (Hata vermesin diye)
    saveEscrow: async function(e){}, 
    saveExtraIncome: async function(e){}, 
    saveExchange: async function(e){},
    openEscrowDetails: async function(){},
    openTransactionDetail: async function(id){},
    deleteTransaction: async function(){}
};

window.addEventListener('load', () => {
    window.accounting.refreshDashboard();
    // Basit form bağlamaları
    if(document.getElementById('form-expense')) document.getElementById('form-expense').onsubmit = window.accounting.saveExpense;
});
