// js/accounting.js - VIZERIO PRO (BUTON BAĞLANTILARI FİXLENDİ)

window.accounting = {
    
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.20 },
    chartInstance: null,
    chartState: { profit: true, income: true, expense: true },
    currentPeriod: 'all',
    allTransactions: [],
    escrowTotals: { EUR: 0, USD: 0, TRY: 0 },
    activeEscrowTab: 'EUR',
    
    // 1. SİSTEMİ BAŞLAT
    refreshDashboard: async function() {
        console.log("🚀 Sistem Başlatılıyor...");
        
        // Supabase Bağlantı Kontrolü
        if (!window.supabaseClient) {
            alert("HATA: Veritabanı bağlantısı yok! Sayfayı yenileyin.");
            return;
        }

        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
            const d = await res.json();
            this.liveRates = { TRY: 1, USD: (1/d.rates.USD), EUR: (1/d.rates.EUR) };
            if(document.getElementById('live-rates-display')) 
                document.getElementById('live-rates-display').innerText = `USD: ${this.liveRates.USD.toFixed(2)} | EUR: ${this.liveRates.EUR.toFixed(2)}`;
        } catch (e) {}

        const { data: list, error } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error("Veri Hatası:", error);
        
        this.allTransactions = list || [];
        this.calculateStats(this.allTransactions);
        this.renderTable(this.allTransactions);
        this.updateCardStatus('profit'); 
        this.updateCardStatus('income'); 
        this.updateCardStatus('expense');
        setTimeout(() => this.updateChartRender(), 200);
    },

    // 2. ANA KAYIT FONKSİYONU (DÜZELTİLDİ)
    genericSave: async function(type, modalId, isEscrow=false) {
        const form = document.querySelector(`#${modalId} form`);
        const btn = form.querySelector('button');
        const oldText = btn.innerText;
        btn.disabled = true; 
        btn.innerText = "⏳...";

        try {
            let cat='general', desc='', amt=0, curr='TRY';

            if(modalId==='modal-expense'){ 
                cat=document.getElementById('exp-category').value; 
                desc=document.getElementById('exp-title').value; 
                amt=document.getElementById('exp-amount').value; 
                curr=document.getElementById('exp-currency').value; 
            }
            else if(modalId==='modal-extra-income'){ 
                cat='extra_service'; 
                desc=document.getElementById('ei-customer').value; 
                amt=document.getElementById('ei-amount').value; 
                curr=document.getElementById('ei-currency').value; 
            }
            else if(modalId==='modal-escrow'){ 
                cat='escrow_deposit'; 
                desc=document.getElementById('esc-customer').value; 
                amt=document.getElementById('esc-amount').value; 
                curr=document.getElementById('esc-currency').value; 
            }

            // Hata Kontrolü: Tutar boşsa uyar
            if(!amt || amt <= 0) { throw new Error("Lütfen geçerli bir tutar giriniz."); }

            const { error } = await window.supabaseClient.from('transactions').insert({ 
                type: type, category: cat, description: desc, amount: amt, currency: curr, is_escrow: isEscrow 
            });

            if (error) throw error;

            alert("✅ Kayıt Başarılı!");
            window.ui.closeModal(modalId);
            form.reset();
            this.refreshDashboard();

        } catch (err) {
            alert("🛑 HATA: " + err.message);
        } finally {
            btn.disabled = false;
            btn.innerText = oldText;
        }
    },

    // 3. EMANET İŞLEM KAYDI
    saveEscrowAction: async function(e) {
        e.preventDefault();
        // Bu fonksiyon çağrıldığında 'this' accounting objesi olmalı
        const btn = document.querySelector('#form-escrow-action button[type="submit"]'); 
        const oldText = btn.innerText;
        btn.disabled = true; btn.innerText = "İşleniyor...";

        try {
            const sourceId = document.getElementById('act-source-id').value;
            const type = document.getElementById('act-type').value;
            const amount = document.getElementById('act-amount').value;
            const note = document.getElementById('act-note').value;
            const currency = document.getElementById('act-currency').value;

            const sourceTx = this.allTransactions.find(t => t.id === sourceId);
            const refName = sourceTx ? sourceTx.description.split('-')[0] : 'Kayıt';

            let category = 'escrow_refund';
            let descPrefix = 'İADE: ';
            if (type === 'payment') { category = 'escrow_payment'; descPrefix = 'ÖDEME: '; } 
            else if (type === 'profit') { category = 'visa_service'; descPrefix = 'GELİR: '; }

            // 1. İşlemi Kaydet
            const { error: insertError } = await window.supabaseClient.from('transactions').insert({
                type: 'expense', category: category, description: `${descPrefix}${refName} - ${note}`,
                amount: amount, currency: currency, is_escrow: true, created_at: new Date()
            });
            if(insertError) throw insertError;

            // 2. Eski Kaydı Arşivle
            await window.supabaseClient.from('transactions').update({ category: 'archived_escrow' }).eq('id', sourceId);

            window.ui.closeModal('modal-escrow-action');
            this.refreshDashboard(); 
            setTimeout(() => { 
                this.openEscrowDetails(); 
                alert("✅ İşlem Tamamlandı."); 
            }, 500);

        } catch (err) {
            alert("🛑 Hata: " + err.message);
        } finally {
            btn.disabled = false;
            btn.innerText = oldText;
        }
    },

    // 4. DÖVİZ KAYDI
    saveExchange: async function(e) {
        e.preventDefault();
        const oa=document.getElementById('ex-out-amt').value, oc=document.getElementById('ex-out-curr').value;
        const ia=document.getElementById('ex-in-amt').value, ic=document.getElementById('ex-in-curr').value;
        
        const { error } = await window.supabaseClient.from('transactions').insert([
            {type:'expense', category:'exchange_out', description:'Döviz Bozum', amount:oa, currency:oc},
            {type:'income', category:'exchange_in', description:'Döviz Giriş', amount:ia, currency:ic}
        ]);

        if(error) alert("Hata: " + error.message);
        else {
            window.ui.closeModal('modal-exchange'); 
            this.refreshDashboard();
            alert("✅ Döviz işlemi kaydedildi.");
        }
    },

    // --- HESAPLAMA, TABLO, GRAFİK (DEĞİŞMEDİ) ---
    calculateStats: function(list) {
        const selectedCurr = document.getElementById('chart-currency') ? document.getElementById('chart-currency').value : 'TRY';
        let wTRY=0, wUSD=0, wEUR=0, tInc=0, tExp=0, escTotalVal=0;
        this.escrowTotals = { EUR: 0, USD: 0, TRY: 0 };

        list.forEach(t => {
            const amt = parseFloat(t.amount);
            if (t.type === 'income') { if(t.currency==='
