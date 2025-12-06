// js/accounting.js - GRAFİK, BUTONLAR ve EMANET DETAYLARI

window.accounting = {
    
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null, // Grafik objesini tutmak için
    chartState: { profit: true, income: false, expense: false }, // Varsayılan açık/kapalı durumları

    // 1. BAŞLATMA
    refreshDashboard: async function() {
        console.log("💰 Finans yenileniyor...");
        
        // Kurları Çek (Güvenli Mod)
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const d = await res.json();
            this.liveRates = { TRY: 1, USD: (1/d.rates.USD), EUR: (1/d.rates.EUR) };
            if(document.getElementById('live-rates-display')) document.getElementById('live-rates-display').innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
        } catch (e) { console.warn("Kur çekilemedi."); }

        // Verileri Çek
        const { data: list, error } = await window.supabaseClient.from('transactions').select('*').order('created_at', { ascending: false });
        if(error) return;

        // Hesaplamalar
        let wTRY=0, wUSD=0, wEUR=0, tInc=0, tExp=0, tEsc=0;
        
        list.forEach(t => {
            const amt = parseFloat(t.amount);
            if(t.type==='income') {
                if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt;
                if(!t.is_escrow) tInc += amt * (this.liveRates[t.currency]||1);
            } else {
                if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt;
                tExp += amt * (this.liveRates[t.currency]||1);
            }
            if(t.is_escrow) {
                if(t.currency==='EUR') tEsc+=amt; else tEsc+=(amt/this.liveRates.EUR);
            }
        });

        // Ekrana Yaz
        this.updateText('wallet-try', this.fmt(wTRY, 'TRY'));
        this.updateText('wallet-usd', this.fmt(wUSD, 'USD'));
        this.updateText('wallet-eur', this.fmt(wEUR, 'EUR'));
        this.updateText('val-usd', `≈ ${this.fmt(wUSD*this.liveRates.USD, 'TRY')}`);
        this.updateText('val-eur', `≈ ${this.fmt(wEUR*this.liveRates.EUR, 'TRY')}`);
        this.updateText('total-equity', this.fmt(wTRY+(wUSD*this.liveRates.USD)+(wEUR*this.liveRates.EUR), 'TRY'));

        this.updateText('money-profit', this.fmt(tInc-tExp, 'TRY'));
        this.updateText('money-income', this.fmt(tInc, 'TRY'));
        this.updateText('money-expense', this.fmt(tExp, 'TRY'));
        this.updateText('money-escrow', this.fmt(tEsc, 'EUR'));

        // Tablo ve Grafik
        this.renderTable(list.slice(0, 10));
        this.initChart(); // Grafiği çiz (Boş veya örnek verili)
    },

    // 2. GRAFİK YÖNETİMİ (TOGGLE & ZAMAN)
    initChart: function() {
        const ctx = document.getElementById('financeChart');
        if (!ctx) return;
        if (this.chartInstance) this.chartInstance.destroy();

        // Örnek Veriler (Gerçek veritabanı tarihçesi için daha kompleks sorgu gerekir)
        // Şimdilik görsel olarak çalışmasını sağlıyoruz
        const labels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
        const dataProfit = [1000, 3000, 2000, 5000, 4000, 6000, 7000];
        const dataIncome = [2000, 4000, 3000, 6000, 5000, 8000, 9000];
        const dataExpense = [1000, 1000, 1000, 1000, 1000, 2000, 2000];

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Net Kâr', data: dataProfit, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, hidden: !this.chartState.profit },
                    { label: 'Ciro', data: dataIncome, borderColor: '#3b82f6', borderDash: [5, 5], hidden: !this.chartState.income },
                    { label: 'Gider', data: dataExpense, borderColor: '#ef4444', hidden: !this.chartState.expense }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { display: true, position: 'bottom' } }
            }
        });
    },

    // KARTLARA TIKLAYINCA ÇALIŞIR
    toggleChartData: function(type, cardElement) {
        // Durumu değiştir
        this.chartState[type] = !this.chartState[type];
        
        // Görsel efekt (Pasifleşme)
        if(this.chartState[type]) cardElement.classList.remove('inactive');
        else cardElement.classList.add('inactive');

        // Grafiği güncelle
        if(this.chartInstance) {
            // Dataset sırası: 0=Profit, 1=Income, 2=Expense
            let index = 0;
            if(type === 'income') index = 1;
            if(type === 'expense') index = 2;
            
            // Chart.js'de görünürlüğü tersine çeviriyoruz (hidden = true ise gizli)
            this.chartInstance.getDatasetMeta(index).hidden = !this.chartState[type];
            this.chartInstance.update();
        }
    },

    // ZAMAN BUTONLARI
    filterChartDate: function(period, btn) {
        // Buton aktifliğini değiştir
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Burada ilerde veritabanından o tarih aralığını çekeceğiz
        console.log("Grafik filtrelendi:", period);
        // Örnek: Grafiği salla (efekt)
        if(this.chartInstance) {
            this.chartInstance.data.datasets[0].data = this.chartInstance.data.datasets[0].data.map(v => v * Math.random() + 500);
            this.chartInstance.update();
        }
    },

    // 3. EMANET DETAYLARI (ÇİFT TIKLAMA)
    openEscrowDetails: async function() {
        window.ui.openModal('modal-escrow-details');
        const tbody = document.getElementById('escrow-list-body');
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Veriler...</td></tr>';

        const { data: list } = await window.supabaseClient.from('transactions').select('*').eq('is_escrow', true).order('created_at', {ascending:false});
        
        let pEUR=0, pUSD=0, pTRY=0;
        tbody.innerHTML = '';
        
        if(list) list.forEach(t => {
            const amt = parseFloat(t.amount);
            if(t.currency==='EUR') pEUR+=amt; if(t.currency==='USD') pUSD+=amt; if(t.currency==='TRY') pTRY+=amt;
            
            tbody.innerHTML += `<tr>
                <td>${new Date(t.created_at).toLocaleDateString()}</td>
                <td style="font-weight:500;">${t.description}</td>
                <td style="font-weight:bold; color:#f59e0b;">${this.fmt(amt, t.currency)}</td>
                <td><span class="badge bg-orange-light">Emanette</span></td>
            </tr>`;
        });

        this.updateText('pool-eur', this.fmt(pEUR, 'EUR'));
        this.updateText('pool-usd', this.fmt(pUSD, 'USD'));
        this.updateText('pool-try', this.fmt(pTRY, 'TRY'));
    },

    // Tablo ve Kayıt Fonksiyonları (Öncekilerin aynısı, kısa tutuyorum)
    renderTable: function(list) {
        const tb = document.getElementById('transactions-body'); tb.innerHTML='';
        list.forEach(t => {
            const sym = t.type==='income'?'+':'-'; const col = t.type==='income'?'text-green':'text-red';
            tb.innerHTML += `<tr><td style="color:#666; font-size:12px; padding:10px;">${new Date(t.created_at).toLocaleDateString()}</td><td style="padding:10px;">${t.description}</td><td style="padding:10px;"><span class="badge badge-gray">${t.category}</span></td><td style="padding:10px; text-align:right;" class="${col}">${sym} ${this.fmt(t.amount, t.currency)}</td></tr>`;
        });
    },
    
    // Form Kayıtları
    saveExchange: async function(e) { e.preventDefault(); /* ... */ alert("İşlem Kaydedildi"); window.ui.closeModal('modal-exchange'); this.refreshDashboard(); },
    saveExpense: async function(e) { e.preventDefault(); /* ... */ window.ui.closeModal('modal-expense'); this.refreshDashboard(); },
    
    // Yardımcılar
    updateText: function(id, t) { const el = document.getElementById(id); if(el) el.innerText = t; },
    fmt: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); }
};

window.addEventListener('load', () => {
    window.accounting.refreshDashboard();
    // Form listener'ları buraya eklenebilir
});
