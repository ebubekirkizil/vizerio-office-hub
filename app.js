// ==========================================
// VIZERIO ERP v3.5 - SAFE MODE & INTERACTION FIX
// Hata Korumalı, Etkileşim Öncelikli
// ==========================================

// 1. SUPABASE BAĞLANTISI (HATA KORUMALI)
const SUPABASE_URL = "https://dgvxzlfeagwzmyjqhupu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndnh6bGZlYWd3em15anFodXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDEyNDEsImV4cCI6MjA3OTU3NzI0MX0.rwVR89JBTeue0cAtbujkoIBbqg3VjAEsLesXPlcr078";

let supabase = null;
try {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("Supabase bağlantısı başarılı.");
    } else {
        console.error("Supabase kütüphanesi yüklenemedi! (CDN hatası olabilir)");
        alert("Sistem hatası: Veritabanı bağlantısı kurulamadı. Sayfayı yenileyin.");
    }
} catch (error) {
    console.error("Supabase başlatma hatası:", error);
}

// 2. DOM ELEMENTLERİ (GÜVENLİ SEÇİM)
const getEl = (id) => document.getElementById(id);
const getAll = (sel) => document.querySelectorAll(sel);

const crmTableBody = getEl('crm-table-body');
const currencySelect = getEl('currency-switch');
const menuItems = getAll('.menu-item');
const views = getAll('.view-section');
const crmTabs = getAll('.crm-tab');
const calendarBtn = getEl('btn-calendar-toggle');
const calendarPopover = getEl('calendar-popover');
const toggleBtns = getAll('.toggle-btn'); 

// Durum Yönetimi
const state = {
    currency: 'TRY',
    rates: { TRY: 1, USD: 0.035, EUR: 0.032 },
    currentUser: null,
    chartInstance: null
};

// ================= BAŞLATMA (ÖNCELİK ETKİLEŞİMDE) =================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Uygulama başlatılıyor...");
    
    // 1. Önce butonları ve menüleri çalışır hale getir (Veriyi bekleme)
    setupEventListeners();
    
    // 2. Tarihi ayarla
    const dateEl = getEl('current-date');
    if(dateEl) dateEl.innerText = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    // 3. Verileri çekmeye başla (Arka planda)
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
            console.error("Veri yükleme hatası (Kritik değil):", err);
            // Hata olsa bile boş grafik çiz ki sayfa düzgün görünsün
            renderChart(0, 0, 0);
        }
    }
});

