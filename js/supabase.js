// Vizerio Office - Supabase Bağlantı Modülü
// Bu dosya veritabanı ile konuşmamızı sağlar.

// Supabase kütüphanesini HTML'den (CDN) alacağız, o yüzden burada tanımlıyoruz.
const supabaseUrl = 'https://dgvxzlfeagwzmyjqhupu.supabase.co';
const supabaseKey = 'sb_publishable_V8gPM0PPL0RBLl9nVUmBGQ_uCEKKcOC';

// Bağlantıyı başlat
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Bağlantıyı dışarı aç (diğer dosyalar kullanabilsin diye)
// Not: Modüler yapı kullandığımız için window objesine atıyoruz.
window.supabaseClient = supabase;

console.log("🟢 Supabase Bağlantısı Hazır.");
