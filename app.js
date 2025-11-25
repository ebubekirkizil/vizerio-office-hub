// ==========================================
// VIZERIO ERP v3.2 - FULL FUNCTIONAL
// Veri Kaydetme ve Okuma Dahil
// ==========================================

// 1. SUPABASE BAĞLANTISI
const SUPABASE_URL = "https://dgvxzlfeagwzmyjqhupu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndnh6bGZlYWd3em15anFodXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDEyNDEsImV4cCI6MjA3OTU3NzI0MX0.rwVR89JBTeue0cAtbujkoIBbqg3VjAEsLesXPlcr078";

let supabase;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (error) {
    console.error("Supabase başlatılamadı:", error);
}

// 2. DOM ELEMENTLERİ
const crmTableBody = document.getElementById('crm-table-body');
const currencySelect = document.getElementById('currency-switch');
const menuItems = document.querySelectorAll('.menu-item');
const views = document.querySelectorAll('.view-section');
const crmTabs = document.querySelectorAll('.crm-tab');
const calendarBtn = document.getElementById('btn-calendar-toggle');
const calendarPopover = document.getElementById('calendar-popover');
const toggleBtns = document.querySelectorAll('.toggle-btn'); 
const timeBtns = document.querySelectorAll('.time-btn');     

// Durum Yönetimi
const state = {
    currency: 'TRY',
    rates: { TRY: 1, USD: 0.035, EUR: 0.032 },
    currentUser: null,
    chartInstance: null,
    chartData: { revenue: 0, expense: 0, profit: 0 }
};

// ================= BAŞLATMA =================
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    
    const dateEl = document.getElementById('current-date');
    if(dateEl) dateEl.innerText = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    if (supabase) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                await supabase.auth.signInAnonymously();
            } else {
                state.currentUser = session.user;
                updateUserProfile(session.user);
            }
            await initDashboard();
            await initCRM();
        } catch (err) {
            console.error("Veri yükleme hatası:", err);
            renderChart(0, 0, 0);
        }
    }
});

// ================= ETKİLEŞİMLER & BUTONLAR =================
function setupEventListeners() {
    // 1. Para Birimi
    if(currencySelect) {
        currencySelect.addEventListener('change', (e) => {
            state.currency = e.target.value;
            initDashboard();
        });
    }

    // 2. Menü Geçişleri
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            
            const target = item.getAttribute('data-target');
            if(target) {
                views.forEach(v => v.classList.remove('active'));
                const targetView = document.getElementById('view-' + target);
                if(targetView) targetView.classList.add('active');
                
                const headerTitle = document.getElementById('page-header-title');
                if(headerTitle) {
                    if(target === 'dashboard') headerTitle.innerText = 'Finansal Dashboard';
                    if(target === 'crm') headerTitle.innerText = 'Operasyon & CRM';
                }
            }
        });
    });

    // 3. CRM Tabları
    crmTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.crm-tab').forEach(el => el.classList.remove('active'));
            tab.classList.add('active');
            renderCRMTable(tab.getAttribute('data-filter'));
        });
    });

    // 4. Takvim
    if(calendarBtn) {
        calendarBtn.addEventListener('click', () => {
            if(calendarPopover) calendarPopover.classList.toggle('hidden');
        });
    }

    // 5. Grafik Filtreleri
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            const datasetIndex = parseInt(btn.getAttribute('data-dataset'));
            if(state.chartInstance) {
                const isVisible = state.chartInstance.isDatasetVisible(datasetIndex);
                if (isVisible) state.chartInstance.hide(datasetIndex);
                else state.chartInstance.show(datasetIndex);
            }
        });
    });

    // --- KAYDETME BUTONLARINI BAĞLA ---
    
    // Gider Kaydet Butonu
    const expenseModal = document.getElementById('modal-expense');
    if(expenseModal) {
        const saveBtn = expenseModal.querySelector('.btn-danger'); // "Gideri İşle" butonu
        if(saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault(); // Form submit engelle
                saveExpense();
            });
        }
    }

    // Emanet Kaydet Butonu
    const escrowModal = document.getElementById('modal-escrow');
    if(escrowModal) {
        const saveBtn = escrowModal.querySelector('.btn-warning'); // "Emanete Al" butonu
        if(saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                saveEscrow();
            });
        }
    }
}

