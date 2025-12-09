// js/supabase.js - BAĞLANTI MODÜLÜ (SAĞLAMLAŞTIRILMIŞ)

// 1. Proje Adresi
const supabaseUrl = 'https://dgvxzlfeagwzmyjqhupu.supabase.co';

// 2. Anon Key (Senin panelden aldığın doğru anahtar)
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndnh6bGZlYWd3em15anFodXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDEyNDEsImV4cCI6MjA3OTU3NzI0MX0.rwVR89JBTeue0cAtbujkoIBbqg3VjAEsLesXPlcr078';

// 3. Bağlantıyı Başlat (Hata Kontrollü)
if (typeof supabase !== 'undefined') {
    // CDN'den gelen 'supabase' objesini kullan
    const client = supabase.createClient(supabaseUrl, supabaseKey);
    window.supabaseClient = client;
    console.log("🟢 Supabase Bağlantısı Başarılı.");
} else {
    console.error("🔴 Supabase Kütüphanesi Yüklenemedi! index.html'deki script etiketini kontrol et.");
    alert("Sistem Hatası: Veritabanı motoru yüklenemedi. Lütfen sayfayı yenileyin.");
}
