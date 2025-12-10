// js/ui.js - DOKUNMATİK MENÜ ve ARAYÜZ YÖNETİMİ

window.ui = {
    // --- TEMEL FONKSİYONLAR ---
    openModal: function(modalId) {
        const el = document.getElementById(modalId);
        if(el) el.classList.add('active');
    },

    closeModal: function(modalId) {
        const el = document.getElementById(modalId);
        if(el) el.classList.remove('active');
    },

    // --- AKILLI MENÜ YÖNETİMİ ---
    toggleSidebar: function() {
        const sidebar = document.getElementById('sidebar'); // index.html'de aside id="sidebar" olmalı
        const overlay = document.getElementById('sidebar-overlay');
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // Mobilde: Görünürlüğü aç/kapat (.active)
            // Eğer id yoksa class ile bulmaya çalış (Yedek)
            const sb = sidebar || document.querySelector('.sidebar');
            sb.classList.toggle('active');
            if(overlay) overlay.classList.toggle('active');
        } else {
            // Masaüstünde: Daralt/Genişlet (.collapsed)
            const sb = sidebar || document.querySelector('.sidebar');
            sb.classList.toggle('collapsed');
        }
    },

    updateCurrency: function() { console.log("Para birimi güncellendi"); }
};

    // --- AYARLAR SAYFASI FONKSİYONLARI ---
    switchSettingsTab: function(tabName, btn) {
        // İçerikleri Gizle/Göster
        document.querySelectorAll('.settings-content').forEach(el => el.classList.remove('active'));
        document.getElementById('set-' + tabName).classList.add('active');
        
        // Butonları Güncelle
        document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    },

    handleProfileUpload: function(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                // Görseli önizle
                document.getElementById('profile-img-preview').src = e.target.result;
                // (Burada istersen Supabase Storage'a yükleme kodu yazılabilir, şimdilik yerel önizleme)
                localStorage.setItem('user_profile_pic', e.target.result); // Basit Kayıt
                alert("Profil fotoğrafı güncellendi!");
            }
            reader.readAsDataURL(input.files[0]);
        }
    },

    saveProfile: function() {
        const name = document.getElementById('p-name').value;
        const surname = document.getElementById('p-surname').value;
        // Basitçe localStorage'a kaydet (Supabase Auth meta verisine de yazılabilir)
        localStorage.setItem('user_name', name + ' ' + surname);
        document.getElementById('profile-name-display').innerText = name + ' ' + surname;
        alert("✅ Profil bilgileri kaydedildi.");
    },

    changePassword: async function() {
        const newPass = document.getElementById('p-new-pass').value;
        if(!newPass) return alert("Lütfen yeni şifreyi giriniz.");
        
        const { error } = await window.supabaseClient.auth.updateUser({ password: newPass });
        
        if(error) alert("Hata: " + error.message);
        else {
            alert("✅ Şifreniz başarıyla değiştirildi.");
            document.getElementById('p-new-pass').value = '';
        }
    }

// --- DOKUNMATİK (SWIPE) ALGILAYICI ---
document.addEventListener('DOMContentLoaded', () => {
    
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    // 1. Dokunma Başladı
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, {passive: true});

    // 2. Dokunma Bitti
    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleGesture();
    }, {passive: true});

    function handleGesture() {
        const isMobile = window.innerWidth <= 768;
        if (!isMobile) return; // Bilgisayarda çalışma

        const xDiff = touchEndX - touchStartX;
        const yDiff = touchEndY - touchStartY;

        // Yatay hareket dikeyden fazlaysa (Kaydırma niyeti)
        if (Math.abs(xDiff) > Math.abs(yDiff)) {
            
            // SAĞA KAYDIRMA (Menüyü AÇ)
            // Şart: Hareket soldan sağa (>50px) VE Başlangıç noktası ekranın en solu (<30px)
            if (xDiff > 50 && touchStartX < 40) {
                if (!sidebar.classList.contains('active')) {
                    window.ui.toggleSidebar();
                }
            }

            // SOLA KAYDIRMA (Menüyü KAPAT)
            // Şart: Hareket sağdan sola (<-50px) VE Menü zaten açıksa
            if (xDiff < -50) {
                if (sidebar.classList.contains('active')) {
                    window.ui.toggleSidebar();
                }
            }
        }
    }

    // Modal Dışına Tıklama Kapatıcısı
    window.onclick = function(event) {
        if (event.target.classList.contains('modal-overlay')) {
            event.target.classList.remove('active');
        }
    }
});
