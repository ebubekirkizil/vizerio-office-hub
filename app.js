// ==========================================
// VIZERIO ERP v3.0 - FRONTEND LOGIC
// Supabase Entegrasyonu: Okuma ve Yazma (Tam Sürüm)
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
    rates: { TRY: 1, USD: 0.035, EUR: 0.032 },
    currentUser: null
};

// ================= BAŞLATMA =================
document.addEventListener('DOMContentLoaded', async () => {
    // Anonim giriş (veya mevcut oturum)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        await supabase.auth.signInAnonymously();
    } else {
        state.currentUser = session.user;
        // Kullanıcı bilgisini sidebar'a yaz
        updateUserProfile(session.user);
    }
    
    initDashboard();
    initCRM();
    setupEventListeners();
    
    // Tarihi ayarla
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
});

async function updateUserProfile(user) {
    const { data } = await supabase.from('profiles').select('name, role').eq('id', user.id).single();
    if(data) {
        document.querySelector('.user-profile .name').innerText = data.name;
        document.querySelector('.user-profile .role').innerText = data.role.toUpperCase();
        document.querySelector('.user-profile .avatar').innerText = data.name.substring(0,2).toUpperCase();
    }
}

// ================= DASHBOARD (FİNANS) =================
async function initDashboard() {
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
    
    if (filterStatus !== 'all') {
        if(filterStatus === 'new') query = query.eq('status', 'lead');
        else if(filterStatus === 'completed') query = query.eq('status', 'completed');
        else query = query.eq('status', 'active'); 
    }

    const { data: clients, error } = await query;

    if (error || !clients || clients.length === 0) {
        crmTableBody.innerHTML = '<tr><td colspan="6">Kayıt bulunamadı.</td></tr>';
        return;
    }

    crmTableBody.innerHTML = '';
    clients.forEach(client => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${client.full_name}</strong><br><span style="font-size:0.8em; color:#999">${client.email || ''}</span></td>
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
            labels: ['Genel Durum'],
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

// ================= VERİ KAYDETME (YENİ EKLENEN KISIM) =================

// 1. GİDER KAYDET
async function saveExpense() {
    const category = document.getElementById('exp-category').value;
    const amount = document.getElementById('exp-amount').value;
    const currency = document.getElementById('exp-currency').value;
    
    if(!amount) return alert("Tutar giriniz.");

    const { error } = await supabase.from('expenses').insert([{
        category, amount, currency, created_by: state.currentUser?.id
    }]);

    if(error) {
        alert("Hata: " + error.message);
    } else {
        alert("Gider Kaydedildi!");
        closeModal('modal-expense');
        initDashboard(); // Paneli yenile
    }
}

// 2. EMANET KAYDET
async function saveEscrow() {
    const amount = document.getElementById('esc-amount').value;
    const desc = document.getElementById('esc-desc').value;
    
    // İlk müşteriye atayalım (Demo için)
    const { data: client } = await supabase.from('clients').select('client_id').limit(1).single();
    
    if(!amount) return alert("Tutar giriniz.");

    const { error } = await supabase.from('escrow_transactions').insert([{
        client_id: client?.client_id,
        amount, 
        description: desc,
        created_by: state.currentUser?.id
    }]);

    if(error) {
        alert("Hata: " + error.message);
    } else {
        alert("Emanet Alındı!");
        closeModal('modal-escrow');
        initDashboard(); // Paneli yenile
    }
}

// 3. VİZE DOSYASI KAYDET (Sihirbaz Sonu)
async function saveVisaFile() {
    const name = document.querySelector('#wiz-step-1 input[placeholder="Müşteri Adı"]').value;
    const country = document.querySelector('#wiz-step-1 select').value;
    
    if(!name) return alert("Müşteri adı zorunludur.");

    // a) Müşteriyi Oluştur
    const { data: client, error: cErr } = await supabase
        .from('clients')
        .insert([{ full_name: name, country: country, status: 'lead', assigned_user: state.currentUser?.id }])
        .select()
        .single();

    if(cErr) return alert("Müşteri hatası: " + cErr.message);

    // b) Randevu/Dosya Oluştur
    const { error: aErr } = await supabase
        .from('appointments')
        .insert([{
            client_id: client.client_id,
            visa_country: country,
            status: 'scheduled',
            appointment_date: new Date(),
            created_by: state.currentUser?.id
        }]);

    if(aErr) {
        alert("Dosya hatası: " + aErr.message);
    } else {
        alert("Vize Dosyası ve Müşteri Oluşturuldu!");
        closeModal('modal-visa-wizard');
        initCRM(); // Listeyi yenile
        // Dashboard sayısını da yenilemek için
        initDashboard();
    }
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

// ================= MODAL & NAVİGASYON & EVENTLER =================
function setupEventListeners() {
    // Para Birimi
    if(currencySelect) {
        currencySelect.addEventListener('change', (e) => {
            state.currency = e.target.value;
            initDashboard();
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
    
    // --- FORM SUBMIT BUTONLARINI BAĞLA ---
    
    // Gider Butonu
    const btnSaveExpense = document.querySelector('#modal-expense .btn-danger');
    if(btnSaveExpense) {
        // Input ID'lerini HTML'e eklememiz lazım, burada dinamik ekliyoruz veya HTML güncellenmeli.
        // Kolaylık olsun diye parentElement'ten bulalım veya HTML'e ID verelim.
        // Biz HTML'e ID eklemedik, o yüzden querySelector ile bulalım.
        const inputs = document.querySelectorAll('#modal-expense input, #modal-expense select');
        // inputs[0]: Kategori, inputs[1]: Tutar, inputs[2]: Para Birimi
        inputs[0].id = 'exp-category';
        inputs[1].id = 'exp-amount';
        inputs[2].id = 'exp-currency';
        btnSaveExpense.onclick = (e) => { e.preventDefault(); saveExpense(); };
    }

    // Emanet Butonu
    const btnSaveEscrow = document.querySelector('#modal-escrow .btn-warning');
    if(btnSaveEscrow) {
        const inputs = document.querySelectorAll('#modal-escrow input, #modal-escrow textarea');
        // inputs[1]: Tutar (0: search), inputs[2]: Desc
        inputs[1].id = 'esc-amount';
        inputs[2].id = 'esc-desc';
        btnSaveEscrow.onclick = (e) => { e.preventDefault(); saveEscrow(); };
    }
}

// Global Modal Fonksiyonları
window.openModal = (id) => document.getElementById(id).classList.remove('hidden');
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');
window.switchModal = (current, next) => { closeModal(current); openModal(next); };

// Wizard İleri/Geri
window.wizardNext = () => {
    const s1 = document.getElementById('wiz-step-1');
    const s2 = document.getElementById('wiz-step-2');
    const btnNext = document.querySelector('#modal-visa-wizard .btn-primary');

    if(!s1.classList.contains('hidden')) { 
        s1.classList.add('hidden'); 
        s2.classList.remove('hidden');
        if(btnNext) btnNext.innerText = "Kaydet ve Bitir";
    }
    else { 
        // SON ADIM: KAYDET
        saveVisaFile();
    }
};

window.wizardPrev = () => {
    const s1 = document.getElementById('wiz-step-1');
    const s2 = document.getElementById('wiz-step-2');
    const btnNext = document.querySelector('#modal-visa-wizard .btn-primary');
    
    if(!s2.classList.contains('hidden')) { 
        s2.classList.add('hidden'); 
        s1.classList.remove('hidden'); 
        if(btnNext) btnNext.innerText = "İleri";
    }
};
