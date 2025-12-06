// js/accounting.js - CANLI KASA, VARLIK YÖNETİMİ ve EMANET DETAYLARI (FULL)

window.accounting = {
    
    liveRates: { TRY: 1, USD: 32.00, EUR: 34.50 }, // Varsayılanlar

    // --- 1. CANLI KUR ÇEKME VE KASALARI HESAPLAMA ---
    refreshDashboard: async function() {
        console.log("💰 Kasalar güncelleniyor...");
        
        // A. Kurları Çek
        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const data = await response.json();
            this.liveRates = {
                TRY: 1,
                USD: (1 / data.rates.USD), 
                EUR: (1 / data.rates.EUR)
            };
            const rateDisplay = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
            const rateEl = document.getElementById('live-rates-display');
            if(rateEl) rateEl.innerText = rateDisplay;

        } catch (e) { console.warn("Kur çekilemedi, varsayılan kullanılıyor."); }

        // B. Veritabanından İşlemleri Çek
        const { data: transactions, error } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return;

        // C. Kasa Bakiyelerini Hesapla
        let walletTRY = 0, walletUSD = 0, walletEUR = 0;
        let totalIncomeTRY = 0, totalExpenseTRY = 0, totalEscrowEUR = 0;

        transactions.forEach(t => {
            const amount = parseFloat(t.amount);
            
            // Kasa Hesapla
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

            // Emanet Hesapla (Sadece bilgi amaçlı toplam)
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

    // --- 2. TABLO DOLDURMA ---
    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR');
            const symbol = t.type === 'income' ? '+' : '-';
            const color = t.type === 'income' ? 'text-green' : 'text-red';
            
            const row = `
                <tr>
                    <td style="color:#666; font-size:12px; padding:10px;">${date}</td>
                    <td style="padding:10px; font-weight:500;">${t.description}</td>
                    <td style="padding:10px;"><span class="badge badge-gray">${t.category}</span></td>
                    <td style="padding:10px; text-align:right; font-weight:bold;" class="${color}">
                        ${symbol} ${this.formatMoney(t.amount, t.currency)}
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    },

    // --- 3. GRAFİK ÇİZME ---
    renderChart: function(transactions) {
        const ctx = document.getElementById('financeChart');
        if (!ctx) return;
        if(window.myChart) window.myChart.destroy();

        window.myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran'],
                datasets: [{
                    label: 'Varlık Değişimi',
                    data: [10000, 12000, 11000, 18000, 22000, 25000],
                    borderColor: '#4f46e5',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(79, 70, 229, 0.1)'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    },

    // --- 4. EMANET DETAYLARI (YENİ FONKSİYON BURADA) ---
    openEscrowDetails: async function() {
        console.log("🟠 Emanet detayları açılıyor...");
        window.ui.openModal('modal-escrow-details');
        
        const tbody = document.getElementById('escrow-list-body');
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Veriler çekiliyor...</td></tr>';

        // Sadece emanetleri çek
        const { data: list, error } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .eq('is_escrow', true)
            .order('created_at', { ascending: false });

        if (error) {
            tbody.innerHTML = '<tr><td colspan="4" style="color:red; text-align:center;">Hata oluştu.</td></tr>';
            return;
        }

        // Havuz Toplamlarını Hesapla
        let poolEUR = 0, poolUSD = 0, poolTRY = 0;
        tbody.innerHTML = ''; 

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">Aktif emanet yok.</td></tr>';
        }

        list.forEach(item => {
            const amount = parseFloat(item.amount);
            if (item.type === 'income') {
                if(item.currency === 'EUR') poolEUR += amount;
                if(item.currency === 'USD') poolUSD += amount;
                if(item.currency === 'TRY') poolTRY += amount;
            }

            const date = new Date(item.created_at).toLocaleDateString('tr-TR');
            const row = `
                <tr>
                    <td>${date}</td>
                    <td style="font-weight:500;">${item.description}</td>
                    <td style="font-weight:bold; color:#f59e0b;">${this.formatMoney(amount, item.currency)}</td>
                    <td><span class="badge bg-orange-light">Emanette</span></td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

        // Havuz Kutucuklarını Güncelle
        this.updateText('pool-eur', this.formatMoney(poolEUR, 'EUR'));
        this.updateText('pool-usd', this.formatMoney(poolUSD, 'USD'));
        this.updateText('pool-try', this.formatMoney(poolTRY, 'TRY'));
    },

    // --- 5. KAYIT İŞLEMLERİ (FULL) ---
    
    // Gider Kaydet
    saveExpense: async function(event) {
        event.preventDefault(); 
        const btn = event.target.querySelector('button'); btn.disabled=true;
        const form = event.target;
        const category = form.querySelector('select').value;
        const desc = form.querySelector('input[type="text"]').value;
        const amount = form.querySelector('input[type="number"]').value;
        const currency = form.querySelectorAll('select')[1].value;

        const { error } = await window.supabaseClient.from('transactions').insert({
            type: 'expense', category, description: desc, amount, currency, is_escrow: false
        });

        if (!error) {
            window.ui.closeModal('modal-expense'); form.reset(); window.accounting.refreshDashboard();
        } else { alert(error.message); }
        btn.disabled=false;
    },

    // Emanet Kaydet
    saveEscrow: async function(event) {
        event.preventDefault();
        const btn = event.target.querySelector('button'); btn.disabled=true;
        const form = event.target;
        const customer = form.querySelector('input[type="text"]').value;
        const amount = form.querySelector('input[type="number"]').value;
        const currency = form.querySelectorAll('select')[1].value;
        
        const { error } = await window.supabaseClient.from('transactions').insert({
            type: 'income', category: 'escrow_deposit', description: 'Emanet - ' + customer, 
            amount, currency, is_escrow: true
        });

        if(!error) {
            window.ui.closeModal('modal-escrow'); form.reset(); window.accounting.refreshDashboard();
        } else { alert(error.message); }
        btn.disabled=false;
    },
    
    // Ek Gelir Kaydet
    saveExtraIncome: async function(event) {
        event.preventDefault();
        const btn = event.target.querySelector('button'); btn.disabled=true;
        const form = event.target;
        const category = form.querySelector('select').value;
        const amount = form.querySelector('input[type="number"]').value;
        
        const { error } = await window.supabaseClient.from('transactions').insert({
            type: 'income', category: 'extra_service', description: category, 
            amount, currency: 'TRY', is_escrow: false
        });

        if(!error) {
            window.ui.closeModal('modal-extra-income'); form.reset(); window.accounting.refreshDashboard();
        } else { alert(error.message); }
        btn.disabled=false;
    },

    // Kur Dönüşümü Kaydet
    saveExchange: async function(event) {
        event.preventDefault();
        const btn = document.querySelector('#form-exchange button'); btn.disabled = true;

        const amountOut = document.getElementById('ex-amount-out').value;
        const currencyOut = document.getElementById('ex-currency-out').value;
        const amountIn = document.getElementById('ex-amount-in').value;
        const currencyIn = document.getElementById('ex-currency-in').value;
        const desc = document.getElementById('ex-desc').value;

        const t1 = { type: 'expense', category: 'exchange_out', description: `Döviz Bozumu (${desc})`, amount: amountOut, currency: currencyOut };
        const t2 = { type: 'income', category: 'exchange_in', description: `Döviz Girişi (${desc})`, amount: amountIn, currency: currencyIn };

        const { error } = await window.supabaseClient.from('transactions').insert([t1, t2]);

        if(!error) {
            window.ui.closeModal('modal-exchange'); document.getElementById('form-exchange').reset(); window.accounting.refreshDashboard();
        } else { alert(error.message); }
        btn.disabled = false;
    },

    // Yardımcılar
    updateText: function(id, text) { const el = document.getElementById(id); if(el) el.innerText = text; },
    formatMoney: function(amount, currency) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency }).format(amount); }
};

// --- EN ALT KISIM (BAŞLATICI) ---
window.addEventListener('load', () => {
    window.accounting.refreshDashboard();
    
    if(document.getElementById('form-expense')) document.getElementById('form-expense').onsubmit = window.accounting.saveExpense;
    if(document.getElementById('form-escrow')) document.getElementById('form-escrow').onsubmit = window.accounting.saveEscrow;
    if(document.getElementById('form-extra-income')) document.getElementById('form-extra-income').onsubmit = window.accounting.saveExtraIncome;
    if(document.getElementById('form-exchange')) document.getElementById('form-exchange').onsubmit = window.accounting.saveExchange;
});
