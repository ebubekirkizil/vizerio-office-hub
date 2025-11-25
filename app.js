// ==========================================
// VIZERIO ERP v3.7 - FINAL FIX
// Sihirbaz, Kaydetme ve Tıklama Sorunsuz
// ==========================================

const SUPABASE_URL = "https://dgvxzlfeagwzmyjqhupu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndnh6bGZlYWd3em15anFodXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDEyNDEsImV4cCI6MjA3OTU3NzI0MX0.rwVR89JBTeue0cAtbujkoIBbqg3VjAEsLesXPlcr078";

let supabase = null;
try {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("Supabase hazır.");
    }
} catch (error) { console.error(error); }

// DOM Helper
const getEl = (id) => document.getElementById(id);
const getAll = (sel) => document.querySelectorAll(sel);

// State
const state = {
    currency: 'TRY',
    rates: { TRY: 1, USD: 0.035, EUR: 0.032 },
    currentUser: null,
    chartInstance: null
};

// ================= BAŞLATMA =================
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    
    const dateEl = getEl('current-date');
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
            initDashboard();
            initCRM();
        } catch (err) {
            console.error("Başlatma hatası:", err);
            renderChart(0, 0, 0);
        }
    }
});

// ================= ETKİLEŞİMLER =================
function setupEventListeners() {
    // Para Birimi
    const currencySelect = getEl('currency-switch');
    if(currencySelect) {
        currencySelect.addEventListener('change', (e) => {
            state.currency = e.target.value;
            initDashboard();
        });
    }

    // Menü
    getAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            getAll('.menu-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            
            const target = item.getAttribute('data-target');
            if(target) {
                getAll('.view-section').forEach(v => v.classList.remove('active'));
                const targetView = getEl('view-' + target);
                if(targetView) targetView.classList.add('active');
            }
        });
    });

    // CRM Filtreleri
    getAll('.crm-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            getAll('.crm-tab').forEach(el => el.classList.remove('active'));
            tab.classList.add('active');
            renderCRMTable(tab.getAttribute('data-filter'));
        });
    });

    // Takvim
    const calBtn = getEl('btn-calendar-toggle');
    if(calBtn) {
        calBtn.addEventListener('click', () => {
            const pop = getEl('calendar-popover');
            if(pop) pop.classList.toggle('hidden');
        });
    }

    // Grafik Filtreleri
    getAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            const idx = parseInt(btn.getAttribute('data-dataset'));
            if(state.chartInstance) {
                const isVisible = state.chartInstance.isDatasetVisible(idx);
                if (isVisible) state.chartInstance.hide(idx);
                else state.chartInstance.show(idx);
            }
        });
    });

    // --- KAYDETME BUTONLARINI BAĞLA ---
    
    // Gider Kaydet (Manuel bağlama)
    const btnExpense = document.querySelector('#modal-expense .btn-danger');
    if(btnExpense) btnExpense.onclick = (e) => { e.preventDefault(); saveExpense(); };

    // Emanet Kaydet
    const btnEscrow = document.querySelector('#modal-escrow .btn-warning');
    if(btnEscrow) btnEscrow.onclick = (e) => { e.preventDefault(); saveEscrow(); };
    
    // Wizard Kâr Hesaplama
    const priceInput = getEl('wiz-price');
    const costInput = getEl('wiz-cost');
    const profitDisplay = document.querySelector('.profit-preview .val-green');
    
    const calcProfit = () => {
        const p = parseFloat(priceInput.value) || 0;
        const c = parseFloat(costInput.value) || 0;
        if(profitDisplay) profitDisplay.innerText = `₺${(p - c).toFixed(2)}`;
    };
    
    if(priceInput) priceInput.addEventListener('input', calcProfit);
    if(costInput) costInput.addEventListener('input', calcProfit);
}

// ================= SİHİRBAZ (WIZARD) MANTIĞI =================

