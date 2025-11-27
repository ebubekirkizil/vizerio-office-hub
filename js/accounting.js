// js/accounting.js - Muhasebe (TABLO DESTEKLİ)

window.accounting = {
    
    // 1. DASHBOARD ve TABLOYU GÜNCELLE
    refreshDashboard: async function() {
        console.log("🔄 Finansal veriler çekiliyor...");
        
        // --- A. KARTLAR İÇİN HESAPLAMA ---
        const { data: allData, error } = await window.supabaseClient
            .from('transactions')
            .select('*');

        if (!error && allData) {
            let totalIncome = 0;
            let totalExpense = 0;
            let totalEscrow = 0;

            allData.forEach(item => {
                const amount = parseFloat(item.amount);
                if (item.is_escrow) totalEscrow += amount;
                else if (item.type === 'income') totalIncome += amount;
                else if (item.type === 'expense') totalExpense += amount;
            });

            const netProfit = totalIncome - totalExpense;
            this.updateCard('money-profit', netProfit, 'TRY');
            this.updateCard('money-income', totalIncome, 'TRY');
            this.updateCard('money-expense', totalExpense, 'TRY');
            this.updateCard('money-escrow', totalEscrow, 'EUR');
        }

        // --- B. TABLOYU DOLDUR (SON 10 İŞLEM) ---
        this.loadTransactionsTable();
    },

    // 2. TABLO VERİSİNİ ÇEK VE YAZ
    loadTransactionsTable: async function() {
        const tbody = document.getElementById('transactions-body');
        if(!tbody) return;

        // Son 10 işlemi çek (En yeni en üstte)
        const { data: list, error } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            tbody.innerHTML = '<tr><td colspan="4" style="color:red;">Veri hatası!</td></tr>';
            return;
        }

        // Tabloyu Temizle
        tbody.innerHTML = '';

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999;">Henüz işlem yok.</td></tr>';
            return;
        }

        // Satırları Ekle
        list.forEach(item => {
            const date = new Date(item.created_at).toLocaleDateString('tr-TR');
            const colorClass = item.type === 'income' ? 'text-green' : (item.is_escrow ? 'text-orange' : 'text-red');
            const symbol = item.type === 'income' ? '+' : '-';
            const amountFmt = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: item.currency }).format(item.amount);

            let categoryLabel = item.category;
            if(item.category === 'visa_service') categoryLabel = '<span class="badge bg-green-light">Vize Geliri</span>';
            if(item.category === 'rent') categoryLabel = '<span class="badge bg-red-light">Kira/Ofis</span>';
            if(item.is_escrow) categoryLabel = '<span class="badge bg-orange-light">Emanet</span>';

            const row = `
                <tr>
                    <td style="color:#666; font-size:12px;">${date}</td>
                    <td style="font-weight:500;">${item.description || '-'}</td>
                    <td>${categoryLabel}</td>
                    <td class="${colorClass}" style="font-weight:bold;">${symbol} ${amountFmt}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    },

    updateCard: function(elementId, amount, currency) {
        const el = document.getElementById(elementId);
        if (el) el.innerText = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency }).format(amount);
    },

    // ... (saveExpense, saveEscrow, saveExtraIncome kodları aynı kalacak, buraya ekleyebilirsin) ...
    // Hepsini tekrar yazmamak için burayı kısa tuttum, mevcut kodlarını koru.
    saveExpense: async function(event) { /* ...Eski kod... */ },
    saveEscrow: async function(event) { /* ...Eski kod... */ },
    saveExtraIncome: async function(event) { /* ...Eski kod... */ }
};

// Yüklenince çalıştır
window.addEventListener('load', () => {
    window.accounting.refreshDashboard();
    
    // Form Listener'ları
    const expenseForm = document.getElementById('form-expense');
    if(expenseForm) expenseForm.onsubmit = window.accounting.saveExpense;
    // ... diğerleri ...
});