// ================= ETKİLEŞİMLER & BUTONLAR =================
function setupEventListeners() {
    console.log("Etkileşimler kuruluyor...");

    // 1. Para Birimi
    if(currencySelect) {
        currencySelect.addEventListener('change', (e) => {
            state.currency = e.target.value;
            initDashboard();
        });
    }

    // 2. Menü Geçişleri (Sidebar)
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Aktif sınıfını değiştir
            menuItems.forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            
            // Sayfayı değiştir
            const target = item.getAttribute('data-target');
            if(target) {
                views.forEach(v => v.classList.remove('active'));
                const targetView = getEl('view-' + target);
                if(targetView) targetView.classList.add('active');
                
                // Başlığı güncelle
                const headerTitle = getEl('page-header-title');
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
            crmTabs.forEach(el => el.classList.remove('active'));
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

    // --- KAYDETME BUTONLARI (GÜVENLİ BAĞLAMA) ---
    
    // Gider Kaydet
    const expenseModal = getEl('modal-expense');
    if(expenseModal) {
        const saveBtn = expenseModal.querySelector('.btn-danger');
        if(saveBtn) {
            // onclick kullanarak event listener çakışmalarını önle
            saveBtn.onclick = (e) => { 
                e.preventDefault(); 
                console.log("Gider kaydet tıklandı");
                saveExpense(); 
            };
        }
    }

    // Emanet Kaydet
    const escrowModal = getEl('modal-escrow');
    if(escrowModal) {
        const saveBtn = escrowModal.querySelector('.btn-warning');
        if(saveBtn) {
            saveBtn.onclick = (e) => { 
                e.preventDefault(); 
                console.log("Emanet kaydet tıklandı");
                saveEscrow(); 
            };
        }
    }
    
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

// ================= SİHİRBAZ (WIZARD) =================

// window nesnesine atayarak HTML onclick'ten erişilebilir yapıyoruz
window.wizardNext = () => {
    console.log("Wizard Next Tıklandı");
    const s1 = getEl('wiz-step-1');
    const s2 = getEl('wiz-step-2');
    const s3 = getEl('wiz-step-3');
    const btnNext = document.querySelector('#modal-visa-wizard .btn-primary');
    const steps = document.querySelectorAll('.wizard-steps .step');

    if(!s1.classList.contains('hidden')) {
        const nameInput = s1.querySelector('input[type="text"]');
        if(!nameInput.value) return alert("Lütfen Müşteri Adı giriniz.");

        s1.classList.add('hidden');
        s2.classList.remove('hidden');
        
        if(steps[0]) steps[0].classList.remove('active');
        if(steps[1]) steps[1].classList.add('active');
        
        if(btnNext) btnNext.innerText = "İleri";
    }
    else if(!s2.classList.contains('hidden')) {
        s2.classList.add('hidden');
        s3.classList.remove('hidden');
        
        if(steps[1]) steps[1].classList.remove('active');
        if(steps[2]) steps[2].classList.add('active');
        
        if(btnNext) btnNext.innerText = "Kaydet ve Bitir";
        // Kaydet butonuna tıklandığında saveVisaFile çağrılacak
        btnNext.onclick = (e) => {
            e.preventDefault();
            saveVisaFile();
        };
    }
    // Eğer zaten son adımdaysak (veya buton onclick'i değişmediyse)
    else {
        saveVisaFile();
    }
};

window.wizardPrev = () => {
    const s1 = getEl('wiz-step-1');
    const s2 = getEl('wiz-step-2');
    const s3 = getEl('wiz-step-3');
    const btnNext = document.querySelector('#modal-visa-wizard .btn-primary');
    const steps = document.querySelectorAll('.wizard-steps .step');

    // Butonun onclick olayını varsayılana döndür (wizardNext)
    if(btnNext) btnNext.onclick = (e) => { e.preventDefault(); window.wizardNext(); };

    if(!s2.classList.contains('hidden')) {
        s2.classList.add('hidden');
        s1.classList.remove('hidden');
        if(steps[1]) steps[1].classList.remove('active');
        if(steps[0]) steps[0].classList.add('active');
        if(btnNext) btnNext.innerText = "İleri";
    }
    else if(!s3.classList.contains('hidden')) {
        s3.classList.add('hidden');
        s2.classList.remove('hidden');
        if(steps[2]) steps[2].classList.remove('active');
        if(steps[1]) steps[1].classList.add('active');
        if(btnNext) btnNext.innerText = "İleri";
    }
};

// ================= VERİ İŞLEMLERİ =================

// 1. GİDER KAYDET
async function saveExpense() {
    if(!supabase) return alert("Veritabanı bağlantısı yok.");
    const modal = getEl('modal-expense');
    const categorySelect = modal.querySelector('select');
    const amountInput = modal.querySelector('input[type="number"]');
    const currencyInput = modal.querySelector('.input-group select'); 

    const category = categorySelect ? categorySelect.value : 'Diğer';
    const amount = amountInput ? amountInput.value : 0;
    const currency = currencyInput ? currencyInput.value : 'TRY';

    if (!amount || amount <= 0) return alert("Lütfen geçerli bir tutar giriniz.");

    const { error } = await supabase.from('expenses').insert({
        category, amount, currency, created_by: state.currentUser?.id
    });

    if (error) alert("Hata: " + error.message);
    else {
        alert("Gider kaydedildi.");
        window.closeModal('modal-expense');
        if(amountInput) amountInput.value = '';
        initDashboard();
    }
}

// 2. EMANET KAYDET
async function saveEscrow() {
    if(!supabase) return alert("Veritabanı bağlantısı yok.");
    const modal = getEl('modal-escrow');
    const clientInput = modal.querySelector('input[type="text"]');
    const amountInput = modal.querySelector('input[type="number"]');
    const descInput = modal.querySelector('textarea');

    const clientName = clientInput ? clientInput.value : '';
    const amount = amountInput ? amountInput.value : 0;
    const desc = descInput ? descInput.value : '';

    if (!amount || !clientName) return alert("Müşteri adı ve tutar zorunludur.");

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
        amount, description: desc, created_by: state.currentUser?.id
    });

    if (error) alert("Hata: " + error.message);
    else {
        alert("Emanet alındı.");
        window.closeModal('modal-escrow');
        if(amountInput) amountInput.value = '';
        initDashboard();
    }
}

