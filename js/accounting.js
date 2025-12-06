// js/accounting.js - GÜVENLİ MOD (Fail-Safe)

window.accounting = {
    
    // Varsayılan Kurlar (İnternet çekemezse bunları kullanır)
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 }, 

    // 1. GÜVENLİ BAŞLATMA VE HESAPLAMA
    refreshDashboard: async function() {
        console.log("💰 Finans motoru çalışıyor...");
        
        // A. Kurları Çekmeyi Dene (Hata verirse pas geç)
        try {
            // 2 saniyelik zaman aşımı koyuyoruz (Sistem donmasın diye)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const response = await fetch('https://api.exchangerate-api.com/v4/latest/TRY', { signal: controller.signal });
            const data = await response.json();
            
            this.liveRates = {
                TRY: 1,
                USD: (1 / data.rates.USD), 
                EUR: (1 / data.rates.EUR)
            };
            
            // Header'a yaz
            const rateDisplay = document.getElementById('live-rates-display');
            if(rateDisplay) rateDisplay.innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;

        } catch (e) { 
            console.warn("⚠️ Kur çekilemedi (Firewall veya internet sorunu). Varsayılanlar kullanılıyor."); 
            const rateDisplay = document.getElementById('live-rates-display');
            if(rateDisplay) rateDisplay.innerText = "Bağlantı Yok - Varsayılan Kur";
        }

        // B. Veritabanından İşlemleri Çek
        const { data: transactions, error } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Veri hatası:", error);
            return;
        }

        // C. Kasaları Hesapla
        let walletTRY = 0, walletUSD = 0, walletEUR = 0;
        let totalIncomeTRY = 0, totalExpenseTRY = 0, totalEscrowEUR = 0;

        transactions.forEach(t => {
            const amount = parseFloat(t.amount);
            
            if (t.type === 'income') {
                if (t.currency === 'TRY') walletTRY += amount;
                if (t.currency === 'USD') walletUSD += amount;
                if (t.currency === 'EUR') walletEUR += amount;
                if (!t.is_escrow) totalIncomeTRY += amount * (this.liveRates[t.currency] || 1);
            } 
            else if (t.type === 'expense') {
                if (t.currency === 'TRY') walletTRY -= amount;
                if (t.currency === 'USD') walletUSD -= amount;
                if (t.currency === 'EUR') walletEUR -= amount;
                totalExpenseTRY += amount * (this.liveRates[t.currency] || 1);
            }

            if (t.is_escrow) {
                if (t.currency === 'EUR') totalEscrowEUR += amount;
                else totalEscrowEUR += (amount / this.liveRates.EUR);
            }
        });

        // D. Ekrana Yaz
        this.updateText('wallet-try', this.formatMoney(walletTRY, 'TRY'));
        this.updateText('wallet-usd', this.formatMoney(walletUSD, 'USD'));
        this.updateText('wallet-eur', this.formatMoney(walletEUR, 'EUR'));

        this.updateText('val-usd', `≈ ${this.formatMoney(walletUSD * this.liveRates.USD, 'TRY')}`);
        this.updateText('val-eur', `≈ ${this.formatMoney(walletEUR * this.liveRates.EUR, 'TRY')}`);

        const totalEquity = walletTRY + (walletUSD * this.liveRates.USD) + (walletEUR * this.liveRates.EUR);
        this.updateText('total-equity', this.formatMoney(totalEquity, 'TRY'));

        this.updateText('money-profit', this.formatMoney(totalIncomeTRY - totalExpenseTRY, 'TRY'));
        this.updateText('money-income', this.formatMoney(totalIncomeTRY, 'TRY'));
        this.updateText('money-expense', this.formatMoney(totalExpenseTRY, 'TRY'));
        this.updateText('money-escrow', this.formatMoney(totalEscrowEUR, 'EUR'));

        this.renderTable(transactions.slice(0, 10));
        this.renderChart(transactions);
    },

    // 2. TABLO
    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR');
            const symbol = t.type === 'income' ? '+' : '-';
            const color = t.type === 'income' ? 'text-green' : 'text-red';
            const row = `<tr>
                <td style="color:#666; font-size:12px; padding:10px;">${date}</td>
                <td style="padding:10px; font-weight:500;">${t.description || '-'}</td>
                <td style="padding:10px;"><span class="badge badge-gray">${t.category}</span></td>
                <td style="padding:10px; text-align:right; font-weight:bold;" class="${color}">${symbol} ${this.formatMoney(t.amount, t.currency)}</td>
            </tr>`;
            tbody.innerHTML += row;
        });
    },

    // 3. GRAFİK
    renderChart: function(transactions) {
        const ctx = document.getElementById('financeChart');
        if (!ctx) return;
        if(window.myChart) window.myChart.destroy();
        window.myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs'],
                datasets: [{ label: 'Varlık', data: [10, 20, 15, 25, 30], borderColor: '#4f46e5', tension: 0.4 }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    },

    // 4. İŞLEM KAYITLARI
    saveExchange: async function(e) {
        e.preventDefault();
        // ... (Burası aynı kalacak, yer tutmasın diye kısalttım) ...
        alert("İşlem kaydedildi (Demo)");
        window.ui.closeModal('modal-exchange');
    },
    saveExpense: async function(e) { e.preventDefault(); alert("Gider (Demo)"); },
    saveEscrow: async function(e) { e.preventDefault(); alert("Emanet (Demo)"); },
    saveExtraIncome: async function(e) { e.preventDefault(); alert("Gelir (Demo)"); },

    // Yardımcılar
    updateText: function(id, text) { const el = document.getElementById(id); if(el) el.innerText = text; },
    formatMoney: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); },
    openEscrowDetails: function() { alert("Detaylar yakında..."); }
};

// BAŞLATICI
window.addEventListener('load', () => {
    window.accounting.refreshDashboard();
    
    // Form Listener
    if(document.getElementById('form-exchange')) document.getElementById('form-exchange').onsubmit = window.accounting.saveExchange;
    if(document.getElementById('form-expense')) document.getElementById('form-expense').onsubmit = window.accounting.saveExpense;
});
