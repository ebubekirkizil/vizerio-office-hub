// Vizerio Office - Supabase Bağlantı Modülü
// Bu dosya veritabanı ile konuşmamızı sağlar.

// Supabase kütüphanesini HTML'den (CDN) alacağız, o yüzden burada tanımlıyoruz.
const supabaseUrl = 'BURAYA_SUPABASE_URL_YAZ';
const supabaseKey = 'BURAYA_SUPABASE_ANON_KEY_YAZ';

// Bağlantıyı başlat
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Bağlantıyı dışarı aç (diğer dosyalar kullanabilsin diye)
// Not: Modüler yapı kullandığımız için window objesine atıyoruz.
window.supabaseClient = supabase;

console.log("🟢 Supabase Bağlantısı Hazır.");
