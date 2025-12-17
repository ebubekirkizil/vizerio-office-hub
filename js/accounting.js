window.accounting = {
    // Sabit Kur Tanımları
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.50 },
    
    // Verileri Çekme ve Ekrana Basma Fonksiyonu
    refreshDashboard: async function() {
        console.log("Veriler çekiliyor...");
        
        // Supabase bağlantısı kontrolü
        if (!window.supabaseClient) {
            console.error("HATA: Supabase Client bulunamadı! script.js yüklendi mi?");
            return;
        }

        // 1. Verileri Veritabanından İste
        const { data: list, error } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Veri Çekme Hatası:", error);
            alert("Veriler alınamadı: " + error.message);
            return;
        }

        console.log("Gelen Veriler:", list); // Kontrol için

        // 2. Tabloyu Temizle ve Doldur
        const tbody = document.getElementById('transactions-body');
        if(tbody) {
            tbody.innerHTML = ''; // Temizle
            
            if (!list || list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;"><b>Kayıt Yok</b><br>Henüz işlem girilmemiş.</td></tr>';
            } else {
                list.forEach(t => {
                    // Veri güvenliği (Boş gelirse tire koy)
                    const date = t.created_at ? new Date(t.created_at).toLocaleDateString('tr-TR') : '-';
                    const desc = t.description || 'İsimsiz İşlem';
                    const amt = t.amount || 0;
                    const curr = t.currency || 'TRY';
                    const type = t.type || 'expense';
                    const category = t.category || 'Genel';
                    
                    // Renk Ayarı (Gelir yeşil, Gider kırmızı)
                    let color = type === 'income' ? 'text-green-600' : 'text-red-600';
                    let sign = type === 'income' ? '+' : '-';

                    // Satırı Ekle
                    tbody.innerHTML += `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:10px;">${date}</td>
                            <td style="padding:10px; font-weight:500;">${desc}</td>
                            <td style="padding:10px;"><span style="background:#f1f5f9; padding:2px 8px; border-radius:4px; font-size:12px;">${category}</span></td>
                            <td style="padding:10px; text-align:right; font-weight:bold;" class="${color}">
                                ${sign} ${amt} ${curr}
                            </td>
                        </tr>
                    `;
                });
            }
        }
        
        // 3. Hesaplamaları Yap (Kasa Durumu)
        this.calculateTotals(list || []);
    },

    // Toplamları Hesapla
    calculateTotals: function(transactions) {
        let totals = { TRY: 0, USD: 0, EUR: 0 };

        transactions.forEach(t => {
            let val = parseFloat(t.amount);
            if (isNaN(val)) val = 0;

            if (t.currency && totals[t.currency] !== undefined) {
                if (t.type === 'income') {
                    totals[t.currency] += val;
                } else {
                    totals[t.currency] -= val;
                }
            }
        });

        // Ekrana Yazdır (Elementler varsa)
        const updateEl = (id, val, sym) => {
            const el = document.getElementById(id);
            if(el) el.innerText = sym + val.toLocaleString('tr-TR', {minimumFractionDigits: 2});
        };

        updateEl('wallet-try', totals.TRY, '₺');
        updateEl('wallet-usd', totals.USD, '$');
        updateEl('wallet-eur', totals.EUR, '€');
    },
    
    // Emanet Penceresini Aç
    openEscrowDetails: function() {
        if(window.ui && window.ui.openModal) {
            window.ui.openModal('modal-escrow-details');
            this.switchEscrowTab('EUR'); // Varsayılan EUR aç
        } else {
            console.error("UI Modülü (window.ui) bulunamadı!");
        }
    },

    // Emanet Sekmesi Değiştirme
    switchEscrowTab: function(curr) {
        // Sekme butonlarının rengini ayarla (Aktif olanı seç)
        document.querySelectorAll('.esc-tab-btn').forEach(btn => {
            if(btn.innerText.includes(curr)) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        const container = document.getElementById('escrow-dynamic-content');
        if(container) {
            container.innerHTML = `<div style="padding:40px; text-align:center;"><b>${curr} KASA YÜKLENİYOR...</b></div>`;
            
            // Veritabanından sadece o para birimine ait EMANETLERİ çek
            window.supabaseClient
                .from('transactions')
                .select('*')
                .eq('is_escrow', true)  // Sadece emanetler
                .eq('currency', curr)   // Sadece seçilen para birimi
                .order('created_at', { ascending: false })
                .then(({ data, error }) => {
                    if(error) {
                        container.innerHTML = "<div style='color:red; text-align:center'>Hata: " + error.message + "</div>";
                        return;
                    }
                    
                    if(!data || data.length === 0) {
                        container.innerHTML = `<div style="padding:40px; text-align:center; color:#999;">Bu kasada aktif emanet yok.</div>`;
                    } else {
                        let html = '<table style="width:100%; border-collapse:collapse; background:white;">';
                        html += '<tr style="background:#f8fafc; text-align:left; color:#64748b; font-size:12px;"><th style="padding:10px;">TARİH</th><th style="padding:10px;">AÇIKLAMA</th><th style="padding:10px; text-align:right">TUTAR</th></tr>';
                        
                        data.forEach(x => {
                             const date = new Date(x.created_at).toLocaleDateString('tr-TR');
                             html += `
                             <tr style="border-bottom:1px solid #f1f5f9;">
                                <td style="padding:12px; font-size:13px;">${date}</td>
                                <td style="padding:12px; font-weight:600;">${x.description}</td>
                                <td style="padding:12px; text-align:right; color:#10b981; font-weight:bold;">+ ${x.amount} ${x.currency}</td>
                             </tr>`;
                        });
                        html += '</table>';
                        container.innerHTML = html;
                    }
                });
        }
    }
};

// Sayfa Yüklendiğinde Başlat
window.addEventListener('load', () => {
    // Supabase'in yüklenmesi için kısa bir süre tanı
    setTimeout(() => {
        if(window.accounting && window.accounting.refreshDashboard) {
            window.accounting.refreshDashboard();
        }
    }, 500);
});
