
# 🎨 Multiplayer Drawing Game – Real-Time WebSocket + Firebase

Sebuah game menggambar multiplayer real-time (mirip Gartic.io), dibangun menggunakan **Node.js**, **WebSocket**, dan **Firebase Realtime Database**. Game ini memungkinkan pemain untuk membuat ruangan, bergiliran menggambar kata, dan menebak gambar pemain lain untuk mendapatkan skor.

## 🚀 Teknologi yang Digunakan

* **Backend:** Node.js + Express (Server HTTP)
* **Real-Time Communication:** WebSocket (`ws`)
* **Database:** Firebase Realtime Database (Sinkronisasi data player, room, drawing, chat)
* **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
* **Drawing:** Canvas API (HTML5)

## 📌 Fitur Utama

Game ini mendukung fitur-fitur berikut:

### 🏠 1. Sistem Room
* Player bisa **Create Room**.
* Player lain bisa **Join Room** menggunakan kode unik (6 karakter).
* Host otomatis diberikan kepada pembuat room.
* Migrasi Host otomatis jika host saat ini keluar.

### 🎮 2. Game Start & Rounds
* Hanya Host yang memiliki akses tombol **Start Game**.
* Game berjalan berdasarkan sistem ronde.
* Setiap ronde memiliki:
    * 1 Pemain sebagai **Drawer**.
    * 1 Kata acak (dengan tingkat kesulitan).
    * Hint (huruf pertama).
* Player lain menebak kata melalui kolom chat.

### ✏️ 3. Real-Time Drawing
* Server menerima koordinat gambar dari drawer dan mem-broadcast ke seluruh pemain.
* Sistem gambar berbasis *dot/segment* untuk hasil yang halus (smooth).
* Fitur **Clear Canvas** tersedia.

### 💬 4. Chat System
* Kirim pesan obrolan normal.
* Pesan sistem otomatis (Join/Leave/Game Info).
* Notifikasi khusus saat jawaban benar.

### 🏆 5. Scoring System
* **Penebak Benar:** +100 poin.
* **Penggambar:** +50 poin (jika ada yang menebak benar).
* **Win Condition:** Game berakhir jika salah satu pemain mencapai **1000 poin**.
* Notifikasi pemenang muncul secara live di semua client.

### 📱 6. Responsif & Mobile Friendly
* Area canvas otomatis menyesuaikan ukuran layar (Desktop & Mobile).
* *Drawing Tools* hanya muncul saat giliran Anda menggambar.
* UI didesain compact untuk layar HP.

---

## 📂 Struktur Project

