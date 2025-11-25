// ==========================================
// VIZERIO ERP v3.0 - FRONTEND LOGIC
// Supabase Entegrasyonu ve Dashboard Yönetimi
// ==========================================

// 1. SUPABASE BAĞLANTISI
const SUPABASE_URL = "https://dgvxzlfeagwzmyjqhupu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndnh6bGZlYWd3em15anFodXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDEyNDEsImV4cCI6MjA3OTU3NzI0MX0.rwVR89JBTeue0cAtbujkoIBbqg3VjAEsLesXPlcr078";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. DOM ELEMENTLERİ
const crmTableBody = document.getElementById('crm-table-body');
const currencySelect = document.getElementById('currency-switch');
const menuItems = document.querySelectorAll('.menu-item');
const views = document.querySelectorAll('.view-section');
const crmTabs = document.querySelectorAll('.crm-tab');
const calendarBtn = document.getElementById('btn-calendar-toggle');
const calendarPopover = document.getElementById('calendar-popover');

// Durum Yönetimi
const state = {
    currency: 'TRY',
    rates: { TRY: 1, USD: 0.035, EUR: 0.032 }, // Güncel kurlar API'den çekilebilir
    filter: 'all'
};

// ================= BAŞLATMA =================
document.addEventListener('DOMContentLoaded', async () => {
    // Önce anonim giriş yap (Veri okumak için)
    await supabase.auth.signInAnonymously();
    
    initDashboard();
    initCRM();
    setupEventListeners();
    
    // Tarihi ayarla
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
});

// ================= DASHBOARD (FİNANS) =================
async function initDashboard() {
    // 1. Gelirleri Çek (Paid Invoices)
    const { data: incomes } = await supabase
        .from('invoices')
        .select('amount')
        .eq('payment_status', 'paid');

    // 2. Giderleri Çek (Expenses tablosu yoksa hata vermemesi için try-catch)
    let expenses = [];
    try {
        const res = await supabase.from('expenses').select('amount');
        if(res.data) expenses = res.data;
    } catch (e) { console.log("Gider tablosu henüz yok."); }

    // 3. Emanetleri Çek
    let escrows = [];
    try {
        const res = await supabase.from('escrow_transactions').select('amount');
        if(res.data) escrows = res.data;
    } catch (e) { console.log("Emanet tablosu henüz yok."); }

    // Hesaplamalar
    let totalRevenue = incomes ? incomes.reduce((acc, item) => acc + Number(item.amount), 0) : 0;
    let totalExpense = expenses ? expenses.reduce((acc, item) => acc + Number(item.amount), 0) : 0;
    let totalEscrow = escrows ? escrows.reduce((acc, item) => acc + Number(item.amount), 0) : 0;
    let netProfit = totalRevenue - totalExpense;

    updateKpiCards(netProfit, totalRevenue, totalExpense, totalEscrow);
    renderChart(totalRevenue, totalExpense);
}

function updateKpiCards(profit, revenue, expense, escrow) {
    const symbol = state.currency === 'TRY' ? '₺' : (state.currency === 'USD' ? '$' : '€');
    const rate = state.currency === 'TRY' ? 1 : state.rates[state.currency];

    document.querySelector('.val-profit').innerText = formatMoney(profit * rate, symbol);
    document.querySelector('.val-revenue').innerText = formatMoney(revenue * rate, symbol);
    document.querySelector('.val-expense').innerText = formatMoney(expense * rate, symbol);
    document.querySelector('.val-escrow').innerText = formatMoney(escrow * rate, symbol);
}

// ================= CRM (OPERASYON) =================
async function initCRM() {
    renderCRMTable('all');
}

async function renderCRMTable(filterStatus) {
    if(!crmTableBody) return;
    crmTableBody.innerHTML = '<tr><td colspan="6">Yükleniyor...</td></tr>';

    let query = supabase.from('clients').select('*');
    
    // Filtreleme Mantığı
    if (filterStatus !== 'all') {
        // Veritabanındaki statüler ile UI statülerini eşleştiriyoruz
        if(filterStatus === 'new') query = query.eq('status', 'lead');
        else if(filterStatus === 'completed') query = query.eq('status', 'completed');
        else query = query.eq('status', 'active'); // Diğerleri için şimdilik active
    }

    const { data: clients, error } = await query;

    if (error) {
        crmTableBody.innerHTML = '<tr><td colspan="6" style="color:red">Veri çekilemedi.</td></tr>';
        return;
    }

    if (!clients || clients.length === 0) {
        crmTableBody.innerHTML = '<tr><td colspan="6">Kayıt bulunamadı.</td></tr>';
        return;
    }

    crmTableBody.innerHTML = '';
    clients.forEach(client => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${client.full_name}</strong><br><span style="font-size:0.8em; color:#999">${client.email}</span></td>
            <td><i class="fa-solid fa-location-dot" style="color:#aaa"></i> ${client.country || '-'}<br>Vize</td>
            <td>${getStatusBadge(client.status)}</td>
            <td style="font-weight:600;">-</td>
            <td>${client.phone || '-'}</td>
            <td><div class="avatar" style="width:28px; height:28px; font-size:0.7rem">YK</div></td>
        `;
        tr.addEventListener('dblclick', () => openModal('modal-customer-detail'));
        crmTableBody.appendChild(tr);
    });
}

// ================= GRAFİK =================
let financeChart;
function renderChart(revenue, expense) {
    const ctx = document.getElementById('mainFinanceChart');
    if(!ctx) return;

    if (financeChart) financeChart.destroy();

    financeChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Bu Ay'], // Şimdilik tek sütun
            datasets: [
                { label: 'Ciro', data: [revenue], backgroundColor: '#3b82f6', borderRadius: 4 },
                { label: 'Gider', data: [expense], backgroundColor: '#ef4444', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
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

// ================= MODAL & NAVİGASYON =================
function setupEventListeners() {
    // Para Birimi
    if(currencySelect) {
        currencySelect.addEventListener('change', (e) => {
            state.currency = e.target.value;
            initDashboard(); // Yeniden hesapla
        });
    }

    // Menü Geçişleri
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('.menu-item.active').classList.remove('active');
            item.classList.add('active');
            
            const target = item.getAttribute('data-target');
            if(target) {
                views.forEach(v => v.classList.remove('active'));
                document.getElementById('view-' + target).classList.add('active');
            }
        });
    });

    // CRM Tabları
    crmTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelector('.crm-tab.active').classList.remove('active');
            tab.classList.add('active');
            renderCRMTable(tab.getAttribute('data-filter'));
        });
    });

    // Takvim
    if(calendarBtn) calendarBtn.addEventListener('click', () => calendarPopover.classList.toggle('hidden'));
}

// Global Modal Fonksiyonları
window.openModal = (id) => document.getElementById(id).classList.remove('hidden');
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');
window.switchModal = (current, next) => { closeModal(current); openModal(next); };

// Wizard İleri/Geri
window.wizardNext = () => {
    const s1 = document.getElementById('wiz-step-1');
    const s2 = document.getElementById('wiz-step-2');
    if(!s1.classList.contains('hidden')) { s1.classList.add('hidden'); s2.classList.remove('hidden'); }
    else { alert("Bu özellik henüz demoda aktif değil."); closeModal('modal-visa-wizard'); }
};
window.wizardPrev = () => {
    const s1 = document.getElementById('wiz-step-1');
    const s2 = document.getElementById('wiz-step-2');
    if(!s2.classList.contains('hidden')) { s2.classList.add('hidden'); s1.classList.remove('hidden'); }
};