window.wizardNext = () => {
    const s1 = getEl('wiz-step-1');
    const s2 = getEl('wiz-step-2');
    const s3 = getEl('wiz-step-3');
    const btnNext = document.querySelector('#modal-visa-wizard .btn-primary');
    const steps = document.querySelectorAll('.wizard-steps .step');

    // Adım 1 -> 2
    if(!s1.classList.contains('hidden')) {
        const nameInput = s1.querySelector('input[type="text"]');
        if(!nameInput.value) return alert("Lütfen Müşteri Adı giriniz.");

        s1.classList.add('hidden');
        s2.classList.remove('hidden');
        
        if(steps[0]) steps[0].classList.remove('active');
        if(steps[1]) steps[1].classList.add('active');
        
        if(btnNext) {
            btnNext.innerText = "İleri";
            // Butonun onclick'ini temizle ki default (wizardNext) çalışsın
            btnNext.onclick = window.wizardNext; 
        }
    }
    // Adım 2 -> 3
    else if(!s2.classList.contains('hidden')) {
        s2.classList.add('hidden');
        s3.classList.remove('hidden');
        
        if(steps[1]) steps[1].classList.remove('active');
        if(steps[2]) steps[2].classList.add('active');
        
        if(btnNext) {
            btnNext.innerText = "Kaydet ve Bitir";
            // Kaydet fonksiyonunu bağla
            btnNext.onclick = (e) => { 
                e.preventDefault(); 
                saveVisaFile(); 
            };
        }
    }
};

window.wizardPrev = () => {
    const s1 = getEl('wiz-step-1');
    const s2 = getEl('wiz-step-2');
    const s3 = getEl('wiz-step-3');
    const btnNext = document.querySelector('#modal-visa-wizard .btn-primary');
    const steps = document.querySelectorAll('.wizard-steps .step');

    // Reset button action to default (Next)
    if(btnNext) btnNext.onclick = window.wizardNext;

    if(!s2.classList.contains('hidden')) {
        s2.classList.add('hidden');
        s1.classList.remove('hidden');
        steps[1].classList.remove('active');
        steps[0].classList.add('active');
        if(btnNext) btnNext.innerText = "İleri";
    }
    else if(!s3.classList.contains('hidden')) {
        s3.classList.add('hidden');
        s2.classList.remove('hidden');
        steps[2].classList.remove('active');
        steps[1].classList.add('active');
        if(btnNext) btnNext.innerText = "İleri";
    }
};

// ================= VERİ İŞLEMLERİ =================

async function saveExpense() {
    if(!supabase) return alert("Veritabanı yok.");
    const modal = getEl('modal-expense');
    const cat = modal.querySelector('select').value;
    const amt = modal.querySelector('input[type="number"]').value;
    
    if (!amt || amt <= 0) return alert("Tutar giriniz.");

    const { error } = await supabase.from('expenses').insert({
        category: cat, amount: amt, currency: 'TRY', created_by: state.currentUser?.id
    });

    if (error) alert(error.message);
    else {
        alert("Gider kaydedildi.");
        window.closeModal('modal-expense');
        initDashboard();
    }
}

async function saveEscrow() {
    if(!supabase) return alert("Veritabanı yok.");
    const modal = getEl('modal-escrow');
    const name = modal.querySelector('input[type="text"]').value;
    const amt = modal.querySelector('input[type="number"]').value;
    const desc = modal.querySelector('textarea').value;

    if (!amt || !name) return alert("Eksik bilgi.");

    // Müşteri bul
    const { data: clients } = await supabase.from('clients').select('client_id').ilike('full_name', `%${name}%`).limit(1);

    if (!clients || clients.length === 0) return alert("Müşteri bulunamadı.");

    const { error } = await supabase.from('escrow_transactions').insert({
        client_id: clients[0].client_id, amount: amt, description: desc, created_by: state.currentUser?.id
    });

    if (error) alert(error.message);
    else {
        alert("Emanet alındı.");
        window.closeModal('modal-escrow');
        initDashboard();
    }
}

async function saveVisaFile() {
    if(!supabase) return alert("Veritabanı yok.");
    const s1 = getEl('wiz-step-1');
    const name = s1.querySelector('input[type="text"]').value;
    const country = s1.querySelectorAll('select')[0].value;
    const type = s1.querySelectorAll('select')[1].value;

    // Müşteri
    const { data: client, error: cErr } = await supabase
        .from('clients')
        .insert({ full_name: name, country, status: 'lead', assigned_user: state.currentUser?.id })
        .select().single();

    if (cErr) return alert("Hata: " + cErr.message);

    // Randevu
    const { error: aErr } = await supabase
        .from('appointments')
        .insert({
            client_id: client.client_id,
            visa_country: country,
            visa_type: type,
            status: 'scheduled',
            appointment_date: new Date(),
            created_by: state.currentUser?.id
        });

    if (aErr) alert("Hata: " + aErr.message);
    else {
        alert("Dosya Açıldı!");
        window.closeModal('modal-visa-wizard');
        initCRM();
        initDashboard();
        
        // Formu sıfırla
        s1.querySelector('input[type="text"]').value = '';
        window.wizardPrev(); window.wizardPrev(); // Başa dön
    }
}

