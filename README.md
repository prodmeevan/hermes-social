# Hermes Social (Beta)

Read-only local MCP server and CLI for visible pages on YouTube, Reddit, X, and Threads. Uses a dedicated Microsoft Edge profile and Node.js built-ins—no API key, cloud scraper, or npm dependency.

> Beta: site support is uneven. Reddit post/feed reading and YouTube home feed have been exercised. X and Threads currently often show login pages instead of readable posts. Check tested status below before relying on a site.

Requirements: Windows 10/11, Node.js 22+, Microsoft Edge. Hermes Agent only required for MCP integration.

Clone this repo, then run CLI commands from its directory. For install/MCP setup, see sections below.

## Quick start

Clone repo, lalu dari direktori proyek:

```bat
hermes-social.cmd status
hermes-social.cmd feed --site reddit
hermes-social.cmd read https://www.reddit.com/r/indonesia/comments/POST_ID/
hermes-social.cmd screenshot https://www.reddit.com/r/indonesia/
```

Untuk login manual: `hermes-social.cmd login --site reddit` (ganti site: `youtube`, `x`, `threads`). Pakai jendela Edge khusus Hermes Social. Perintah login sengaja membiarkan tab tetap terbuka.

Profil Edge tool disimpan lokal di `%USERPROFILE%\.hermes-social\edge-profile`. Jangan hapus profil ini kalau ingin tetap login. Logout/revoke sesi lewat pengaturan keamanan masing-masing situs. Jangan menyalin, mengirim, atau membaca file cookie/session.

## Perintah

```text
hermes-social.cmd status
hermes-social.cmd login --site youtube
hermes-social.cmd search --site youtube "lofi music"
hermes-social.cmd search --site reddit "python jobs"
hermes-social.cmd read https://www.youtube.com/watch?v=VIDEO_ID
hermes-social.cmd feed --site youtube
hermes-social.cmd screenshot https://www.reddit.com/r/indonesia/
```

`feed` membuka beranda situs dan mengembalikan teks yang terlihat di halaman. Feed bergantung akun/login dan dapat berubah sesuai rekomendasi situs. Untuk video YouTube, halaman publik menampilkan metadata/teks yang tersedia; tidak menjanjikan transkrip lengkap.

## MCP Hermes (stdio lokal)

Tambahkan ke `mcp_servers` Hermes config dengan mekanisme resmi Hermes, gunakan absolute paths dan restart Hermes:

```yaml
mcp_servers:
  hermes-social:
    command: "C:/Program Files/nodejs/node.exe"
    args:
      - "E:/AgentSkills/Hermes-Social/mcp-server.mjs"
    timeout: 120
    connect_timeout: 10
```

Tool terdaftar: `social_search`, `social_read`, `social_feed`, `social_login`, `social_screenshot`. Screenshot disimpan sebagai PNG di `%USERPROFILE%\.hermes-social\screenshots\` dan dikembalikan sebagai image MCP. Login tetap dilakukan pengguna di jendela Edge; password/2FA tidak dibaca tool. MCP server hanya memakai protokol MCP via stdio, tanpa API server/port publik.

## Batasan jujur

- Browser memakai satu profil terisolasi dan port DevTools loopback eksklusif 9334; tidak attach ke Edge pribadi. Kalau port dipakai proses lain, tool berhenti.
- Baca konten HTML yang tampil saja; tak mengeklik CAPTCHA, melewati paywall, mengekstrak cookie, posting, like, follow, atau DM.
- Situs bisa meminta login/verifikasi, menolak otomasi, atau mengubah UI. Feed Reddit publik dan baca halaman posting Reddit sudah diuji dan menampilkan isi posting serta komentar yang termuat; feed YouTube juga diuji. X/Threads feed dan Reddit/X/Threads search belum terverifikasi stabil.
- Gratis dan tanpa API key, tetapi uptime/akses ditentukan situs. Kalau verifikasi muncul, selesaikan manual di Edge; tool melaporkan gagal sampai halaman menampilkan konten.
