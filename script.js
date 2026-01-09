// --- KONFIGURASI APLIKASI ---
const APP_CONFIG = {
    waktu: ['Subuh', 'Ashar', 'Maghrib'],
    status_absensi: ['Hadir', 'Izin', 'Sakit', 'Alpha'],
    jenis_mutabaah: ['Ziyadah', 'Murajaah', 'Juziyyah'],
    predikat_nilai: { 'Mumtaz': 100, 'Jayyid Jiddan': 90, 'Jayyid': 80, 'Maqbul': 70, 'Mardud': 60 }
};

// --- SUPABASE SETUP ---
const SUPABASE_URL = 'https://nindjdkvdkdvplejqszj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbmRqZGt2ZGtkdnBsZWpxc3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzI5NzksImV4cCI6MjA4MzQ0ODk3OX0.SoiiP5-7WXES_7NQpvdMBPMNDAfW-6XiU9uaB7BYfxw';
const GOOGLE_CLIENT_ID = '142276774829-q7b6vicbq1hm1ltng7itehietn03l119.apps.googleusercontent.com';

let supabaseInstance;
let dbStudents = [];
let userEmail = "";
let dbJurnal = [];

// --- FUNGSI UI & SIDEBAR ---
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar.classList.contains('sidebar-closed')) {
        sidebar.classList.remove('sidebar-closed');
        sidebar.classList.add('sidebar-open');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('sidebar-closed');
        sidebar.classList.remove('sidebar-open');
        overlay.classList.add('hidden');
    }
};

window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-tab'));
    const target = document.getElementById(`tab-${tabId}`);
    if(target) target.classList.remove('hidden-tab');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active-tab-btn', 'bg-emerald-50', 'text-emerald-700');
        if(btn.dataset.tab === tabId) btn.classList.add('active-tab-btn', 'bg-emerald-50', 'text-emerald-700');
    });

    const mainContent = document.getElementById('main-content');
    if(mainContent) mainContent.scrollTo({ top: 0, behavior: 'smooth' });

    if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        sidebar.classList.add('sidebar-closed');
        sidebar.classList.remove('sidebar-open');
        overlay.classList.add('hidden');
    }

    if(tabId === 'jurnal') fetchJurnalData();
};

// --- FUNGSI LOGIN ---
// Fungsi Guest Login DIHAPUS