// ================= UI & YÜKLEME =================
async function updateUserProfile(user) {
    if(!user) return;
    const { data } = await supabase.from('profiles').select('name, role').eq('id', user.id).single();
    if(data) {
        document.querySelector('.user-profile .name').innerText = data.name;
        document.querySelector('.user-profile .role').innerText = data.role.toUpperCase();
        document.querySelector('.user-profile .avatar').innerText = data.name.substring(0,2).toUpperCase();
    }
}

async function initDashboard() {
    if(!supabase) return;
    const { data: incomes } = await supabase.from('invoices').select('amount').eq('payment_status', 'paid');
    const { data: expenses } = await supabase.from('expenses').select('amount');
    const { data: escrows } = await supabase.from('escrow_transactions').select('amount');

    let rev = incomes ? incomes.reduce((a, i) => a + Number(i.amount), 0) : 0;
    let exp = expenses ? expenses.reduce((a, i) => a + Number(i.amount), 0) : 0;
    let esc = escrows ? escrows.reduce((a, i) => a + Number(i.amount), 0) : 0;
    let prof = rev - exp;

    updateKpiCards(prof, rev, exp, esc);
    renderChart(prof, rev, exp);
}

function updateKpiCards(profit, revenue, expense, escrow) {
    const rate = state.currency === 'TRY' ? 1 : state.rates[state.currency];
    const sym = state.currency === 'TRY' ? '₺' : (state.currency === 'USD' ? '$' : '€');

    const setTxt = (sel, val) => {
        const el = document.querySelector(sel);
        if(el) el.innerText = formatMoney(val * rate, sym);
    };

    setTxt('.val-profit', profit);
    setTxt('.val-revenue', revenue);
    setTxt('.val-expense', expense);
    setTxt('.val-escrow', escrow);
}

// ================= GRAFİK =================
function renderChart(profit, revenue, expense) {
    const ctx = getEl('mainFinanceChart');
    if(!ctx) return;
    if (state.chartInstance) state.chartInstance.destroy();

    const rate = state.currency === 'TRY' ? 1 : state.rates[state.currency];
    
    state.chartInstance = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Bu Ay'],
            datasets: [
                { label: 'Kâr', data: [profit * rate], type: 'line', borderColor: '#10b981', borderWidth: 3, order: 1 },
                { label: 'Ciro', data: [revenue * rate], backgroundColor: '#3b82f6', borderRadius: 6, order: 2 },
                { label: 'Gider', data: [expense * rate], backgroundColor: '#ef4444', borderRadius: 6, order: 3 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { display: true } }, x: { grid: { display: false } } }
        }
    });
}

async function initCRM() {
    if(!supabase) return;
    renderCRMTable('all');
}

async function renderCRMTable(filterStatus) {
    const tbody = getEl('crm-table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Yükleniyor...</td></tr>';

    let query = supabase.from('clients').select('*');
    if (filterStatus !== 'all') {
        if(filterStatus === 'new') query = query.eq('status', 'lead');
        else if(filterStatus === 'completed') query = query.eq('status', 'completed');
        else query = query.eq('status', 'active'); 
    }

    const { data: clients, error } = await query;

    if (error || !clients || clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color: #94a3b8;">Kayıt bulunamadı.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
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
        tr.addEventListener('dblclick', () => window.openModal('modal-customer-detail'));
        tbody.appendChild(tr);
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

// ================= MODAL EXPORTS =================
window.openModal = (id) => { const el = getEl(id); if(el) el.classList.remove('hidden'); };
window.closeModal = (id) => { const el = getEl(id); if(el) el.classList.add('hidden'); };
window.switchModal = (c, n) => { window.closeModal(c); window.openModal(n); };
