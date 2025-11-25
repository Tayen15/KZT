# 🚀 Heroku Deployment Guide - KZT Discord Bot

> ⚠️ Catatan: Proyek sekarang menggunakan **MongoDB (MONGO_URI)**. Seluruh instruksi terkait Supabase PostgreSQL di bawah bersifat arsip (historical). Untuk deployment saat ini: set `MONGO_URI` di Heroku Config Vars, jalankan `npx prisma db push`, lalu `npx prisma generate` jika perlu. Session store memakai `connect-mongo`.

Panduan lengkap (ARSIP) untuk deploy KZT Discord Bot ke Heroku dengan database Supabase PostgreSQL.

---

## 📋 Prerequisites

Sebelum memulai, pastikan Anda memiliki:

1. ✅ Akun [Heroku](https://heroku.com) (gratis/paid)
2. ✅ Akun [Supabase](https://supabase.com) (gratis)
3. ✅ [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) terinstall
4. ✅ [Git](https://git-scm.com) terinstall
5. ✅ Discord Bot Token & OAuth credentials dari [Discord Developer Portal](https://discord.com/developers/applications)

---

## 🗄️ Setup Database Supabase

### 1. Buat Project Baru di Supabase

1. Login ke [Supabase](https://app.supabase.com)
2. Klik **"New Project"**
3. Isi detail project:
   - **Name**: `kzt-bot` (atau nama lain)
   - **Database Password**: Generate password yang kuat
   - **Region**: Pilih region terdekat (e.g., Southeast Asia)
4. Tunggu hingga project selesai dibuat (~2 menit)

### 2. Dapatkan Database URL

1. Buka project Supabase Anda
2. Klik **"Settings"** (ikon gear) di sidebar kiri
3. Pilih **"Database"**
4. Scroll ke bawah ke section **"Connection string"**
5. Pilih tab **"URI"**
6. Copy connection string (format: `postgresql://postgres:[YOUR-PASSWORD]@...`)
7. **Simpan URL ini**, akan digunakan di Heroku

> ⚠️ **Penting**: Pastikan menggunakan connection string dengan mode **Transaction** atau **Session**, bukan **Connection Pooling** untuk Prisma.

---

## 🛠️ Setup Heroku Application

### Method 1: Deploy via Heroku Dashboard (Recommended for Beginners)

#### Step 1: Create Heroku App

1. Login ke [Heroku Dashboard](https://dashboard.heroku.com)
2. Klik **"New"** → **"Create new app"**
3. Isi form:
   - **App name**: `kzt-discord-bot` (nama unik, akan jadi URL: `kzt-discord-bot.herokuapp.com`)
   - **Region**: Pilih region (US/Europe)
4. Klik **"Create app"**

#### Step 2: Configure Environment Variables

1. Di app dashboard, klik tab **"Settings"**
2. Scroll ke **"Config Vars"**, klik **"Reveal Config Vars"**
3. Tambahkan variable berikut satu per satu:

```env
# Discord Configuration
DISCORD_TOKEN = your_discord_bot_token
CLIENT_ID = your_discord_client_id
CLIENT_SECRET = your_discord_client_secret

# Database (Supabase)
DATABASE_URL = postgresql://postgres:[PASSWORD]@[HOST]/postgres

# Session Security
SESSION_SECRET = [generate dengan: openssl rand -base64 32]

# Dashboard URLs
CALLBACK_URL = https://your-app-name.herokuapp.com/auth/discord/callback
DASHBOARD_URL = https://your-app-name.herokuapp.com

# Environment
NODE_ENV = production

# Optional: Genius Lyrics API
GENIUS_CLIENT_ID = your_genius_client_id (optional)
GENIUS_API_TOKEN = your_genius_api_token (optional)
```

> 💡 **Tips Generate SESSION_SECRET**:
> - Windows PowerShell: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))`
> - Linux/Mac: `openssl rand -base64 32`

#### Step 3: Deploy via GitHub

1. Di tab **"Deploy"**, pilih deployment method: **"GitHub"**
2. Klik **"Connect to GitHub"** dan authorize Heroku
3. Cari repository: `Tayen15/KZT`
4. Klik **"Connect"**
5. Scroll ke **"Manual deploy"** atau enable **"Automatic deploys"**
6. Pilih branch: `main`
7. Klik **"Deploy Branch"**

#### Step 4: Run Database Migration

Setelah deploy selesai:

1. Buka terminal/command prompt
2. Login ke Heroku CLI:
   ```bash
   heroku login
   ```
3. Jalankan migration:
   ```bash
   heroku run npx prisma migrate deploy -a your-app-name
   heroku run npx prisma generate -a your-app-name
   ```

---

### Method 2: Deploy via Heroku CLI (Advanced)

```bash
# 1. Clone repository
git clone https://github.com/Tayen15/KZT.git
cd KZT

# 2. Login ke Heroku
heroku login

# 3. Create Heroku app
heroku create your-app-name

# 4. Set environment variables
heroku config:set DISCORD_TOKEN="your_token"
heroku config:set CLIENT_ID="your_client_id"
heroku config:set CLIENT_SECRET="your_client_secret"
heroku config:set DATABASE_URL="postgresql://postgres:password@host/postgres"
heroku config:set SESSION_SECRET="$(openssl rand -base64 32)"
heroku config:set NODE_ENV="production"
heroku config:set CALLBACK_URL="https://your-app-name.herokuapp.com/auth/discord/callback"
heroku config:set DASHBOARD_URL="https://your-app-name.herokuapp.com"

# 5. Deploy
git push heroku main

# 6. Run migrations
heroku run npx prisma migrate deploy
heroku run npx prisma generate

# 7. Scale dyno (if needed)
heroku ps:scale web=1

# 8. Check logs
heroku logs --tail
```

---

## 🎮 Setup Discord OAuth Redirect URLs

Setelah deploy, update Discord Application OAuth settings:

1. Buka [Discord Developer Portal](https://discord.com/developers/applications)
2. Pilih aplikasi bot Anda
3. Klik **"OAuth2"** di sidebar
4. Di section **"Redirects"**, tambahkan:
   ```
   https://your-app-name.herokuapp.com/auth/discord/callback
   ```
5. Klik **"Save Changes"**

---

## ✅ Verifikasi Deployment

### 1. Check Application Status
```bash
heroku ps -a your-app-name
```

Expected output:
```
=== web (Eco): node bot.js (1)
web.1: up 2024/11/14 10:30:00 +0700 (~ 5m ago)
```

### 2. View Logs
```bash
heroku logs --tail -a your-app-name
```

Look for:
```
✅ Using Prisma (PostgreSQL) session store
✅ Discord client connected to web server
🌐 Web server running on port 3000
✅ Bot is online as YourBot#1234
```

### 3. Test Dashboard
1. Buka browser, kunjungi: `https://your-app-name.herokuapp.com`
2. Klik **"Login with Discord"**
3. Authorize bot
4. Anda akan redirect ke dashboard

### 4. Test Bot Commands
1. Invite bot ke server Discord Anda
2. Coba command: `/ping`
3. Jika bot merespon, deployment berhasil! 🎉

---

## 🔧 Maintenance & Troubleshooting

### View Real-time Logs
```bash
heroku logs --tail -a your-app-name
```

### Restart Application
```bash
heroku restart -a your-app-name
```

### Run Prisma Studio (Database GUI)
```bash
# Not recommended on Heroku, use Supabase Dashboard instead
# Supabase: Project → Table Editor
```

### Reset Database (DANGER!)
```bash
# Reset all migrations and data
heroku run npx prisma migrate reset -a your-app-name
```

### Update Environment Variables
```bash
# View all variables
heroku config -a your-app-name

# Set new variable
heroku config:set KEY=VALUE -a your-app-name

# Remove variable
heroku config:unset KEY -a your-app-name
```

---

## 📊 Database Management

### Access Supabase Dashboard

1. Login ke [Supabase Dashboard](https://app.supabase.com)
2. Pilih project Anda
3. Klik **"Table Editor"** untuk melihat data
4. Klik **"SQL Editor"** untuk menjalankan query manual

### Common Queries

#### View All Users
```sql
SELECT * FROM "User" LIMIT 10;
```

#### View All Guilds
```sql
SELECT * FROM "Guild" ORDER BY "addedAt" DESC LIMIT 10;
```

#### Count Total Members
```sql
SELECT COUNT(*) FROM "GuildMember";
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "Application Error" di Heroku
**Solusi:**
```bash
# Check logs untuk error detail
heroku logs --tail -a your-app-name

# Restart app
heroku restart -a your-app-name
```

### Issue 2: Database Connection Error
**Solusi:**
- Pastikan `DATABASE_URL` benar (copy dari Supabase)
- Pastikan Supabase project aktif
- Check Supabase project tidak di-pause (free tier)

### Issue 3: OAuth Redirect Error
**Solusi:**
- Pastikan `CALLBACK_URL` di Heroku config vars benar
- Pastikan URL terdaftar di Discord Developer Portal OAuth redirects
- Format harus: `https://your-app-name.herokuapp.com/auth/discord/callback`

### Issue 4: Bot Tidak Online
**Solusi:**
```bash
# Check dyno status
heroku ps -a your-app-name

# Scale dyno jika off
heroku ps:scale web=1 -a your-app-name

# Check logs
heroku logs --tail -a your-app-name
```

### Issue 5: Prisma Migration Failed
**Solusi:**
```bash
# Reset Prisma
heroku run npx prisma migrate reset -a your-app-name

# Deploy migrations manually
heroku run npx prisma migrate deploy -a your-app-name
heroku run npx prisma generate -a your-app-name
```

---

## 💰 Pricing & Limits

### Heroku Eco Dyno ($5/month per app)
- ✅ No sleep time (24/7 uptime)
- ✅ 512 MB RAM
- ✅ Custom domain support
- ⚠️ Limited to 1000 dyno hours/month (enough for 1 app)

### Supabase Free Tier
- ✅ 500 MB database storage
- ✅ Unlimited API requests
- ✅ Up to 2 GB bandwidth
- ⚠️ Project pauses after 1 week inactivity (re-activate di dashboard)

---

## 🔄 Update & Redeploy

### Auto Deploy (Recommended)
Enable di Heroku Dashboard → Deploy → Automatic deploys

Setiap push ke GitHub `main` branch akan auto-deploy.

### Manual Deploy via CLI
```bash
# Pull latest changes
git pull origin main

# Deploy to Heroku
git push heroku main

# Run migrations if schema changed
heroku run npx prisma migrate deploy -a your-app-name
```

---

## 📚 Useful Heroku Commands

```bash
# View app info
heroku info -a your-app-name

# Open app in browser
heroku open -a your-app-name

# Run bash shell
heroku run bash -a your-app-name

# View environment variables
heroku config -a your-app-name

# Scale dynos
heroku ps:scale web=1 -a your-app-name

# View metrics
heroku metrics -a your-app-name
```

---

## 🎯 Next Steps

Setelah deployment berhasil:

1. ✅ Invite bot ke server Discord
2. ✅ Configure features via dashboard
3. ✅ Setup prayer times, monitoring, dll
4. ✅ Monitor logs dan performance
5. ✅ Setup custom domain (optional)

---

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Tayen15/KZT/issues)
- 📖 **Documentation**: See `README.md`
- 💬 **Discord**: Join support server (if available)

---

## 📝 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DISCORD_TOKEN` | ✅ | Bot token from Discord Developer Portal | `MTAwNjU0MjE0NjYyODc1MTQwMA...` |
| `CLIENT_ID` | ✅ | Discord Application Client ID | `1006542146628751400` |
| `CLIENT_SECRET` | ✅ | Discord Application Client Secret | `abc123xyz...` |
| `MONGO_URI` | ✅ | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster/db` |
| `DATABASE_URL` | Arsip | Supabase PostgreSQL (tidak digunakan) | `postgresql://postgres:pass@host/db` |
| `SESSION_SECRET` | ✅ | Random string for session encryption | Generate dengan `openssl rand -base64 32` |
| `CALLBACK_URL` | ✅ | OAuth callback URL | `https://app-name.herokuapp.com/auth/discord/callback` |
| `DASHBOARD_URL` | ✅ | Dashboard base URL | `https://app-name.herokuapp.com` |
| `NODE_ENV` | ✅ | Environment mode | `production` |
| `GENIUS_CLIENT_ID` | ❌ | Genius API client ID (optional) | - |
| `GENIUS_API_TOKEN` | ❌ | Genius API token (optional) | - |

---

## ✨ Features After Deployment

✅ 24/7 Bot Online
✅ Web Dashboard
✅ Discord OAuth Login
✅ Prayer Time Notifications
✅ Minecraft Server Monitoring
✅ Music Commands (Lofi)
✅ Moderation Tools
✅ Custom Rules System
✅ Server Statistics

---

**Happy Deploying! 🚀**
