// js/supabase.js - BAĞLANTI MODÜLÜ (FİNAL)

// 1. Proje Adresin (Bu doğru, dokunma)
const supabaseUrl = 'https://dgvxzlfeagwzmyjqhupu.supabase.co';

// 2. BURAYA 'Legacy anon' SEKMEKİNDEN ALDIĞIN 'eyJ...' İLE BAŞLAYAN KODU YAPIŞTIR
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndnh6bGZlYWd3em15anFodXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDEyNDEsImV4cCI6MjA3OTU3NzI0MX0.rwVR89JBTeue0cAtbujkoIBbqg3VjAEsLesXPlcr078';

// Bağlantıyı başlat
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Global erişim
window.supabaseClient = supabase;

console.log("🟢 Supabase Bağlantısı: Legacy Anahtar ile Kuruldu.");
