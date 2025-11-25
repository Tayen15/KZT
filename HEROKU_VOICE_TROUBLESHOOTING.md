# Heroku Voice/Audio Troubleshooting Guide

## Problem: Lofi audio plays locally but not on Heroku

### Symptoms
- Log shows: `idle -> buffering -> playing -> idle` (quick cycle ~100ms)
- No audio heard in Discord voice channel
- No explicit errors in logs

### Root Cause
**FFmpeg missing** on Heroku dyno. Audio streams (especially radio URLs) require FFmpeg to decode/transcode formats like AAC, MP3, HLS containers.

## Solution Steps

### 1. Add FFmpeg Buildpack
```powershell
# Clear existing buildpacks (if needed)
heroku buildpacks:clear -a bytebot-app

# Add Node.js buildpack FIRST
heroku buildpacks:add heroku/nodejs -a bytebot-app

# Add FFmpeg buildpack SECOND
heroku buildpacks:add https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest -a bytebot-app

# (Optional) Add libsodium for encryption performance
heroku buildpacks:add https://github.com/michaelwenger/heroku-buildpack-libsodium -a bytebot-app

# Verify order
heroku buildpacks -a bytebot-app
```

Expected output:
```
=== bytebot-app Buildpack URLs
1. heroku/nodejs
2. https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest
```

### 2. Verify Dependencies Installed
Ensure `@discordjs/opus` is in `package.json`:
```json
"dependencies": {
  "@discordjs/opus": "^0.9.0",
  "@discordjs/voice": "^0.18.0"
}
```

### 3. Redeploy
```powershell
git add .
git commit -m "Add FFmpeg buildpack for audio streaming"
git push heroku main
```

### 4. Check Dependency Report
After deploy, verify FFmpeg & opus are detected:
```powershell
heroku run node -e "console.log(require('@discordjs/voice').generateDependencyReport())" -a bytebot-app
```

Expected output should include:
```
- @discordjs/opus: yes
- prism-media: yes
- ffmpeg: yes
```

### 5. Monitor Logs
Watch for new diagnostic messages:
```powershell
heroku logs --tail -a bytebot-app | Select-String -Pattern "Lofi"
```

Look for:
- ✅ `📦 [Lofi] Voice dependencies:` (shows FFmpeg status)
- ✅ `🔌 [Voice] ... -> ready`
- ✅ `🔄 [LofiPlayer] ... -> playing` (stays in playing, not idle)
- ❌ `❌ [LofiResource] Stream error:` (stream connection issue)
- ❌ `❌ [LofiReconnect] Playback stopped unexpectedly` (codec failure)

## Common Issues

### Issue: `node: command not found`
**Cause:** Node.js buildpack missing or wrong order  
**Fix:** Run step 1 above, ensure `heroku/nodejs` is FIRST

### Issue: Player stays `idle` after `playing`
**Cause:** FFmpeg not available, stream format unsupported  
**Fix:** Add FFmpeg buildpack (step 1), verify dependency report (step 4)

### Issue: `Connection failed to become ready`
**Cause:** opus/libsodium not loaded, encryption handshake failed  
**Fix:** Check `@discordjs/opus` installed, consider libsodium buildpack

### Issue: Stream URL returns 403/401
**Cause:** Zeno.fm token expired in URL (has `exp` field in JWT)  
**Fix:** Regenerate stream URL from Zeno.fm dashboard

## Testing with Alternative Stream
If Zeno.fm URL has issues, test with public radio:
```javascript
// In lofi.js / lofiReconnect.js, temporarily replace:
const STREAM_URL = 'https://icecast.omroep.nl/radio1-bb-mp3';
```

If alternative stream works, issue is specific to Zeno.fm (token/format/firewall).

## Diagnostic Commands
```powershell
# Check FFmpeg installation
heroku run which ffmpeg -a bytebot-app

# Check opus library
heroku run node -e "try { require('@discordjs/opus'); console.log('opus OK'); } catch(e) { console.log('opus MISSING'); }" -a bytebot-app

# Full dependency report
heroku run node -e "console.log(require('@discordjs/voice').generateDependencyReport())" -a bytebot-app

# Check Node version
heroku run node -v -a bytebot-app

# Check environment
heroku config -a bytebot-app
```

## Expected Log Pattern (Working)
```
🎧 [Lofi] Starting lofi stream setup...
🔎 [Lofi] HEAD status: 200
📦 [Lofi] Voice dependencies:
- @discordjs/opus: yes
- prism-media: yes  
- ffmpeg: yes
🔌 [Voice] Signalling -> Connecting
🔌 [Voice] Connecting -> Ready
✅ [Voice] Connection ready.
🔄 [LofiPlayer] idle -> buffering
🔄 [LofiPlayer] buffering -> playing
✅ [Lofi] Playback initialized and reply sent.
```

## References
- FFmpeg buildpack: https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest
- Discord.js Voice Guide: https://discordjs.guide/voice/
- Prisma Heroku Deploy: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-heroku
