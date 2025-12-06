// js/accounting.js - CANLI KASA ve RENKLİ TABLO (FULL)

window.accounting = {
    
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null,
    chartState: { profit: true, income: false, expense: false },

    // 1. BAŞLATMA
    refreshDashboard: async function() {
        console.log("💰 Finans yenileniyor...");
        
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const d = await res.json();
            this.liveRates = { TRY: 1, USD: (1/d.rates.USD), EUR: (1/d.rates.EUR) };
            if(document.getElementById('live-rates-display')) 
                document.getElementById('live-rates-display').innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
        } catch (e) { console.warn("Kur çekilemedi."); }

        const { data: list, error } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return;

        // Hesaplamalar
        let wTRY=0, wUSD=0, wEUR=0, tInc=0, tExp=0, tEsc=0;
        
        list.forEach(t => {
            const amt = parseFloat(t.amount);
            // Gelir
            if(t.type==='income') {
                if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt;
                if(!t.is_escrow) tInc += amt * (this.liveRates[t.currency]||1);
            } 
            // Gider
            else if (t.type==='expense') {
                if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt;
                tExp += amt * (this.liveRates[t.currency]||1);
            }
            // Emanet
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

        this.renderTable(list.slice(0, 10));
        this.initChart();
    },

    // 2. TABLO DOLDURMA (RENK MANTIĞI BURADA)
    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR', {day:'numeric', month:'long', hour:'2-digit', minute:'2-digit'});
            
            // Varsayılan: Gider (Kırmızı)
            let rowClass = 'row-expense'; 
            let textClass = 'text-red';
            let symbol = '-';

            // Gelir (Yeşil)
            if (t.type === 'income') {
                rowClass = 'row-income';
                textClass = 'text-green';
                symbol = '+';
            }
            
            // Emanet (Turuncu)
            if (t.is_escrow) {
                rowClass = 'row-escrow';
                textClass = 'text-orange';
                symbol = '';
            }

            // YENİ: Kur Dönüşümü (LACİVERT)
            // Eğer kategori 'exchange_in' veya 'exchange_out' ise
            if (t.category && t.category.includes('exchange')) {
                rowClass = 'row-exchange';  // CSS'de tanımladığımız Lacivert Çizgi
                textClass = 'text-navy';    // CSS'de tanımladığımız Lacivert Yazı
                symbol = t.type === 'income' ? '+' : '-';
            }

            const row = `
                <tr class="${rowClass}">
                    <td style="color:#64748b; font-size:12px; padding:15px;">${date}</td>
                    <td style="padding:15px; font-weight:600; color:#334155;">${t.description || '-'}</td>
                    <td style="padding:15px;"><span class="badge badge-gray">${t.category}</span></td>
                    <td style="padding:15px; text-align:right; font-weight:800; font-size:15px;" class="${textClass}">
                        ${symbol} ${this.fmt(t.amount, t.currency)}
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    },

    // 3. GRAFİK
    initChart: function() {
        const ctx = document.getElementById('financeChart');
        if (!ctx) return;
        if (this.chartInstance) this.chartInstance.destroy();

        const labels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Net Kâr', data: [1000, 3000, 2000, 5000, 4000, 6000, 7000], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4, hidden: !this.chartState.profit },
                    { label: 'Ciro', data: [2000, 4000, 3000, 6000, 5000, 8000, 9000], borderColor: '#3b82f6', borderDash: [5, 5], tension: 0.4, hidden: !this.chartState.income },
                    { label: 'Gider', data: [1000, 1000, 1000, 1000, 1000, 2000, 2000], borderColor: '#ef4444', tension: 0.4, hidden: !this.chartState.expense }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
        });
    },

    toggleChartData: function(type, cardElement) {
        this.chartState[type] = !this.chartState[type];
        if(this.chartState[type]) { cardElement.classList.remove('inactive'); cardElement.querySelector('.card-title').innerText = cardElement.querySelector('.card-title').innerText.replace('(KAPALI)', '(AÇIK)'); } 
        else { cardElement.classList.add('inactive'); cardElement.querySelector('.card-title').innerText = cardElement.querySelector('.card-title').innerText.replace('(AÇIK)', '(KAPALI)'); }
        if(this.chartInstance) {
            let index = type === 'income' ? 1 : (type === 'expense' ? 2 : 0);
            this.chartInstance.getDatasetMeta(index).hidden = !this.chartState[type];
            this.chartInstance.update();
        }
    },

    // Diğer Fonksiyonlar
    filterChartDate: function(period, btn) { document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); },
    updateChartRender: function() { /* Placeholder */ },
    
    openEscrowDetails: async function() {
        window.ui.openModal('modal-escrow-details');
        const tbody = document.getElementById('escrow-list-body');
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Veriler...</td></tr>';
        const { data: list } = await window.supabaseClient.from('transactions').select('*').eq('is_escrow', true).order('created_at', {ascending:false});
        let pEUR=0, pUSD=0, pTRY=0; tbody.innerHTML = '';
        if(list) list.forEach(t => {
            const amt = parseFloat(t.amount);
            if(t.currency==='EUR') pEUR+=amt; if(t.currency==='USD') pUSD+=amt; if(t.currency==='TRY') pTRY+=amt;
            tbody.innerHTML += `<tr><td>${new Date(t.created_at).toLocaleDateString()}</td><td>${t.description}</td><td style="font-weight:bold; color:#f59e0b;">${this.fmt(amt, t.currency)}</td><td><span class="badge bg-orange-light">Emanette</span></td></tr>`;
        });
        this.updateText('pool-eur', this.fmt(pEUR, 'EUR'));
        this.updateText('pool-usd', this.fmt(pUSD, 'USD'));
        this.updateText('pool-try', this.fmt(pTRY, 'TRY'));
    },

    // KAYITLAR (KUR DÖNÜŞÜMÜ DAHİL)
    saveExchange: async function(e) { 
        e.preventDefault(); const btn=e.target.querySelector('button'); btn.disabled=true;
        const outA=document.getElementById('ex-amount-out').value, outC=document.getElementById('ex-currency-out').value;
        const inA=document.getElementById('ex-amount-in').value, inC=document.getElementById('ex-currency-in').value;
        const desc=document.getElementById('ex-desc').value;
        
        // İşlem Tipi: exchange_out ve exchange_in
        const { error } = await window.supabaseClient.from('transactions').insert([
            {type:'expense', category:'exchange_out', description:`Döviz Bozum (${desc})`, amount:outA, currency:outC},
            {type:'income', category:'exchange_in', description:`Döviz Giriş (${desc})`, amount:inA, currency:inC}
        ]);
        if(!error) { window.ui.closeModal('modal-exchange'); this.refreshDashboard(); } 
        else alert(error.message); btn.disabled=false; 
    },
    
    saveExpense: async function(e) { e.preventDefault(); this.genericSave(e, 'expense', 'modal-expense'); },
    saveEscrow: async function(e) { e.preventDefault(); this.genericSave(e, 'escrow', 'modal-escrow'); },
    saveExtraIncome: async function(e) { e.preventDefault(); this.genericSave(e, 'income', 'modal-extra-income'); },

    genericSave: async function(e, type, modalId) {
        const form = e.target; const btn = form.querySelector('button'); btn.disabled=true;
        const cat = form.querySelector('select')?.value || 'general';
        const desc = form.querySelector('input[type="text"]').value;
        const amt = form.querySelector('input[type="number"]').value;
        const cur = form.querySelectorAll('select')[1].value;
        const tData = { type: type === 'escrow' ? 'income' : type, category: type==='escrow'?'escrow_deposit':cat, description: desc, amount: amt, currency: cur, is_escrow: type==='escrow' };
        const { error } = await window.supabaseClient.from('transactions').insert([tData]);
        if(!error) { window.ui.closeModal(modalId); form.reset(); this.refreshDashboard(); } else alert(error.message); btn.disabled=false;
    },

    updateText: function(id, t) { const el = document.getElementById(id); if(el) el.innerText = t; },
    fmt: function(a, c) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a); }
};

window.addEventListener('load', () => {
    window.accounting.refreshDashboard();
    if(document.getElementById('form-exchange')) document.getElementById('form-exchange').onsubmit = window.accounting.saveExchange;
    if(document.getElementById('form-expense')) document.getElementById('form-expense').onsubmit = window.accounting.saveExpense;
    if(document.getElementById('form-escrow')) document.getElementById('form-escrow').onsubmit = window.accounting.saveEscrow;
    if(document.getElementById('form-extra-income')) document.getElementById('form-extra-income').onsubmit = window.accounting.saveExtraIncome;
});