window.onload = () => {
    if (typeof supabase !== 'undefined') {
        const { createClient } = supabase;
        supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    checkExistingSession();
    setTimeout(initGoogleAuth, 1000);
    if (typeof lucide !== 'undefined') lucide.createIcons();
    initDropdownOptions();
    fetchDataStudents();
};

function initDropdownOptions() {
    const waktuOptions = `<option value="">-- Pilih Waktu --</option>` + APP_CONFIG.waktu.map(w => `<option value="${w}">${w}</option>`).join('');
    const absensiWaktu = document.getElementById('absensi-waktu');
    const mutabaahWaktu = document.getElementById('mutabaah-waktu');
    if(absensiWaktu) absensiWaktu.innerHTML = waktuOptions;
    if(mutabaahWaktu) mutabaahWaktu.innerHTML = waktuOptions;
}

function checkExistingSession() {
    const savedUser = localStorage.getItem('school_user');
    if (savedUser) applyUserData(JSON.parse(savedUser));
}

function applyUserData(data) {
    userEmail = data.email;
    const userNameEl = document.getElementById('user-name');
    const userPhotoEl = document.getElementById('user-photo');
    const welcomeMsgEl = document.getElementById('welcome-msg');

    if(userNameEl) userNameEl.innerText = data.name;
    if(userPhotoEl) {
        userPhotoEl.src = data.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`;
        userPhotoEl.classList.remove('hidden');
    }
    if(welcomeMsgEl) welcomeMsgEl.innerText = `Ahlan, Ustadz ${data.given_name || data.name.split(' ')[0]}!`;

    const overlay = document.getElementById('auth-overlay');
    const mainApp = document.getElementById('main-app');

    if(overlay) overlay.classList.add('hidden');
    if(mainApp) mainApp.classList.remove('blur-sm', 'pointer-events-none');
}

function initGoogleAuth() {
    try {
        if(typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleAuthResponse });
            google.accounts.id.renderButton(document.getElementById("google-btn-container"), { theme: "outline", size: "large", width: 250 });
        } else { setTimeout(initGoogleAuth, 2000); }
    } catch (e) { console.error(e); }
}

function handleAuthResponse(response) {
    try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        localStorage.setItem('school_user', JSON.stringify(payload));
        applyUserData(payload);
        showNotify('success', `Berhasil Login Google!`);
    } catch(e) { showNotify('error', 'Gagal memproses login.'); }
}

window.logout = function() { localStorage.removeItem('school_user'); location.reload(); };

async function fetchDataStudents() {
    showLoader(true);
    try {
        if(!supabaseInstance) return;
        const { data, error } = await supabaseInstance.from('students').select('*').order('nama', { ascending: true });
        if (error) throw error;
        dbStudents = data;
        populateHalaqohFilters();
    } catch (e) { console.error(e); } finally { showLoader(false); }
}

function populateHalaqohFilters() {
    const halaqohs = [...new Set(dbStudents.map(s => s.halaqoh))].filter(Boolean).sort();

    // Opsi Default
    const defaultOption = `<option value="">-- Pilih Halaqoh --</option>`;
    // Opsi dengan "Semua" untuk filter
    const filterOption = `<option value="">Semua Halaqoh</option>`;

    const options = halaqohs.map(c => `<option value="${c}">${c}</option>`).join('');

    // Dropdown Input (Wajib pilih)
    const inputElements = ['absensi-halaqoh', 'mutabaah-halaqoh', 'laporan-halaqoh'];
    inputElements.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = defaultOption + options;
    });

    // Dropdown Filter Jurnal (Boleh kosong/semua)
    const jurnalFilter = document.getElementById('jurnal-filter-halaqoh');
    if(jurnalFilter) {
        jurnalFilter.innerHTML = filterOption + options;
    }

    // Datalist untuk input manual
    const datalist = document.getElementById('halaqoh-list');
    if(datalist) {
        datalist.innerHTML = halaqohs.map(c => `<option value="${c}">`).join('');
    }
}


// --- ABSENSI ---
window.loadSiswaAbsensi = function() {
    const halaqoh = document.getElementById('absensi-halaqoh').value;
    const container = document.getElementById('absensi-list');

    if(!halaqoh) { container.innerHTML = ''; return; }

    const statusOptions = APP_CONFIG.status_absensi.map(s => `<option value="${s}">${s}</option>`).join('');
    const filtered = dbStudents.filter(s => s.halaqoh === halaqoh);

    container.innerHTML = filtered.map(s => `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 absensi-card hover:border-blue-300 transition-colors" data-nisn="${s.nisn}">
            <div class="w-full md:w-1/3">
                <div class="font-bold text-gray-800 text-lg">${s.nama}</div>
                <div class="text-xs text-gray-400 font-mono">${s.nisn || '-'}</div>
            </div>
            <div class="flex flex-wrap items-center gap-2 w-full md:w-2/3 justify-end">
                <div class="flex flex-col flex-1 md:flex-none">
                    <label class="text-[10px] text-gray-400 uppercase font-bold">Status</label>
                    <select class="p-2 border rounded-lg text-sm bg-gray-50 status-select focus:ring-1 ring-blue-500 w-full md:w-40">${statusOptions}</select>
                </div>
                <div class="flex flex-col w-24">
                    <label class="text-[10px] text-gray-400 uppercase font-bold">Nilai Harian</label>
                    <input type="number" value="100" max="100" class="p-2 border rounded-lg text-sm text-center nilai-harian-input bg-white focus:ring-1 ring-blue-500 font-bold text-blue-600">
                </div>
            </div>
        </div>
    `).join('');

    if (!document.getElementById('btn-save-absensi')) {
        const btn = document.createElement('button');
        btn.id = 'btn-save-absensi';
        btn.className = "fixed bottom-8 right-8 bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold hover:bg-blue-700 z-30 transition-all hover:scale-105 flex items-center";
        btn.innerHTML = `<i data-lucide="save" class="mr-2 w-5 h-5"></i> Simpan Absensi`;
        btn.onclick = saveAbsensi;
        container.appendChild(btn);
        lucide.createIcons();
    }
};

window.saveAbsensi = async function() {
    const halaqoh = document.getElementById('absensi-halaqoh').value;
    const waktu = document.getElementById('absensi-waktu').value;
    if(!halaqoh || !waktu) return showNotify('error', 'Mohon lengkapi Halaqoh & Waktu!');
    showLoader(true);
    const rows = [];
    document.querySelectorAll('.absensi-card').forEach(card => {
        rows.push({
            nisn: card.dataset.nisn,
            nama: card.querySelector('.font-bold').innerText,
            halaqoh: halaqoh,
            waktu_halaqoh: waktu,
            status: card.querySelector('.status-select').value,
            nilai: card.querySelector('.nilai-harian-input').value || 0,
            email_penginput: userEmail,
            tanggal: new Date().toISOString().split('T')[0]
        });
    });
    try {
        if(!supabaseInstance) throw new Error("Database not connected");
        const { error } = await supabaseInstance.from('absensi').insert(rows);
        if(error) throw error;
        showNotify('success', 'Absensi & Nilai berhasil disimpan!');
        resetForm('absensi');
    } catch (e) { showNotify('error', 'Gagal menyimpan: ' + e.message); } finally { showLoader(false); }
};

// --- MUTABAAH ---
window.loadSiswaMutabaah = function() {
    const halaqoh = document.getElementById('mutabaah-halaqoh').value;
    const container = document.getElementById('mutabaah-list');

    if(!halaqoh) { container.innerHTML = ''; return; }

    const jenisOptions = `<option value="">- Jenis -</option>` + APP_CONFIG.jenis_mutabaah.map(j => `<option value="${j}">${j}</option>`).join('');
    const predikatOptions = `<option value="">- Keterangan -</option>` + Object.keys(APP_CONFIG.predikat_nilai).map(p => `<option value="${p}">${p}</option>`).join('');
    const filtered = dbStudents.filter(s => s.halaqoh === halaqoh);

    container.innerHTML = filtered.map(s => `
        <div class="bg-white p-5 rounded-xl shadow-sm border border-purple-100 mutabaah-card relative group hover:border-purple-300 transition-colors" data-nisn="${s.nisn}">
            <div class="font-bold text-gray-800 text-lg mb-3 border-b pb-2 flex justify-between"><span>${s.nama}</span><span class="text-xs font-normal text-gray-400 self-center">NISN: ${s.nisn||'-'}</span></div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div class="md:col-span-3"><label class="text-[10px] text-gray-400 font-bold uppercase">Jenis</label><select class="w-full p-2 border rounded-lg text-sm bg-gray-50 jenis-select focus:ring-2 ring-purple-500 outline-none">${jenisOptions}</select></div>
                <div class="md:col-span-3 flex space-x-2"><div class="flex-1"><label class="text-[10px] text-gray-400 font-bold uppercase">Dari Hal</label><input type="number" class="w-full p-2 border rounded-lg text-center from-hal outline-none focus:ring-2 ring-purple-500"></div><div class="w-16"><label class="text-[10px] text-gray-400 font-bold uppercase">Brs</label><input type="number" class="w-full p-2 border rounded-lg text-center from-baris outline-none focus:ring-2 ring-purple-500"></div></div>
                <div class="md:col-span-3 flex space-x-2"><div class="flex-1"><label class="text-[10px] text-gray-400 font-bold uppercase">Sampai Hal</label><input type="number" class="w-full p-2 border rounded-lg text-center to-hal outline-none focus:ring-2 ring-purple-500"></div><div class="w-16"><label class="text-[10px] text-gray-400 font-bold uppercase">Brs</label><input type="number" class="w-full p-2 border rounded-lg text-center to-baris outline-none focus:ring-2 ring-purple-500"></div></div>
                <div class="md:col-span-3 flex space-x-2"><div class="flex-1"><label class="text-[10px] text-gray-400 font-bold uppercase">Predikat</label><select onchange="autoFillNilai(this)" class="w-full p-2 border rounded-lg text-sm bg-purple-50 font-medium text-purple-700 predikat-select outline-none focus:ring-2 ring-purple-500">${predikatOptions}</select></div><div class="w-16"><label class="text-[10px] text-gray-400 font-bold uppercase">Nilai</label><input type="text" readonly class="w-full p-2 border rounded-lg text-center bg-gray-100 text-gray-500 nilai-auto" value="0"></div></div>
            </div>
        </div>
    `).join('') + `<div class="fixed bottom-8 right-8 z-30"><button onclick="saveMutabaah()" class="bg-purple-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold hover:bg-purple-700 transition-all hover:scale-105 flex items-center"><i data-lucide="save" class="mr-2 w-5 h-5"></i> Simpan Mutabaah</button></div>`;
    lucide.createIcons();
};

window.autoFillNilai = function(selectElement) {
    const row = selectElement.closest('.mutabaah-card');
    const inputNilai = row.querySelector('.nilai-auto');
    const predikat = selectElement.value;
    inputNilai.value = APP_CONFIG.predikat_nilai[predikat] || 0;
};

window.saveMutabaah = async function() {
    const halaqoh = document.getElementById('mutabaah-halaqoh').value;
    const waktu = document.getElementById('mutabaah-waktu').value;
    if(!halaqoh || !waktu) return showNotify('error', 'Pilih Halaqoh dan Waktu!');
    showLoader(true);
    const rows = [];
    document.querySelectorAll('.mutabaah-card').forEach(card => {
        const jenis = card.querySelector('.jenis-select').value;
        const predikat = card.querySelector('.predikat-select').value;
        if (jenis) {
            rows.push({
                nisn: card.dataset.nisn,
                nama: card.querySelector('.font-bold').innerText.split('\n')[0],
                halaqoh: halaqoh,
                waktu_halaqoh: waktu,
                jenis_mutabaah: jenis,
                dari_halaman: card.querySelector('.from-hal').value || null,
                dari_baris: card.querySelector('.from-baris').value || null,
                sampai_halaman: card.querySelector('.to-hal').value || null,
                sampai_baris: card.querySelector('.to-baris').value || null,
                predikat: predikat,
                nilai: card.querySelector('.nilai-auto').value,
                email_penginput: userEmail,
                tanggal: new Date().toISOString().split('T')[0]
            });
        }
    });
    if(rows.length === 0) { showLoader(false); return showNotify('error', 'Isi data hafalan minimal satu santri!'); }
    try {
        if(!supabaseInstance) throw new Error("Database not connected");
        const { error } = await supabaseInstance.from('mutabaah').insert(rows);
        if(error) throw error;
        showNotify('success', 'Mutabaah Tersimpan!');
        resetForm('mutabaah');
    } catch(e) { console.error(e); showNotify('error', 'Gagal menyimpan mutabaah.'); } finally { showLoader(false); }
};

// --- JURNAL ---
window.fetchJurnalData = async function() {
    const tbody = document.getElementById('jurnal-table-body');
    if(tbody) tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500"><div class="inline-block animate-spin mr-2">⟳</div> Memuat data...</td></tr>';

    try {
        if(!supabaseInstance) throw new Error("Database not connected");

        // Ambil data Mutabaah & Absensi
        const { data: dataM, error: errM } = await supabaseInstance.from('mutabaah').select('*').order('created_at', { ascending: false }).limit(50); // Limit dinaikkan agar history terlihat
        const { data: dataA, error: errA } = await supabaseInstance.from('absensi').select('*').order('created_at', { ascending: false }).limit(50);

        if (errM || errA) throw new Error("Gagal mengambil data");

        // Gabungkan dan simpan ke variabel global dbJurnal
        dbJurnal = [...(dataM || []).map(d => ({...d, type: 'MUTABAAH'})), ...(dataA || []).map(d => ({...d, type: 'ABSENSI'}))]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Render tabel pertama kali (tanpa filter)
        filterJurnal();

    } catch(e) {
        console.error(e);
        if(tbody) tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-red-500">Gagal mengambil riwayat. Cek koneksi internet.</td></tr>';
    }
};

// Fungsi Baru: Filter Jurnal di sisi Client (Browser)
window.filterJurnal = function() {
    const filterHalaqoh = document.getElementById('jurnal-filter-halaqoh')?.value.toLowerCase() || '';
    const filterNama = document.getElementById('jurnal-filter-nama')?.value.toLowerCase() || '';

    const tbody = document.getElementById('jurnal-table-body');
    if(!tbody) return;

    // Lakukan filtering pada dbJurnal
    const filteredData = dbJurnal.filter(row => {
        const matchHalaqoh = filterHalaqoh === '' || (row.halaqoh && row.halaqoh.toLowerCase() === filterHalaqoh);
        const matchNama = filterNama === '' || (row.nama && row.nama.toLowerCase().includes(filterNama));
        return matchHalaqoh && matchNama;
    });

    renderJurnalTable(filteredData);
};

function renderJurnalTable(data) {
    const tbody = document.getElementById('jurnal-table-body');
    if(!tbody) return;

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-400">Data tidak ditemukan sesuai filter.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(row => {
        const isMutabaah = row.type === 'MUTABAAH';
        const badgeColor = isMutabaah ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
        const typeLabel = isMutabaah ? (row.jenis_mutabaah || 'Hafalan') : 'Absensi';

        let detail = '-';
        if(isMutabaah) {
            if(row.dari_halaman) detail = `Hal ${row.dari_halaman}:${row.dari_baris} <i data-lucide="arrow-right" class="inline w-3 h-3"></i> ${row.sampai_halaman}:${row.sampai_baris}`;
        } else {
            detail = row.nilai ? `Nilai: ${row.nilai}` : '-';
        }

        const statusColor = row.status === 'Hadir' ? 'text-green-600' : 'text-red-500';
        const result = isMutabaah ? `<span class="font-bold">${row.predikat || '-'}</span> <span class="text-xs text-gray-400">(${row.nilai})</span>` : `<span class="font-bold ${statusColor}">${row.status}</span>`;

        return `
        <tr class="text-sm hover:bg-gray-50 transition-colors border-b last:border-0">
            <td class="p-3 text-gray-500 whitespace-nowrap">
                <div class="font-medium text-gray-800">${formatTanggalIndo(row.tanggal)}</div>
                <div class="text-xs text-blue-500 bg-blue-50 inline-block px-1 rounded mt-1">${row.waktu_halaqoh || '-'}</div>
            </td>
            <td class="p-3">
                <div class="font-bold text-gray-800">${row.nama}</div>
                <div class="text-xs text-gray-400">${row.halaqoh}</div>
            </td>
            <td class="p-3">
                <span class="${badgeColor} px-2 py-1 rounded text-xs font-bold border border-opacity-20 uppercase tracking-wider">${typeLabel}</span>
            </td>
            <td class="p-3 text-gray-700 font-mono text-xs">${detail} / ${result}</td>
        </tr>
    `}).join('');
    lucide.createIcons();
}

// --- LAPORAN (UPDATED: S/I/A & Rata-rata) ---
window.generateLaporan = async function() {
    const halaqoh = document.getElementById('laporan-halaqoh').value;
    const periode = document.getElementById('laporan-periode').value;
    const tbody = document.getElementById('laporan-table-body');

    if (!halaqoh) return showNotify('error', 'Pilih Halaqoh terlebih dahulu!');

    tbody.innerHTML = '<tr><td colspan="9" class="p-8 text-center"><div class="inline-block animate-spin mr-2">⟳</div> Menghitung...</td></tr>';

    try {
        let mutabaahQuery = supabaseInstance.from('mutabaah').select('*').eq('halaqoh', halaqoh);
        let absensiQuery = supabaseInstance.from('absensi').select('*').eq('halaqoh', halaqoh);

        // Filter Tanggal
        const today = new Date();
        let startDate;

        if (periode !== 'semua') {
            if (periode === 'minggu') {
                startDate = new Date(today.setDate(today.getDate() - today.getDay()));
            } else if (periode === 'bulan') {
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            } else if (periode === '3bulan') {
                startDate = new Date(today.setMonth(today.getMonth() - 3));
            } else if (periode === 'semester') {
                startDate = new Date(today.setMonth(today.getMonth() - 6));
            }
            const isoDate = startDate.toISOString().split('T')[0];
            mutabaahQuery = mutabaahQuery.gte('tanggal', isoDate);
            absensiQuery = absensiQuery.gte('tanggal', isoDate);
        }

        const [resMutabaah, resAbsensi] = await Promise.all([mutabaahQuery, absensiQuery]);

        if (resMutabaah.error) throw resMutabaah.error;
        if (resAbsensi.error) throw resAbsensi.error;

        // Grouping Data per Siswa
        const reportData = {};

        dbStudents.filter(s => s.halaqoh === halaqoh).forEach(s => {
            reportData[s.nama] = {
                nama: s.nama,
                halaqoh: s.halaqoh,
                ziyadahPages: new Set(),
                murajaahPages: new Set(),
                juziyyahPages: new Set(),
                lastEntryZiyadah: null,
                sakit: 0,
                izin: 0,
                alpa: 0,
                totalNilai: 0,
                countNilai: 0
            };
        });

        // Proses Absensi (S/I/A & Rata-rata)
        resAbsensi.data.forEach(row => {
            if (!reportData[row.nama]) reportData[row.nama] = { nama: row.nama, halaqoh: row.halaqoh, ziyadahPages: new Set(), murajaahPages: new Set(), juziyyahPages: new Set(), lastEntryZiyadah: null, sakit: 0, izin: 0, alpa: 0, totalNilai: 0, countNilai: 0 };

            if (row.status === 'Sakit') reportData[row.nama].sakit++;
            if (row.status === 'Izin') reportData[row.nama].izin++;
            if (row.status === 'Alpha') reportData[row.nama].alpa++;

            if (row.nilai) {
                reportData[row.nama].totalNilai += Number(row.nilai);
                reportData[row.nama].countNilai++;
            }
        });

        // Proses Mutabaah (Pages & Last Entry)
        resMutabaah.data.forEach(row => {
            if (!reportData[row.nama]) reportData[row.nama] = { nama: row.nama, halaqoh: row.halaqoh, ziyadahPages: new Set(), murajaahPages: new Set(), juziyyahPages: new Set(), lastEntryZiyadah: null, sakit: 0, izin: 0, alpa: 0, totalNilai: 0, countNilai: 0 };

            const startPage = parseInt(row.dari_halaman);
            const endPage = parseInt(row.sampai_halaman);

            // Tentukan target set berdasarkan jenis mutabaah
            let targetSet;
            if (row.jenis_mutabaah === 'Ziyadah') targetSet = reportData[row.nama].ziyadahPages;
            else if (row.jenis_mutabaah === 'Murajaah') targetSet = reportData[row.nama].murajaahPages;
            else if (row.jenis_mutabaah === 'Juziyyah') targetSet = reportData[row.nama].juziyyahPages;

            if (targetSet) {
                 if (!isNaN(startPage) && !isNaN(endPage)) {
                    for (let i = startPage; i <= endPage; i++) targetSet.add(i);
                } else if (!isNaN(startPage)) {
                     targetSet.add(startPage);
                }
            }

            // Update Last Entry HANYA jika jenisnya Ziyadah
            if (row.jenis_mutabaah === 'Ziyadah') {
                const rowDate = new Date(row.created_at);
                const currentLast = reportData[row.nama].lastEntryZiyadah;
                if (!currentLast || new Date(currentLast.created_at) < rowDate) {
                    reportData[row.nama].lastEntryZiyadah = row;
                }
            }
        });

        const rows = Object.values(reportData);
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-gray-400">Tidak ada data pada periode ini.</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(r => {
            let lastPos = '-';
            if (r.lastEntryZiyadah) {
                lastPos = `Hal ${r.lastEntryZiyadah.sampai_halaman || '?'} : Baris ${r.lastEntryZiyadah.sampai_baris || '?'}`;
                lastPos += `<br><span class="text-[10px] text-gray-400">${formatTanggalIndo(r.lastEntryZiyadah.tanggal)}</span>`;
            }

            const avg = r.countNilai > 0 ? (r.totalNilai / r.countNilai).toFixed(1) : '-';

            return `
            <tr class="hover:bg-indigo-50/50 border-b last:border-0 transition-colors">
                <td class="p-3 font-bold text-gray-800">${r.nama}</td>
                <td class="p-3 text-center bg-indigo-50/30">
                     <span class="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold">
                        ${r.ziyadahPages.size}
                    </span>
                </td>
                <td class="p-3 text-center">
                    <span class="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">
                        ${r.murajaahPages.size}
                    </span>
                </td>
                <td class="p-3 text-center bg-indigo-50/30">
                    <span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                        ${r.juziyyahPages.size}
                    </span>
                </td>
                <td class="p-3 text-center text-yellow-600 font-bold">${r.sakit}</td>
                <td class="p-3 text-center text-blue-600 font-bold">${r.izin}</td>
                <td class="p-3 text-center text-red-600 font-bold">${r.alpa}</td>
                <td class="p-3 text-center font-bold text-gray-700">${avg}</td>
                <td class="p-3 text-sm text-gray-700 font-mono leading-tight">${lastPos}</td>
            </tr>
            `;
        }).join('');

    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-red-500">Gagal memuat laporan.</td></tr>';
    }
};

function formatTanggalIndo(dateString) {
    if(!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function showNotify(type, msg) {
    const container = document.getElementById('notification-container');
    if(!container) return;
    const el = document.createElement('div');
    el.className = `p-4 mb-2 rounded-xl shadow-lg text-white font-medium flex items-center animate-bounce-in ${type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`;
    el.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}" class="mr-2 w-5 h-5"></i> ${msg}`;
    container.appendChild(el);
    lucide.createIcons();
    setTimeout(() => el.remove(), 4000);
}

function showLoader(show) { const loader = document.getElementById('global-loader'); if(loader) loader.classList.toggle('hidden', !show); }
function resetForm(type) {
    const list = document.getElementById(type === 'absensi' ? 'absensi-list' : 'mutabaah-list');
    const halaqoh = document.getElementById(type === 'absensi' ? 'absensi-halaqoh' : 'mutabaah-halaqoh');
    const waktu = document.getElementById(type === 'absensi' ? 'absensi-waktu' : 'mutabaah-waktu'); // Reset waktu juga

    if(list) list.innerHTML = '';
    if(halaqoh) halaqoh.value = '';
    if(waktu) waktu.value = '';
}
