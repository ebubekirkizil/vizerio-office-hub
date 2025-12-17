window.accounting = {
    // Sabit Kur Tanımları (Başlangıç için)
    liveRates: { TRY: 1, USD: 34.50, EUR: 36.50 },
    
    // Verileri Çekme ve Ekrana Basma Fonksiyonu
    refreshDashboard: async function() {
        console.log("Veriler çekiliyor...");
        
        // Supabase bağlantısı var mı kontrol et
        if (!window.supabaseClient) {
            console.error("Supabase Client bulunamadı!");
            return;
        }

        // 1. Verileri Veritabanından İste
        const { data: list, error } = await window.supabaseClient
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Veri Hatası:", error);
            alert("Veriler alınamadı: " + error.message);
            return;
        }

        console.log("Gelen Veriler:", list); // Konsolda verileri görmek için

        // 2. Tabloyu Temizle ve Doldur
        const tbody = document.getElementById('transactions-body');
        if(tbody) {
            tbody.innerHTML = ''; // Eski verileri temizle
            
            if (!list || list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;"><b>Kayıt Yok</b><br>Veritabanı boş veya erişim izni yok.</td></tr>';
            } else {
                list.forEach(t => {
                    // Veri güvenliği (Null kontrolü)
                    const date = t.created_at ? new Date(t.created_at).toLocaleDateString('tr-TR') : '-';
                    const desc = t.description || 'İsimsiz İşlem';
                    const amt = t.amount || 0;
                    const curr = t.currency || 'TRY';
                    const type = t.type || 'expense';
                    
                    // Renk Ayarı
                    let color = type === 'income' ? 'green' : 'red';
                    let sign = type === 'income' ? '+' : '-';

                    // Satırı Ekle
                    tbody.innerHTML += `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:10px;">${date}</td>
                            <td style="padding:10px;">${desc}</td>
                            <td style="padding:10px;"><span class="badge">${t.category || '-'}</span></td>
                            <td style="padding:10px; text-align:right; color:${color}; font-weight:bold;">
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
            // Sadece sayısal değerleri al
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

        // Ekrana Yazdır
        if(document.getElementById('wallet-try')) document.getElementById('wallet-try').innerText = '₺' + totals.TRY.toFixed(2);
        if(document.getElementById('wallet-usd')) document.getElementById('wallet-usd').innerText = '$' + totals.USD.toFixed(2);
        if(document.getElementById('wallet-eur')) document.getElementById('wallet-eur').innerText = '€' + totals.EUR.toFixed(2);
    },
    
    // Emanet Penceresini Aç (Basit Versiyon)
    openEscrowDetails: function() {
        if(window.ui && window.ui.openModal) {
            window.ui.openModal('modal-escrow-details');
            this.switchEscrowTab('EUR');
        } else {
            alert("Modal açma fonksiyonu (window.ui) bulunamadı!");
        }
    },

    // Emanet Sekmesi Değiştirme
    switchEscrowTab: function(curr) {
        const container = document.getElementById('escrow-dynamic-content');
        if(container) {
            container.innerHTML = `<div style="padding:20px; text-align:center;"><b>${curr} KASA YÜKLENİYOR...</b></div>`;
            
            // Veritabanından sadece o para birimine ait emanetleri çek
            window.supabaseClient
                .from('transactions')
                .select('*')
                .eq('is_escrow', true)
                .eq('currency', curr)
                .then(({ data, error }) => {
                    if(error) {
                        container.innerHTML = "Hata: " + error.message;
                        return;
                    }
                    
                    if(!data || data.length === 0) {
                        container.innerHTML = `<div style="padding:40px; text-align:center; color:#999;">Bu kasada emanet yok.</div>`;
                    } else {
                        let html = '<table style="width:100%; border-collapse:collapse;">';
                        html += '<tr style="background:#f1f5f9; text-align:left;"><th>Açıklama</th><th style="text-align:right">Tutar</th></tr>';
                        
                        data.forEach(x => {
                             html += `
                             <tr style="border-bottom:1px solid #eee;">
                                <td style="padding:10px;">${x.description}</td>
                                <td style="padding:10px; text-align:right;">${x.amount} ${x.currency}</td>
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
    setTimeout(() => {
        if(window.accounting) {
            window.accounting.refreshDashboard();
        }
    }, 1000); // 1 saniye bekle ki Supabase tam yüklensin
});
