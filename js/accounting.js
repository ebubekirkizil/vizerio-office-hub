// js/accounting.js - GRAFİK, KASA VE TABLO (TAMİR EDİLMİŞ VERSİYON)

window.accounting = {
    
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 }, // Varsayılan Kurlar
    chartInstance: null, // Grafik objesi
    // Grafikte hangi çizgilerin açık olduğunu tutan hafıza:
    chartState: { profit: true, income: false, expense: false }, 

    // 1. SİSTEMİ BAŞLAT
    refreshDashboard: async function() {
        console.log("💰 Finans verileri işleniyor...");
        
        // A. Kurları Çek (Hata verirse devam et)
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const d = await res.json();
            this.liveRates = { TRY: 1, USD: (1/d.rates.USD), EUR: (1/d.rates.EUR) };
            if(document.getElementById('live-rates-display')) 
                document.getElementById('live-rates-display').innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
        } catch (e) { console.warn("Kur çekilemedi."); }

        // B. Verileri Çek
        const { data: list, error } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return;

        // C. Hesaplamalar
        let wTRY=0, wUSD=0, wEUR=0; // Kasalar
        let tInc=0, tExp=0, tEsc=0; // Toplamlar

        list.forEach(t => {
            const amt = parseFloat(t.amount);
            // Kasa Hesapla
            if(t.type==='income') {
                if(t.currency==='TRY') wTRY+=amt; if(t.currency==='USD') wUSD+=amt; if(t.currency==='EUR') wEUR+=amt;
                if(!t.is_escrow) tInc += amt * (this.liveRates[t.currency]||1);
            } else { // Expense
                if(t.currency==='TRY') wTRY-=amt; if(t.currency==='USD') wUSD-=amt; if(t.currency==='EUR') wEUR-=amt;
                tExp += amt * (this.liveRates[t.currency]||1);
            }
            // Emanet
            if(t.is_escrow) {
                if(t.currency==='EUR') tEsc+=amt; else tEsc+=(amt/this.liveRates.EUR);
            }
        });

        // D. Ekrana Yaz
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

        // Tabloyu ve Grafiği Çiz
        this.renderTable(list.slice(0, 10)); // Son 10 işlem
        this.initChart(); // Grafiği Başlat
    },

    // 2. RENKLİ TABLO DOLDURMA (Düzeltildi)
    renderTable: function(list) {
        const tbody = document.getElementById('transactions-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        list.forEach(t => {
            const date = new Date(t.created_at).toLocaleDateString('tr-TR', {day:'numeric', month:'long', hour:'2-digit', minute:'2-digit'});
            
            // Renk ve Sınıf Mantığı
            let rowClass = 'row-expense'; // Varsayılan Kırmızı
            let symbol = '-';
            let colorClass = 'text-red';

            if (t.type === 'income') {
                rowClass = 'row-income'; // Yeşil Çizgi
                symbol = '+';
                colorClass = 'text-green'; // Yazı Yeşil
            }
            if (t.is_escrow) {
                rowClass = 'row-escrow'; // Turuncu Çizgi
                symbol = ''; 
                colorClass = 'text-orange';
            }
            // Özel Durum: Kur Dönüşümü
            if(t.category && t.category.includes('exchange')) {
                rowClass = 'row-exchange'; // Mor Çizgi
                colorClass = 'text-indigo';
            }

            const row = `
                <tr class="${rowClass}">
                    <td style="color:#64748b; font-size:12px; padding:15px;">${date}</td>
                    <td style="padding:15px; font-weight:600; color:#334155;">${t.description || '-'}</td>
                    <td style="padding:15px;"><span class="badge badge-gray">${t.category}</span></td>
                    <td style="padding:15px; text-align:right; font-weight:800; font-size:15px;" class="${colorClass}">
                        ${symbol} ${this.fmt(t.amount, t.currency)}
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    },

    // 3. GRAFİK YÖNETİMİ (Kutucuklara Tıklayınca Değişen)
    initChart: function() {
        const ctx = document.getElementById('financeChart');
        if (!ctx) return;
        if (this.chartInstance) this.chartInstance.destroy();

        // Şimdilik görsel olarak çalışması için örnek veri (Veritabanından çekince burayı güncelleyeceğiz)
        const labels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
        
        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { 
                        label: 'Net Kâr', 
                        data: [1000, 3000, 2000, 5000, 4000, 6000, 7000], 
                        borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4,
                        hidden: !this.chartState.profit // Kutucuk kapalıysa gizle
                    },
                    { 
                        label: 'Toplam Ciro', 
                        data: [2000, 4000, 3000, 6000, 5000, 8000, 9000], 
                        borderColor: '#3b82f6', borderDash: [5, 5], tension: 0.4,
                        hidden: !this.chartState.income 
                    },
                    { 
                        label: 'Toplam Gider', 
                        data: [1000, 1000, 1000, 1000, 1000, 2000, 2000], 
                        borderColor: '#ef4444', tension: 0.4,
                        hidden: !this.chartState.expense 
                    }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }, // Efsaneyi gizle, kutucuklar kullanılıyor
                scales: { y: { beginAtZero: true, grid: { color: '#f3f4f6' } }, x: { grid: { display: false } } }
            }
        });
    },

    // KUTUCUKLARA TIKLAYINCA (TOGGLE)
    toggleChartData: function(type, cardElement) {
        // 1. Durumu tersine çevir (Açıksa kapat, kapalıysa aç)
        this.chartState[type] = !this.chartState[type];
        
        // 2. Kartın görünümünü güncelle (Soluklaştır/Parlat)
        if(this.chartState[type]) {
            cardElement.classList.remove('inactive');
            // Başlıktaki (KAPALI) yazısını (AÇIK) yap
            let title = cardElement.querySelector('.card-title');
            if(title) title.innerText = title.innerText.replace('(KAPALI)', '(AÇIK)');
        } else {
            cardElement.classList.add('inactive');
            let title = cardElement.querySelector('.card-title');
            if(title) title.innerText = title.innerText.replace('(AÇIK)', '(KAPALI)');
        }

        // 3. Grafiği Güncelle
        if(this.chartInstance) {
            // Dataset sırası: 0=Profit, 1=Income, 2=Expense
            let index = 0;
            if(type === 'income') index = 1;
            if(type === 'expense') index = 2;
            
            // Chart.js'de görünürlüğü değiştir
            // Dikkat: Chart.js'de 'hidden: true' demek gizli demektir.
            // Bizim 'chartState' true ise AÇIK demektir. O yüzden tersini alıyoruz.
            this.chartInstance.getDatasetMeta(index).hidden = !this.chartState[type];
            this.chartInstance.update();
        }
    },

    // ZAMAN BUTONLARI (Görsel Efekt)
    filterChartDate: function(period, btn) {
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        console.log("Zaman filtresi: " + period);
        // İlerde buraya tarih sorgusu gelecek
    },

    // EMANET DETAYI (Çift Tıklama)
    openEscrowDetails: async function() {
        window.ui.openModal('modal-escrow-details');
        const tbody = document.getElementById('escrow-list-body');
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Veriler yükleniyor...</td></tr>';

        const { data: list } = await window.supabaseClient.from('transactions').select('*').eq('is_escrow', true).order('created_at', {ascending:false});
        
        let pEUR=0, pUSD=0, pTRY=0;
        tbody.innerHTML = '';
        
        if(list) list.forEach(t => {
            const amt = parseFloat(t.amount);
            if(t.currency==='EUR') pEUR+=amt; if(t.currency==='USD') pUSD+=amt; if(t.currency==='TRY') pTRY+=amt;
            
            tbody.innerHTML += `<tr>
                <td style="padding:10px;">${new Date(t.created_at).toLocaleDateString()}</td>
                <td>${t.description}</td>
                <td style="font-weight:bold; color:#f59e0b;">${this.fmt(amt, t.currency)}</td>
                <td><span class="badge bg-orange-light">Emanette</span></td>
            </tr>`;
        });

        this.updateText('pool-eur', this.fmt(pEUR, 'EUR'));
        this.updateText('pool-usd', this.fmt(pUSD, 'USD'));
        this.updateText('pool-try', this.fmt(pTRY, 'TRY'));
    },

    // --- FORM KAYITLARI (Değişmedi, aynen ekliyoruz) ---
    saveExchange: async function(e) { 
        e.preventDefault(); 
        const btn=e.target.querySelector('button'); btn.disabled=true;
        const outA=document.getElementById('ex-amount-out').value, outC=document.getElementById('ex-currency-out').value;
        const inA=document.getElementById('ex-amount-in').value, inC=document.getElementById('ex-currency-in').value;
        const desc=document.getElementById('ex-desc').value;
        
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

    // Ortak Kayıt Fonksiyonu (Kod tekrarını önlemek için)
    genericSave: async function(e, type, modalId) {
        const form = e.target;
        const btn = form.querySelector('button'); btn.disabled=true;
        // Basit form okuma (Input ID'leri yerine form sırasına güveniyoruz veya özel mantık)
        // Hızlı çözüm için form elemanlarını seçelim:
        const cat = form.querySelector('select')?.value || 'general';
        const descInput = form.querySelector('input[type="text"]');
        const amtInput = form.querySelector('input[type="number"]');
        const currInput = form.querySelectorAll('select')[1]; // Genelde 2. select para birimi
        
        const tData = {
            type: type === 'income' ? 'income' : (type==='escrow'?'income':'expense'),
            category: type === 'escrow' ? 'escrow_deposit' : (cat),
            description: descInput ? descInput.value : 'İşlem',
            amount: amtInput ? amtInput.value : 0,
            currency: currInput ? currInput.value : 'TRY',
            is_escrow: type === 'escrow'
        };

        const { error } = await window.supabaseClient.from('transactions').insert([tData]);
        if(!error) { window.ui.closeModal(modalId); form.reset(); this.refreshDashboard(); }
        else alert(error.message);
        btn.disabled=false;
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