// ================= VERİ KAYDETME FONKSİYONLARI =================

// 1. GİDER KAYDET
async function saveExpense() {
    const modal = document.getElementById('modal-expense');
    const categorySelect = modal.querySelector('select'); // İlk select kategori
    const amountInput = modal.querySelector('input[type="number"]'); // Tutar
    // Döviz tipi input grubunun içindeki select
    const currencyInput = modal.querySelector('.input-group select'); 

    const category = categorySelect ? categorySelect.value : 'Diğer';
    const amount = amountInput ? amountInput.value : 0;
    const currency = currencyInput ? currencyInput.value : 'TRY';

    if (!amount || amount <= 0) return alert("Lütfen geçerli bir tutar giriniz.");

    const { error } = await supabase.from('expenses').insert({
        category: category,
        amount: amount,
        currency: currency,
        created_by: state.currentUser?.id
    });

    if (error) {
        console.error(error);
        alert("Hata: " + error.message);
    } else {
        alert("Gider kaydedildi.");
        closeModal('modal-expense');
        if(amountInput) amountInput.value = ''; // Temizle
        initDashboard(); // Paneli güncelle
    }
}

// 2. EMANET KAYDET
async function saveEscrow() {
    const modal = document.getElementById('modal-escrow');
    const clientInput = modal.querySelector('input[type="text"]'); // İsim arama
    const amountInput = modal.querySelector('input[type="number"]'); // Tutar
    const descInput = modal.querySelector('textarea'); // Açıklama

    const clientName = clientInput ? clientInput.value : '';
    const amount = amountInput ? amountInput.value : 0;
    const desc = descInput ? descInput.value : '';

    if (!amount || !clientName) return alert("Müşteri adı ve tutar zorunludur.");

    // İsme göre ilk müşteriyi bulalım (Basit eşleşme)
    const { data: clients } = await supabase
        .from('clients')
        .select('client_id')
        .ilike('full_name', `%${clientName}%`)
        .limit(1);

    if (!clients || clients.length === 0) {
        return alert("Müşteri bulunamadı. Lütfen tam adını CRM listesindeki gibi yazınız.");
    }

    const { error } = await supabase.from('escrow_transactions').insert({
        client_id: clients[0].client_id,
        amount: amount,
        description: desc,
        created_by: state.currentUser?.id
    });

    if (error) {
        console.error(error);
        alert("Hata: " + error.message);
    } else {
        alert("Emanet kaydı oluşturuldu.");
        closeModal('modal-escrow');
        if(amountInput) amountInput.value = '';
        initDashboard();
    }
}

// 3. VİZE DOSYASI (WIZARD SONU)
async function saveVisaFile() {
    const step1 = document.getElementById('wiz-step-1');
    const nameInput = step1.querySelector('input[type="text"]'); // Ad Soyad
    const selects = step1.querySelectorAll('select'); // [0]: Ülke, [1]: Vize Tipi
    
    const name = nameInput ? nameInput.value : '';
    const country = selects[0] ? selects[0].value : '';
    const type = selects[1] ? selects[1].value : '';

    if (!name) return alert("Müşteri adı zorunludur.");

    // A) Müşteriyi Oluştur
    const { data: client, error: cErr } = await supabase
        .from('clients')
        .insert({ 
            full_name: name, 
            country: country, 
            status: 'lead', // Yeni kayıt
            assigned_user: state.currentUser?.id 
        })
        .select()
        .single();

    if (cErr) {
        console.error(cErr);
        return alert("Müşteri oluşturulamadı: " + cErr.message);
    }

    // B) Randevu/Dosya Kaydı
    const { error: aErr } = await supabase
        .from('appointments')
        .insert({
            client_id: client.client_id,
            visa_country: country,
            visa_type: type,
            status: 'scheduled', // Varsayılan durum
            appointment_date: new Date(), // Bugünün tarihi
            created_by: state.currentUser?.id
        });

    if (aErr) {
        console.error(aErr);
        alert("Dosya oluşturulurken hata oluştu.");
    } else {
        alert("Dosya başarıyla açıldı!");
        closeModal('modal-visa-wizard');
        // Formu sıfırla (Basitçe reload etmeden inputları temizleyebiliriz ama şimdilik kalsın)
        initCRM(); // Listeyi yenile
        initDashboard(); // Sayıları güncelle
    }
}

