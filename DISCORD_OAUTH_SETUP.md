# Discord OAuth Setup Guide for Heroku

## Problem: TokenError on `/auth/callback`

### Error Log
```
TokenError
at OAuth2Strategy.parseErrorResponse
at /app/node_modules/passport-oauth2/lib/strategy.js:177:45
```

This error occurs when Discord OAuth2 rejects the token exchange, usually due to **mismatched Redirect URI** or incorrect credentials.

---

## Solution: Configure Discord Developer Portal

### 1. Go to Discord Developer Portal
Visit: https://discord.com/developers/applications

### 2. Select Your Application
Click on your bot application (e.g., "ByteBot" or "KZT")

### 3. Navigate to OAuth2 → General

### 4. Add Redirect URI
**CRITICAL:** The Redirect URI must **exactly match** your Heroku callback URL.

Click **"Add Redirect"** and enter:
```
https://bytebot-app-ec39f2413c83.herokuapp.com/auth/callback
```

**Important:**
- ✅ Must use `https://` (not `http://`)
- ✅ No trailing slash
- ✅ Exact domain from `DISCORD_CALLBACK_URL` env var
- ❌ `localhost` URLs won't work on Heroku (only for local dev)

### 5. Save Changes
Click **"Save Changes"** at the bottom of the page.

---

## Verify Heroku Config

Check your current config:
```powershell
heroku config:get DISCORD_CALLBACK_URL -a bytebot-app
```

**Expected output:**
```
https://bytebot-app-ec39f2413c83.herokuapp.com/auth/callback
```

If it doesn't match your Discord Developer Portal setting, update it:
```powershell
heroku config:set DISCORD_CALLBACK_URL=https://bytebot-app-ec39f2413c83.herokuapp.com/auth/callback -a bytebot-app
```

---

## Local Development Setup

For local testing, add **both** URLs to Discord:

**Local Redirect URI:**
```
http://localhost:3000/auth/callback
```

**Heroku Redirect URI:**
```
https://bytebot-app-ec39f2413c83.herokuapp.com/auth/callback
```

Use different `.env` values:
- **Local:** `DISCORD_CALLBACK_URL=http://localhost:3000/auth/callback`
- **Heroku:** Set via `heroku config:set`

---

## Common Issues

### Issue: "redirect_uri_mismatch"
**Cause:** URI in Discord portal doesn't match `DISCORD_CALLBACK_URL`  
**Fix:** Ensure exact match (case-sensitive, no extra `/`)

### Issue: "invalid_client"
**Cause:** Wrong `DISCORD_CLIENT_ID` or `DISCORD_CLIENT_SECRET`  
**Fix:** Copy from Discord portal → OAuth2 → General
```powershell
heroku config:set DISCORD_CLIENT_ID=your_client_id -a bytebot-app
heroku config:set DISCORD_CLIENT_SECRET=your_client_secret -a bytebot-app
```

### Issue: Session not persisting after login
**Cause:** Cookie settings or session store issue  
**Fix:** Ensure `MONGO_URI` is set and `NODE_ENV=production`
```powershell
heroku config:set NODE_ENV=production -a bytebot-app
```

---

## Testing OAuth Flow

### 1. Check Redirect URI in Browser
Visit: `https://bytebot-app-ec39f2413c83.herokuapp.com/auth/login`

Discord should redirect you to:
```
https://discord.com/oauth2/authorize?client_id=...&redirect_uri=https%3A%2F%2Fbytebot-app-ec39f2413c83.herokuapp.com%2Fauth%2Fcallback&...
```

### 2. After Authorizing
Discord redirects to: `/auth/callback?code=...`

**Success:** Redirects to `/dashboard`  
**Failure:** Shows error or redirects to `/`

### 3. Check Logs
```powershell
heroku logs --tail -a bytebot-app | Select-String -Pattern "Auth"
```

Look for:
- ✅ `[Auth] New user created: username#0000`
- ❌ `[Auth] OAuth Error: ...`

---

## Discord OAuth2 Scopes

Current scopes in `middleware/passport.js`:
```javascript
const scopes = ['identify', 'email', 'guilds'];
```

**Required for dashboard:**
- `identify` - Get user ID, username, avatar
- `email` - Get user email (optional, can be removed if not needed)
- `guilds` - List user's guilds for server management

---

## Security Checklist

- [ ] `DISCORD_CLIENT_SECRET` is kept private (never commit to Git)
- [ ] `SESSION_SECRET` is set to a strong random string
- [ ] `NODE_ENV=production` on Heroku
- [ ] Redirect URI uses `https://` (not `http://`)
- [ ] MongoDB session store is working (not memory store)
- [ ] Cookies have `secure: true` in production

---

## Debugging Commands

```powershell
# Check all auth-related config
heroku config -a bytebot-app | Select-String -Pattern "DISCORD|SESSION|NODE_ENV"

# Test Discord API reachability
heroku run node -e "console.log(require('https').get('https://discord.com/api/v10/users/@me'))" -a bytebot-app

# Check session store connection
heroku logs --tail -a bytebot-app | Select-String -Pattern "session"
```

---

## References
- Discord OAuth2 Documentation: https://discord.com/developers/docs/topics/oauth2
- Passport-Discord Strategy: https://github.com/nicholastay/passport-discord
- Heroku Config Vars: https://devcenter.heroku.com/articles/config-vars
