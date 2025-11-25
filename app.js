// ==========================================
// VIZERIO ERP v3.1 - ROBUST VERSION
// Hata Korumalı ve Etkileşim Öncelikli
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
const toggleBtns = document.querySelectorAll('.toggle-btn'); // Grafik Filtreleri
const timeBtns = document.querySelectorAll('.time-btn');     // Zaman Filtreleri

// Durum Yönetimi
const state = {
    currency: 'TRY',
    rates: { TRY: 1, USD: 0.035, EUR: 0.032 },
    currentUser: null,
    chartInstance: null,
    chartData: { revenue: 0, expense: 0, profit: 0 } // Grafik verilerini sakla
};

// ================= BAŞLATMA (ÖNCELİKLİ) =================
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Önce etkileşimi kur (Veriyi bekleme)
    setupEventListeners();
    
    // 2. Tarihi ayarla
    const dateEl = document.getElementById('current-date');
    if(dateEl) dateEl.innerText = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    // 3. Verileri çekmeye başla
    if (supabase) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                await supabase.auth.signInAnonymously();
            } else {
                state.currentUser = session.user;
                updateUserProfile(session.user);
            }
            // Verileri yükle
            await initDashboard();
            await initCRM();
        } catch (err) {
            console.error("Veri yükleme hatası:", err);
            // Hata olsa bile grafik boş basılsın
            renderChart(0, 0);
        }
    }
});

// ================= ETKİLEŞİM AYARLARI (EVENT LISTENERS) =================
function setupEventListeners() {
    console.log("Etkileşimler kuruluyor..."); // Debug

    // 1. Para Birimi
    if(currencySelect) {
        currencySelect.addEventListener('change', (e) => {
            state.currency = e.target.value;
            initDashboard(); // Verileri yeniden hesapla
        });
    }

    // 2. Menü Geçişleri (Sidebar)
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            // Aktif sınıfını değiştir
            document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            
            // Sayfayı değiştir
            const target = item.getAttribute('data-target');
            if(target) {
                views.forEach(v => v.classList.remove('active'));
                const targetView = document.getElementById('view-' + target);
                if(targetView) targetView.classList.add('active');
                
                // Başlığı güncelle
                const headerTitle = document.getElementById('page-header-title');
                if(headerTitle) {
                    if(target === 'dashboard') headerTitle.innerText = 'Finansal Dashboard';
                    if(target === 'crm') headerTitle.innerText = 'Operasyon & CRM';
                }
            }
        });
    });

    // 3. CRM Tabları (Filtreler)
    crmTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.crm-tab').forEach(el => el.classList.remove('active'));
            tab.classList.add('active');
            renderCRMTable(tab.getAttribute('data-filter'));
        });
    });

    // 4. Takvim Aç/Kapa
    if(calendarBtn) {
        calendarBtn.addEventListener('click', () => {
            if(calendarPopover) calendarPopover.classList.toggle('hidden');
        });
    }

    // 5. Grafik Filtreleri (Kâr/Ciro/Gider Butonları)
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            const datasetIndex = parseInt(btn.getAttribute('data-dataset'));
            
            // Chart.js veri setini gizle/göster
            if(state.chartInstance) {
                const isVisible = state.chartInstance.isDatasetVisible(datasetIndex);
                if (isVisible) state.chartInstance.hide(datasetIndex);
                else state.chartInstance.show(datasetIndex);
            }
        });
    });

    // 6. Zaman Filtreleri (1H, 1A vb. - Sadece görsel aktiflik)
    timeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            timeBtns.forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            // Gerçek filtreleme backend gerektirir, şimdilik görsel
        });
    });
}

// ================= UI GÜNCELLEMELERİ =================
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

// ================= DASHBOARD (FİNANS) =================
async function initDashboard() {
    if(!supabase) return;

    // 1. Gelirleri Çek
    const { data: incomes } = await supabase.from('invoices').select('amount').eq('payment_status', 'paid');
    // 2. Giderleri Çek
    const { data: expenses } = await supabase.from('expenses').select('amount');
    // 3. Emanetleri Çek
    const { data: escrows } = await supabase.from('escrow_transactions').select('amount');

    // Hesaplamalar
    let totalRevenue = incomes ? incomes.reduce((acc, item) => acc + Number(item.amount), 0) : 0;
    let totalExpense = expenses ? expenses.reduce((acc, item) => acc + Number(item.amount), 0) : 0;
    let totalEscrow = escrows ? escrows.reduce((acc, item) => acc + Number(item.amount), 0) : 0;
    let netProfit = totalRevenue - totalExpense;

    // State'e kaydet (Grafik için)
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

// ================= GRAFİK (CHART.JS) =================
function renderChart(profit, revenue, expense) {
    const ctx = document.getElementById('mainFinanceChart');
    if(!ctx) return;

    // Eğer grafik zaten varsa yok et (yeniden çizmek için)
    if (state.chartInstance) {
        state.chartInstance.destroy();
    }

    // Para birimine göre çevir
    const rate = state.currency === 'TRY' ? 1 : state.rates[state.currency];
    const dataProfit = profit * rate;
    const dataRevenue = revenue * rate;
    const dataExpense = expense * rate;

    state.chartInstance = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Bu Ay'],
            datasets: [
                {
                    label: 'Kâr',
                    data: [dataProfit],
                    type: 'line', // Combo Chart: Çizgi
                    borderColor: '#10b981',
                    borderWidth: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#10b981',
                    pointRadius: 6,
                    order: 1
                },
                {
                    label: 'Ciro',
                    data: [dataRevenue],
                    backgroundColor: '#3b82f6',
                    borderRadius: 6,
                    order: 2
                },
                {
                    label: 'Gider',
                    data: [dataExpense],
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
                legend: { display: false }, // Özel butonlar kullanıyoruz
                tooltip: {
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    padding: 12,
                    cornerRadius: 8,
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
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9', drawBorder: false },
                    ticks: { font: { family: 'Inter' } }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

// ================= CRM (OPERASYON) =================
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

// ================= YARDIMCILAR =================
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

// ================= GLOBAL MODAL FONKSİYONLARI (HTML onclick için) =================
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

// Wizard İleri/Geri
window.wizardNext = () => {
    const s1 = document.getElementById('wiz-step-1');
    const s2 = document.getElementById('wiz-step-2');
    if(s1 && !s1.classList.contains('hidden')) { s1.classList.add('hidden'); s2.classList.remove('hidden'); }
    else { alert("Bu özellik henüz demoda aktif değil."); window.closeModal('modal-visa-wizard'); }
};

window.wizardPrev = () => {
    const s1 = document.getElementById('wiz-step-1');
    const s2 = document.getElementById('wiz-step-2');
    if(s2 && !s2.classList.contains('hidden')) { s2.classList.add('hidden'); s1.classList.remove('hidden'); }
};