// ================= UI & VERİ YÜKLEME =================
async function updateUserProfile(user) {
    if(!user) return;
    const { data } = await supabase.from('profiles').select('name, role').eq('id', user.id).single();
    if(data) {
        const nameEl = document.querySelector('.user-profile .name');
        const roleEl = document.querySelector('.user-profile .role');
        const avatarEl = document.querySelector('.user-profile .avatar');
        
        if(nameEl) nameEl.innerText = data.name;
        if(roleEl) roleEl.innerText = data.role.toUpperCase();
        if(avatarEl) avatarEl.innerText = data.name.substring(0,2).toUpperCase();
    }
}

async function initDashboard() {
    if(!supabase) return;

    // Gelir, Gider, Emanet verilerini çek
    const { data: incomes } = await supabase.from('invoices').select('amount').eq('payment_status', 'paid');
    const { data: expenses } = await supabase.from('expenses').select('amount');
    const { data: escrows } = await supabase.from('escrow_transactions').select('amount');

    let totalRevenue = incomes ? incomes.reduce((acc, i) => acc + Number(i.amount), 0) : 0;
    let totalExpense = expenses ? expenses.reduce((acc, i) => acc + Number(i.amount), 0) : 0;
    let totalEscrow = escrows ? escrows.reduce((acc, i) => acc + Number(i.amount), 0) : 0;
    let netProfit = totalRevenue - totalExpense;

    state.chartData = { revenue: totalRevenue, expense: totalExpense, profit: netProfit };
    updateKpiCards(netProfit, totalRevenue, totalExpense, totalEscrow);
    renderChart(netProfit, totalRevenue, totalExpense);
}

function updateKpiCards(profit, revenue, expense, escrow) {
    const symbol = state.currency === 'TRY' ? '₺' : (state.currency === 'USD' ? '$' : '€');
    const rate = state.currency === 'TRY' ? 1 : state.rates[state.currency];

    const profitEl = document.querySelector('.val-profit');
    const revEl = document.querySelector('.val-revenue');
    const expEl = document.querySelector('.val-expense');
    const escEl = document.querySelector('.val-escrow');

    if(profitEl) profitEl.innerText = formatMoney(profit * rate, symbol);
    if(revEl) revEl.innerText = formatMoney(revenue * rate, symbol);
    if(expEl) expEl.innerText = formatMoney(expense * rate, symbol);
    if(escEl) escEl.innerText = formatMoney(escrow * rate, symbol);
}

function renderChart(profit, revenue, expense) {
    const ctx = document.getElementById('mainFinanceChart');
    if(!ctx) return;

    if (state.chartInstance) {
        state.chartInstance.destroy();
    }

    const rate = state.currency === 'TRY' ? 1 : state.rates[state.currency];
    
    state.chartInstance = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Bu Ay'],
            datasets: [
                {
                    label: 'Kâr',
                    data: [profit * rate],
                    type: 'line',
                    borderColor: '#10b981',
                    borderWidth: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#10b981',
                    pointRadius: 6,
                    order: 1
                },
                {
                    label: 'Ciro',
                    data: [revenue * rate],
                    backgroundColor: '#3b82f6',
                    borderRadius: 6,
                    order: 2
                },
                {
                    label: 'Gider',
                    data: [expense * rate],
                    backgroundColor: '#ef4444',
                    borderRadius: 6,
                    order: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            const symbol = state.currency === 'TRY' ? '₺' : (state.currency === 'USD' ? '$' : '€');
                            label += formatMoney(context.raw, symbol);
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { display: true } },
                x: { grid: { display: false } }
            }
        }
    });
}

