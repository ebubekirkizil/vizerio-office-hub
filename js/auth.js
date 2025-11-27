// js/auth.js - Güvenlik ve Oturum Yönetimi

window.auth = {
    // 1. ÇIKIŞ YAPMA FONKSİYONU
    logout: async function() {
        console.log("🔒 Çıkış işlemi başlatıldı...");
        
        // Supabase'den oturumu kapat
        const { error } = await window.supabaseClient.auth.signOut();
        
        if (error) {
            console.error("Çıkış hatası:", error);
        }

        // Yerel depolamayı temizle (Varsa)
        localStorage.clear();
        sessionStorage.clear();

        // Kullanıcıyı Giriş Ekranına Gönder
        window.location.href = 'login.html';
    },

    // 2. OTOMATİK ZAMAN AŞIMI (AUTO-LOGOUT)
    initAutoLogout: function() {
        let timer;
        // 15 Dakika = 15 * 60 * 1000 milisaniye
        const timeoutDuration = 15 * 60 * 1000; 

        // Zamanlayıcıyı sıfırlayan fonksiyon
        const resetTimer = () => {
            clearTimeout(timer);
            // Yeni bir sayaç başlat. Süre dolarsa logout() fonksiyonunu çağır.
            timer = setTimeout(() => {
                console.warn("⚠️ İnaktiflik süresi doldu. Otomatik çıkış yapılıyor.");
                this.logout(); 
            }, timeoutDuration);
        };

        // Kullanıcı hareketlerini dinle
        // Fare oynarsa, tuşa basarsa, tıklarsa veya kaydırırsa süreyi başa sar.
        window.onload = resetTimer;
        document.onmousemove = resetTimer;
        document.onkeypress = resetTimer;
        document.onclick = resetTimer;
        document.onscroll = resetTimer;

        console.log("🛡️ Güvenlik Zamanlayıcısı Başlatıldı (15 Dk).");
        resetTimer(); // İlk açılışta başlat
    },

    // 3. GİRİŞ KONTROLÜ (Sayfa Yüklenince)
    checkSession: async function() {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        
        if (!session) {
            // Eğer oturum yoksa, direkt login sayfasına at
            // Ancak şu an login.html'de değilsek at.
            if (!window.location.href.includes('login.html')) {
                window.location.href = 'login.html';
            }
        } else {
            console.log("✅ Oturum aktif:", session.user.email);
            // Kullanıcı bilgilerini sol menüye yaz
            if(document.getElementById('user-name')) {
                document.getElementById('user-name').innerText = session.user.email.split('@')[0]; // Email'in başını isim yap
            }
        }
    }
};

// Sayfa yüklenince güvenlik önlemlerini başlat
window.auth.initAutoLogout();
window.auth.checkSession();
