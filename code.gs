//buat sheet DB SANTRI, Absensis, Mutabaah

// --- KONFIGURASI SUPABASE ---
const SUPABASE_URL = 'is url';
const SUPABASE_KEY = ' isi key';

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Tahfidz App')
      .addItem('🔄 Sinkronisasi Laporan (Download Riwayat)', 'syncAllData')
      .addSeparator()
      .addItem('📥 Load DB Santri (Supabase -> Sheet)', 'loadStudentsToSheet')
      .addItem('📤 Simpan DB Santri (Sheet -> Supabase)', 'saveStudentsFromSheet') // Menu Baru
      .addToUi();
}

// 1. LOAD: Supabase -> Sheet
function loadStudentsToSheet() {
  const sheetName = 'DB SANTRI';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  const url = `${SUPABASE_URL}/rest/v1/students?select=*&order=nama.asc`;
  const options = {
    method: 'get',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());

    sheet.clear(); 
    // Set Header
    // Kolom ID opsional ditampilkan agar tahu, tapi saat save nanti kita tidak kirim ID agar auto-increment
    const headers = ['nisn', 'nama', 'halaqoh']; 
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
         .setFontWeight('bold').setBackground('#fce7f3').setBorder(true, true, true, true, null, null);

    if (data.length === 0) {
      SpreadsheetApp.getUi().alert('Tidak ada data santri di database.');
      return;
    }

    const rows = data.map(s => [s.nisn, s.nama, s.halaqoh]);

    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    sheet.autoResizeColumns(1, headers.length);
    SpreadsheetApp.getUi().alert('Berhasil memuat data santri!');

  } catch (e) {
    Logger.log(e);
    SpreadsheetApp.getUi().alert(`Gagal memuat data: ${e.message}`);
  }
}

// 2. SAVE: Sheet -> Supabase (OVERWRITE/REPLACE)
function saveStudentsFromSheet() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('PERINGATAN', 'Tindakan ini akan MENGHAPUS semua data santri di Database dan menggantinya dengan data di Sheet ini.\n\nApakah Anda yakin?', ui.ButtonSet.YES_NO);

  if (response !== ui.Button.YES) return;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DB SANTRI');
  if (!sheet) {
    ui.alert('Sheet "DB SANTRI" tidak ditemukan!');
    return;
  }

  // Ambil data dari Sheet (Mulai baris 2, abaikan header)
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    ui.alert('Sheet kosong. Tidak ada data untuk disimpan.');
    return;
  }
  
  // Asumsi urutan kolom: A=NISN, B=Nama, C=Halaqoh (Sesuai fungsi Load)
  const values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  
  // Format data untuk Supabase
  const payload = values.map(row => ({
    nisn: row[0].toString(),
    nama: row[1],
    halaqoh: row[2]
  })).filter(item => item.nama && item.halaqoh); // Filter baris kosong

  if (payload.length === 0) {
    ui.alert('Tidak ada data valid untuk disimpan.');
    return;
  }

  // PROSES 1: DELETE ALL DATA (students)
  // Trick: delete where id > 0
  const deleteUrl = `${SUPABASE_URL}/rest/v1/students?id=gt.0`;
  const deleteOptions = {
    method: 'delete',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  };

  // PROSES 2: INSERT NEW DATA
  const insertUrl = `${SUPABASE_URL}/rest/v1/students`;
  const insertOptions = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=minimal' },
    payload: JSON.stringify(payload)
  };

  try {
    // Eksekusi Hapus
    UrlFetchApp.fetch(deleteUrl, deleteOptions);
    
    // Eksekusi Simpan Baru
    UrlFetchApp.fetch(insertUrl, insertOptions);
    
    ui.alert(`SUKSES! Data santri berhasil diperbarui.\nTotal: ${payload.length} santri.`);
    
  } catch (e) {
    Logger.log(e);
    ui.alert(`Gagal menyimpan data: ${e.message}`);
  }
}

// ... (Fungsi syncAllData dan syncTable tetap sama) ...
function syncAllData() {
  syncTable('absensi', 'Absensi');
  syncTable('mutabaah', 'Mutabaah');
}

function syncTable(tableName, sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=*&order=created_at.desc`;
  const options = {
    method: 'get',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(header => row[header]));
    
    sheet.clearContents();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#e0f2fe');
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    sheet.autoResizeColumns(1, headers.length);
    
  } catch (e) {
    Logger.log(e);
  }
}