// 3. VİZE DOSYASI KAYDET
async function saveVisaFile() {
    if(!supabase) return alert("Veritabanı bağlantısı yok.");
    const step1 = getEl('wiz-step-1');
    const nameInput = step1.querySelector('input[type="text"]');
    const selects = step1.querySelectorAll('select');
    
    const name = nameInput ? nameInput.value : '';
    const country = selects[0] ? selects[0].value : '';
    const type = selects[1] ? selects[1].value : '';

    // Müşteri Oluştur
    const { data: client, error: cErr } = await supabase
        .from('clients')
        .insert({ 
            full_name: name, country, status: 'lead', assigned_user: state.currentUser?.id 
        })
        .select()
        .single();

    if (cErr) return alert("Müşteri hatası: " + cErr.message);

    // Randevu Oluştur
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

    if (aErr) alert("Dosya hatası: " + aErr.message);
    else {
        alert("Vize Dosyası Açıldı!");
        window.closeModal('modal-visa-wizard');
        initCRM();
        initDashboard();
        
        // Formu sıfırla ve ilk adıma dön
        if(nameInput) nameInput.value = '';
        const s1 = getEl('wiz-step-1');
        const s3 = getEl('wiz-step-3');
        const steps = document.querySelectorAll('.wizard-steps .step');
        const btnNext = document.querySelector('#modal-visa-wizard .btn-primary');
        
        s3.classList.add('hidden');
        s1.classList.remove('hidden');
        if(steps[2]) steps[2].classList.remove('active');
        if(steps[0]) steps[0].classList.add('active');
        if(btnNext) {
            btnNext.innerText = "İleri";
            btnNext.onclick = (e) => { e.preventDefault(); window.wizardNext(); };
        }
    }
}

// ================= UI & YÜKLEME =================
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
    const { data: incomes } = await supabase.from('invoices').select('amount').eq('payment_status', 'paid');
    const { data: expenses } = await supabase.from('expenses').select('amount');
    const { data: escrows } = await supabase.from('escrow_transactions').select('amount');

    let totalRevenue = incomes ? incomes.reduce((acc, i) => acc + Number(i.amount), 0) : 0;
    let totalExpense = expenses ? expenses.reduce((acc, i) => acc + Number(i.amount), 0) : 0;
    let totalEscrow = escrows ? escrows.reduce((acc, i) => acc + Number(i.amount), 0) : 0;
    let netProfit = totalRevenue - totalExpense;

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

// ================= GRAFİK =================
function renderChart(profit, revenue, expense) {
    const ctx = getEl('mainFinanceChart');
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
                { label: 'Kâr', data: [profit * rate], type: 'line', borderColor: '#10b981', borderWidth: 3, pointBackgroundColor: '#fff', order: 1 },
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

// ================= CRM =================
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
        tr.addEventListener('dblclick', () => window.openModal('modal-customer-detail'));
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

// ================= MODAL EXPORTS =================
window.openModal = (id) => { const el = getEl(id); if(el) el.classList.remove('hidden'); };
window.closeModal = (id) => { const el = getEl(id); if(el) el.classList.add('hidden'); };
window.switchModal = (c, n) => { window.closeModal(c); window.openModal(n); };