```text
📁 project-folder
├── 📁 public
│   ├── index.html       # Halaman utama game
│   ├── style.css        # Styling layout & responsivitas
│   ├── script.js        # Logika Frontend (WebSocket client, Canvas, UI)
│   └── assets/          # (Optional) Gambar/Icon
│
├── server.js            # Entry point: WebSocket server + Express + Logic Game
├── serviceAccountKey.json # Kunci akses Firebase Admin SDK
├── package.json         # Daftar dependency
└── README.md            # Dokumentasi proyek
````

-----

## ⚙️ Instalasi & Cara Menjalankan

Ikuti langkah berikut untuk menjalankan game di komputer lokal:

### 1️⃣ Clone Repository

```bash
git clone [https://github.com/taka-duarr/Drawing-Game.git)
cd drawing-game
```

### 2️⃣ Install Dependency

Pastikan Anda sudah menginstall Node.js, lalu jalankan:

```bash
npm install
```

### 3️⃣ Konfigurasi Firebase

1.  Masuk ke [Firebase Console](https://console.firebase.google.com/).
2.  Buat project baru.
3.  Masuk ke menu **Build** \> **Realtime Database** \> **Create Database**.
4.  Masuk ke **Project Settings** \> **Service accounts**.
5.  Klik **Generate new private key**.
6.  Simpan file JSON yang terunduh, ubah namanya menjadi `serviceAccountKey.json`.
7.  Letakkan file tersebut di **root folder** proyek ini.
8.  *(Penting)* Pastikan URL database di `server.js` sesuai dengan database Anda.

### 4️⃣ Jalankan Server

Mode biasa:

```bash
node server.js
```

Atau mode development (auto-restart):

```bash
nodemon server.js
```

Server akan berjalan di: `http://localhost:3000`

### 🔧 Konfigurasi Environment (Opsional)

Anda bisa membuat file `.env` untuk mengatur port:

```env
PORT=3000
```

-----

## 🛠️ Cara Bermain

1.  **Masuk Lobby:** Masukkan username Anda, lalu pilih **Create Room** (untuk jadi Host) atau masukkan kode room teman dan klik **Join Room**.
2.  **Waiting Room:** Host menunggu pemain lain bergabung. Host menekan tombol **Start Game**.
3.  **Gameplay:**
      * **Drawer:** Anda mendapat kata rahasia. Gunakan alat gambar untuk memvisualisasikannya.
      * **Guesser:** Lihat gambar di layar dan ketik tebakan Anda di kotak chat secepat mungkin.
      * Skor akan diberikan otomatis.

-----

## 📡 Arsitektur Real-Time

Komunikasi antara Client dan Server menggunakan event WebSocket (JSON Payload).

### 🔵 Client → Server (Request)

| Event | Deskripsi |
| :--- | :--- |
| `create_room` | Permintaan membuat room baru |
| `join_room` | Permintaan bergabung ke room yang ada |
| `start_game` | Host memulai permainan |
| `draw` | Mengirim data koordinat gambar (x, y, color, size) |
| `clear_canvas` | Permintaan menghapus seluruh gambar di kanvas |
| `chat_message` | Mengirim pesan chat / tebakan |
| `leave_game` | Pemain keluar dari permainan |

### 🔴 Server → Client (Response/Broadcast)

| Type | Fungsi |
| :--- | :--- |
| `room_created` | Konfirmasi room berhasil dibuat |
| `room_joined` | Konfirmasi berhasil masuk room |
| `player_joined` | Memberitahu ada player lain masuk |
| `player_left` | Memberitahu ada player keluar |
| `game_started` | Sinyal game dimulai (pindah layar) |
| `new_round` | Info ronde baru (drawer, hint, round number) |
| `you_are_drawing` | Info khusus ke drawer (kata rahasia) |
| `draw` | Update gambar realtime ke semua client |
| `correct_guess` | Notifikasi ada pemain menebak benar |
| `clear_canvas` | Perintah menghapus kanvas di client |
| `players_update` | Update list player dan skor terbaru |
| `game_over` | Notifikasi pemenang akhir (mencapai 1000 poin) |
| `error` | Pesan error (room penuh, tidak ditemukan, dll) |

-----

## 🧠 Algoritma & Logika Utama

  * **Pemilihan Drawer:** Menggunakan antrian (queue) agar semua pemain mendapatkan giliran secara adil. Jika drawer keluar di tengah giliran, sistem otomatis menunjuk pengganti.
  * **Tebakan Kata:** Server memvalidasi pesan chat. Hanya jawaban yang *exact match* (tidak case-sensitive) yang dianggap benar.
  * **Kendali Ronde:**
      * Ronde baru dimulai otomatis setelah jeda 3 detik paska jawaban benar/waktu habis.
      * Status `roundAnswered` direset setiap awal ronde.

### 🐞 Bug Fixes Penting (Solved)

  * ✅ Tombol Start hanya muncul di Host.
  * ✅ *Race condition* saat banyak pemain menjawab benar bersamaan (sekarang hanya yang pertama atau sistem poin diatur sesuai).
  * ✅ Player ke-3+ mendapatkan giliran dengan urutan yang benar.
  * ✅ Isu Canvas gepeng/terpotong di Mobile (Fixed dengan `flex` layout).
  * ✅ Notifikasi ganda (Double toast) telah diperbaiki.

-----

## 📌 TODO Features (Next Update)

  - [ ] Mode Private / Public Room listing.
  - [ ] Power-ups (Freeze canvas, Reveal 1 letter hint).
  - [ ] Avatar kustom untuk player.
  - [ ] Custom Word Pack (Bisa input kata sendiri).
  - [ ] Efek suara (Sound FX) untuk benar/salah/menang.

-----

## 🤝 Kontribusi

Pull request sangat dipersilakan\! Jika Anda menemukan bug, silakan buat *issue* baru.

## 📜 Lisensi

MIT License © 2025
