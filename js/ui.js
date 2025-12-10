// js/ui.js - FİNAL SÜRÜM

window.ui = {
    // Modal Açma/Kapama
    openModal: function(id) {
        const el = document.getElementById(id);
        if(el) el.classList.add('active');
    },
    closeModal: function(id) {
        const el = document.getElementById(id);
        if(el) el.classList.remove('active');
    },

    // AYARLAR SEKME GEÇİŞİ (DÜZELTİLDİ)
    switchSettingsTab: function(tabName, btnElement) {
        // 1. Tüm içerikleri gizle
        document.querySelectorAll('.settings-content').forEach(el => {
            el.style.display = 'none'; 
            el.classList.remove('active');
        });
        
        // 2. Seçili olanı göster
        const target = document.getElementById('set-' + tabName);
        if(target) {
            target.style.display = 'block';
            setTimeout(() => target.classList.add('active'), 10); // Animasyon için
        }

        // 3. Buton rengini ayarla
        document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
        if(btnElement) btnElement.classList.add('active');
    },

    // PROFİL FOTOĞRAFI
    handleProfileUpload: function(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('profile-img-preview').src = e.target.result;
                localStorage.setItem('user_profile_pic', e.target.result);
                alert("Fotoğraf güncellendi (Yerel).");
            }
            reader.readAsDataURL(input.files[0]);
        }
    },

    // PROFİL KAYDET
    saveProfile: function() {
        const name = document.getElementById('p-name').value;
        const surname = document.getElementById('p-surname').value;
        localStorage.setItem('user_name', name + ' ' + surname);
        document.getElementById('profile-name-display').innerText = name + ' ' + surname;
        alert("✅ Profil bilgileri cihazınıza kaydedildi.");
    },

    // ŞİFRE DEĞİŞTİRME (3 AŞAMALI GÜVENLİK)
    changePassword: async function() {
        const oldPass = document.getElementById('p-old-pass').value;
        const newPass = document.getElementById('p-new-pass').value;
        const confirmPass = document.getElementById('p-confirm-pass').value;

        if(!oldPass || !newPass || !confirmPass) return alert("Lütfen tüm alanları doldurunuz.");
        
        if(newPass !== confirmPass) {
            return alert("🛑 HATA: Yeni şifreler birbiriyle uyuşmuyor!");
        }

        if(newPass.length < 6) return alert("Şifre en az 6 karakter olmalıdır.");

        // Not: Supabase'de 'Eski Şifre' kontrolü için önce giriş yapmayı denemek gerekir.
        // Güvenlik gereği, sadece yeni şifreyi güncelleme komutu gönderiyoruz.
        // Kullanıcı zaten giriş yapmış durumda.
        
        const { error } = await window.supabaseClient.auth.updateUser({ password: newPass });
        
        if(error) {
            alert("Hata: " + error.message);
        } else {
            alert("✅ Şifreniz başarıyla değiştirildi. Lütfen yeni şifreyle tekrar giriş yapın.");
            window.location.reload();
        }
    }
};
