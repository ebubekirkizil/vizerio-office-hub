// js/accounting.js - Muhasebe ve Finans İşlemleri
// Bu dosya Gelir, Gider ve Emanet işlemlerini veritabanına kaydeder.

window.accounting = {
    
    // 1. DASHBOARD VERİLERİNİ ÇEK VE GÜNCELLE
    refreshDashboard: async function() {
        console.log("🔄 Finansal veriler güncelleniyor...");
        
        // Supabase'den tüm işlemleri çek
        const { data, error } = await window.supabaseClient
            .from('transactions')
            .select('*');

        if (error) {
            console.error("Veri çekme hatası:", error);
            return;
        }

        // Hesaplamalar
        let totalIncome = 0;
        let totalExpense = 0;
        let totalEscrow = 0;

        data.forEach(item => {
            const amount = parseFloat(item.amount); // Sayıya çevir

            // Emanet ise (Turuncu Kart)
            if (item.is_escrow) {
                totalEscrow += amount; // Şimdilik döviz ayrımı yapmadan topluyoruz
            } 
            // Gelir ise (Mavi Kart)
            else if (item.type === 'income') {
                totalIncome += amount;
            } 
            // Gider ise (Kırmızı Kart)
            else if (item.type === 'expense') {
                totalExpense += amount;
            }
        });

        const netProfit = totalIncome - totalExpense;

        // Ekrana Yazdır (Para formatında)
        this.updateCard('money-profit', netProfit, 'TRY');
        this.updateCard('money-income', totalIncome, 'TRY');
        this.updateCard('money-expense', totalExpense, 'TRY');
        this.updateCard('money-escrow', totalEscrow, 'EUR'); // Emanet genelde Euro olur
    },

    // Karttaki rakamı güncelleme yardımcısı
    updateCard: function(elementId, amount, currency) {
        const el = document.getElementById(elementId);
        if (el) {
            // Para formatı (Örn: 1.250,00 ₺)
            el.innerText = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency }).format(amount);
        }
    },

    // 2. GİDER KAYDETME (Kırmızı Form)
    saveExpense: async function(event) {
        event.preventDefault(); // Sayfanın yenilenmesini engelle

        // Formdaki verileri al
        const form = event.target;
        const category = form.querySelector('select').value;
        const desc = form.querySelector('input[type="text"]').value;
        const amount = form.querySelector('input[type="number"]').value;
        const currency = form.querySelectorAll('select')[1].value;

        // Supabase'e Ekle
        const { error } = await window.supabaseClient
            .from('transactions')
            .insert({
                type: 'expense',
                category: category,
                description: desc,
                amount: amount,
                currency: currency,
                is_escrow: false,
                created_at: new Date()
            });

        if (error) {
            alert("Hata: " + error.message);
        } else {
            alert("✅ Gider başarıyla kaydedildi!");
            window.ui.closeModal('modal-expense'); // Pencereyi kapat
            form.reset(); // Formu temizle
            this.refreshDashboard(); // Rakamları güncelle
        }
    },

    // 3. EMANET KAYDETME (Turuncu Form)
    saveEscrow: async function(event) {
        event.preventDefault();
        const form = event.target;
        
        const customer = form.querySelector('input[type="text"]').value;
        const category = form.querySelector('select').value;
        const amount = form.querySelector('input[type="number"]').value;
        const currency = form.querySelectorAll('select')[1].value;

        const { error } = await window.supabaseClient
            .from('transactions')
            .insert({
                type: 'income', // Para girişi olduğu için income, ama escrow=true
                category: 'escrow_deposit',
                description: `${category} - ${customer}`,
                amount: amount,
                currency: currency,
                is_escrow: true, // BU ÇOK ÖNEMLİ (Ciroya katma)
                created_at: new Date()
            });

        if (error) alert("Hata: " + error.message);
        else {
            alert("✅ Emanet para kasaya işlendi.");
            window.ui.closeModal('modal-escrow');
            form.reset();
            this.refreshDashboard();
        }
    },

    // 4. EK GELİR KAYDETME (Mavi Form)
    saveExtraIncome: async function(event) {
        event.preventDefault();
        const form = event.target;

        const category = form.querySelector('select').value;
        const salePrice = form.querySelector('input[type="number"]').value; // Satış fiyatı
        // Not: Maliyeti şimdilik basit tutalım, sadece satış fiyatını ciroya ekleyelim.
        
        const { error } = await window.supabaseClient
            .from('transactions')
            .insert({
                type: 'income',
                category: 'extra_service',
                description: category,
                amount: salePrice,
                currency: 'TRY', // Varsayılan TL
                is_escrow: false,
                created_at: new Date()
            });

        if (error) alert("Hata: " + error.message);
        else {
            alert("✅ Satış başarıyla yapıldı.");
            window.ui.closeModal('modal-extra-income');
            form.reset();
            this.refreshDashboard();
        }
    }
};

// Formları Dinlemeye Başla (Sayfa Yüklenince)
window.addEventListener('load', () => {
    // Dashboard'u ilk açılışta güncelle
    window.accounting.refreshDashboard();

    // Form Submit Olaylarını Bağla
    const expenseForm = document.getElementById('form-expense');
    if(expenseForm) expenseForm.onsubmit = window.accounting.saveExpense;

    const escrowForm = document.getElementById('form-escrow');
    if(escrowForm) escrowForm.onsubmit = window.accounting.saveEscrow;

    const extraForm = document.getElementById('form-extra-income');
    if(extraForm) extraForm.onsubmit = window.accounting.saveExtraIncome;
});