async function initCRM() {
    if(!supabase) return;
    renderCRMTable('all');
}

async function renderCRMTable(filterStatus) {
    if(!crmTableBody) return;
    crmTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Yükleniyor...</td></tr>';

    let query = supabase.from('clients').select('*');
    
    if (filterStatus !== 'all') {
        if(filterStatus === 'new') query = query.eq('status', 'lead');
        else if(filterStatus === 'completed') query = query.eq('status', 'completed');
        else query = query.eq('status', 'active'); 
    }

    const { data: clients, error } = await query;

    if (error || !clients || clients.length === 0) {
        crmTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color: #94a3b8;">Kayıt bulunamadı.</td></tr>';
        return;
    }

    crmTableBody.innerHTML = '';
    clients.forEach(client => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${client.full_name}</strong><br><span style="font-size:0.8em; color:#999">${client.email || '-'}</span></td>
            <td><i class="fa-solid fa-location-dot" style="color:#aaa"></i> ${client.country || '-'}<br>Vize</td>
            <td>${getStatusBadge(client.status)}</td>
            <td style="font-weight:600; color: var(--text-muted)">-</td>
            <td>${client.phone || '-'}</td>
            <td><div class="avatar" style="width:28px; height:28px; font-size:0.7rem; background: #cbd5e1;">UK</div></td>
        `;
        tr.addEventListener('dblclick', () => openModal('modal-customer-detail'));
        crmTableBody.appendChild(tr);
    });
}

function formatMoney(amount, symbol) {
    return symbol + amount.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getStatusBadge(status) {
    const map = {
        'lead': '<span class="status-badge badge-info">Yeni Kayıt</span>',
        'active': '<span class="status-badge badge-warning">İşlemde</span>',
        'completed': '<span class="status-badge badge-success">Tamamlandı</span>'
    };
    return map[status] || '<span class="status-badge">Diğer</span>';
}

// ================= MODAL SİSTEMİ =================
window.openModal = (id) => {
    const el = document.getElementById(id);
    if(el) el.classList.remove('hidden');
};

window.closeModal = (id) => {
    const el = document.getElementById(id);
    if(el) el.classList.add('hidden');
};

window.switchModal = (current, next) => { 
    window.closeModal(current); 
    window.openModal(next); 
};

window.wizardNext = () => {
    const s1 = document.getElementById('wiz-step-1');
    const s2 = document.getElementById('wiz-step-2');
    const btnNext = document.querySelector('#modal-visa-wizard .btn-primary'); // İleri butonu

    // Adım 1 -> Adım 2
    if(s1 && !s1.classList.contains('hidden')) { 
        s1.classList.add('hidden'); 
        s2.classList.remove('hidden'); 
        // Buton metnini değiştir
        if(btnNext) btnNext.innerText = "Kaydet ve Bitir";
    }
    // Adım 2 -> KAYDET
    else { 
        saveVisaFile(); // Kaydet fonksiyonunu çağır
    }
};

window.wizardPrev = () => {
    const s1 = document.getElementById('wiz-step-1');
    const s2 = document.getElementById('wiz-step-2');
    const btnNext = document.querySelector('#modal-visa-wizard .btn-primary');

    if(s2 && !s2.classList.contains('hidden')) { 
        s2.classList.add('hidden'); 
        s1.classList.remove('hidden'); 
        if(btnNext) btnNext.innerText = "İleri";
    }
};
