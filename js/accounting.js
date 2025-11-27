// js/accounting.js - CANLI KUR DESTEKLİ FİNANS MODÜLÜ

window.accounting = {
    
    // Varsayılan Kurlar (İnternet yoksa bunlar çalışır)
    liveRates: {
        TRY: 1,
        USD: 31.50,
        EUR: 34.20
    },

    // 1. İNTERNETTEN CANLI KUR ÇEK
    fetchLiveRates: async function() {
        console.log("🌍 İnternetten canlı kur çekiliyor...");
        try {
            // Ücretsiz API kullanıyoruz (exchangerate-api.com)
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const data = await response.json();
            
            // API "1 TL = 0.03 USD" veriyor. Bize "1 USD = 31 TL" lazım.
            // O yüzden 1 bölü kur yapıyoruz.
            this.liveRates = {
                TRY: 1,
                USD: (1 / data.rates.USD).toFixed(2), // Örn: 31.50
                EUR: (1 / data.rates.EUR).toFixed(2)  // Örn: 34.20
            };

            console.log("✅ Güncel Kurlar Alındı:", this.liveRates);
            
            // Kurları sayfanın bir köşesinde (Header'da) göstermek için
            this.updateHeaderRates();

        } catch (error) {
            console.error("⚠️ Kur çekilemedi, varsayılanlar kullanılıyor.", error);
        }
    },

    // Header'daki küçük kur bilgisini güncelle
    updateHeaderRates: function() {
        // Eğer header'da kur gösterilen bir alan varsa güncelle (Şimdilik opsiyonel)
        // İlerde header'a "€: 34.20" yazdıran kodu buraya ekleriz.
    },

    // 2. DASHBOARD GÜNCELLEME (Canlı Kurlar ile)
    refreshDashboard: async function() {
        // Önce kurları çek, sonra hesapla
        await this.fetchLiveRates();

        const { data: allData, error } = await window.supabaseClient.from('transactions').select('*');

        if (!error && allData) {
            let totalIncomeTRY = 0;
            let totalExpenseTRY = 0;
            let totalEscrowEUR = 0;

            allData.forEach(item => {
                const amount = parseFloat(item.amount);
                const currency = item.currency || 'TRY';
                
                // MANTIK: O günkü kurla değil, ŞU ANKİ kurla TL karşılığını bul
                // (Muhasebede tartışmalı bir konudur ama anlık durum için bu iyidir)
                const rate = this.liveRates[currency] || 1;
                const amountInTRY = amount * rate;

                if (item.is_escrow) {
                    // Emanetleri Euro havuzunda topla
                    if(currency === 'EUR') totalEscrowEUR += amount;
                    else totalEscrowEUR += (amountInTRY / this.liveRates.EUR);
                } 
                else if (item.type === 'income') {
                    totalIncomeTRY += amountInTRY;
                } 
                else if (item.type === 'expense') {
                    totalExpenseTRY += amountInTRY;
                }
            });

            const netProfitTRY = totalIncomeTRY - totalExpenseTRY;

            // Kartları Güncelle
            this.updateCard('money-profit', netProfitTRY, 'TRY');
            this.updateCard('money-income', totalIncomeTRY, 'TRY');
            this.updateCard('money-expense', totalExpenseTRY, 'TRY');
            this.updateCard('money-escrow', totalEscrowEUR, 'EUR');
        }

        // Tabloyu da güncelle
        this.loadTransactionsTable();
    },

    // 3. TABLO (Tasarım Güzelleştirilmiş Hali)
    loadTransactionsTable: async function() {
        const tbody = document.getElementById('transactions-body');
        if(!tbody) return;

        const { data: list, error } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        tbody.innerHTML = ''; 

        if (error || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:#999;">Henüz işlem yok.</td></tr>';
            return;
        }

        list.forEach(item => {
            const date = new Date(item.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour:'2-digit', minute:'2-digit' });
            
            // Sol Çizgi Rengi
            let rowClass = 'row-expense'; 
            if (item.type === 'income') rowClass = 'row-income';
            if (item.is_escrow) rowClass = 'row-escrow';

            // Rozetler
            let catBadge = `<span class="badge badge-gray">${item.category}</span>`;
            if(item.category === 'visa_service') catBadge = `<span class="badge bg-green-light">Vize Geliri</span>`;
            if(item.category === 'rent') catBadge = `<span class="badge bg-red-light">Ofis/Kira</span>`;
            if(item.is_escrow) catBadge = `<span class="badge bg-orange-light">Emanet</span>`;
            
            // Tutar
            const symbol = item.type === 'income' ? '+' : '-';
            const amountFmt = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: item.currency }).format(item.amount);
            
            // Tutar Rengi
            let amountColor = 'var(--red-expense)';
            if(item.type === 'income') amountColor = 'var(--green-profit)';
            if(item.is_escrow) amountColor = 'var(--orange-escrow)';

            const row = `
                <tr class="${rowClass}">
                    <td style="color:#64748b;">${date}</td>
                    <td style="font-weight:600; color:#334155;">${item.description || '-'}</td>
                    <td>${catBadge}</td>
                    <td style="color:${amountColor};">
                        ${item.is_escrow ? '' : symbol} ${amountFmt}
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    },

    updateCard: function(elementId, amount, currency) {
        const el = document.getElementById(elementId);
        if (el) el.innerText = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency }).format(amount);
    },

    // KAYDETME İŞLEMLERİ (Aynı mantıkla devam)
    saveExpense: async function(event) {
        event.preventDefault(); 
        const form = event.target;
        // Basitleştirilmiş kayıt mantığı
        const category = form.querySelector('select').value;
        const desc = form.querySelector('input[type="text"]').value;
        const amount = form.querySelector('input[type="number"]').value;
        const currency = form.querySelectorAll('select')[1].value;

        const { error } = await window.supabaseClient.from('transactions').insert({
            type: 'expense', category, description: desc, amount, currency, is_escrow: false
        });

        if (!error) {
            alert("✅ Gider kaydedildi");
            window.ui.closeModal('modal-expense');
            form.reset();
            window.accounting.refreshDashboard();
        }
    },

    saveEscrow: async function(event) {
        event.preventDefault();
        const form = event.target;
        const customer = form.querySelector('input[type="text"]').value;
        const amount = form.querySelector('input[type="number"]').value;
        const currency = form.querySelectorAll('select')[1].value;

        const { error } = await window.supabaseClient.from('transactions').insert({
            type: 'income', category: 'escrow_deposit', description: customer, 
            amount, currency, is_escrow: true
        });

        if(!error) { alert("✅ Emanet alındı"); window.ui.closeModal('modal-escrow'); form.reset(); window.accounting.refreshDashboard(); }
    },
    
    saveExtraIncome: async function(event) {
        event.preventDefault();
        const form = event.target;
        const category = form.querySelector('select').value;
        const amount = form.querySelector('input[type="number"]').value;

        const { error } = await window.supabaseClient.from('transactions').insert({
            type: 'income', category: 'extra_service', description: category, 
            amount, currency: 'TRY', is_escrow: false
        });
        if(!error) { alert("✅ Satış yapıldı"); window.ui.closeModal('modal-extra-income'); form.reset(); window.accounting.refreshDashboard(); }
    }
};

// Yüklenince çalıştır
window.addEventListener('load', () => {
    window.accounting.refreshDashboard();
    
    // Form Listener'ları
    if(document.getElementById('form-expense')) document.getElementById('form-expense').onsubmit = window.accounting.saveExpense;
    if(document.getElementById('form-escrow')) document.getElementById('form-escrow').onsubmit = window.accounting.saveEscrow;
    if(document.getElementById('form-extra-income')) document.getElementById('form-extra-income').onsubmit = window.accounting.saveExtraIncome;
});
