/**
 * Instagram Access Token Generator
 * 
 * Langkah-langkah:
 * 1. Dapatkan short-lived token via browser OAuth
 * 2. Exchange ke long-lived token (60 hari)
 * 3. Simpan token ke .env
 * 
 * Prerequisites:
 * - Facebook App dengan Instagram Graph API enabled
 * - Instagram Business/Creator account terhubung ke Facebook Page
 * - App ID dan App Secret sudah ada di .env
 */

const axios = require('axios');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const APP_ID = process.env.IG_APP_ID;
const APP_SECRET = process.env.IG_APP_SECRET;
const REDIRECT_URI = 'https://localhost/'; // Bisa pakai localhost, tidak perlu server

// Warna untuk console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(colors[color] + message + colors.reset);
}

async function question(prompt) {
    return new Promise((resolve) => {
        rl.question(colors.cyan + prompt + colors.reset, resolve);
    });
}

async function exchangeForLongLivedToken(shortToken) {
    try {
        log('\n🔄 Exchanging short-lived token untuk long-lived token...', 'yellow');
        
        const url = 'https://graph.facebook.com/v18.0/oauth/access_token';
        const params = {
            grant_type: 'fb_exchange_token',
            client_id: APP_ID,
            client_secret: APP_SECRET,
            fb_exchange_token: shortToken
        };

        const response = await axios.get(url, { params });
        const longLivedToken = response.data.access_token;
        const expiresIn = response.data.expires_in; // seconds

        log('✅ Long-lived token berhasil didapat!', 'green');
        log(`⏰ Valid untuk: ${Math.floor(expiresIn / 86400)} hari\n`, 'green');

        return longLivedToken;
    } catch (error) {
        log('❌ Error saat exchange token:', 'red');
        if (error.response) {
            log(JSON.stringify(error.response.data, null, 2), 'red');
        } else {
            log(error.message, 'red');
        }
        return null;
    }
}

async function getInstagramBusinessAccountId(token) {
    try {
        log('🔍 Mencari Instagram Business Account ID...', 'yellow');

        // Get Pages
        const pagesUrl = 'https://graph.facebook.com/v18.0/me/accounts';
        const pagesRes = await axios.get(pagesUrl, {
            params: { access_token: token }
        });

        if (!pagesRes.data.data || pagesRes.data.data.length === 0) {
            log('❌ Tidak ada Facebook Page terhubung', 'red');
            return null;
        }

        log(`📄 Ditemukan ${pagesRes.data.data.length} Facebook Page(s):\n`, 'green');

        for (let i = 0; i < pagesRes.data.data.length; i++) {
            const page = pagesRes.data.data[i];
            log(`${i + 1}. ${page.name} (ID: ${page.id})`, 'blue');

            // Check Instagram Business Account
            try {
                const igUrl = `https://graph.facebook.com/v18.0/${page.id}`;
                const igRes = await axios.get(igUrl, {
                    params: {
                        fields: 'instagram_business_account',
                        access_token: token
                    }
                });

                if (igRes.data.instagram_business_account) {
                    const igId = igRes.data.instagram_business_account.id;
                    log(`   └─ Instagram Business Account: ${igId}`, 'cyan');
                } else {
                    log(`   └─ Tidak ada IG Business Account terhubung`, 'yellow');
                }
            } catch (err) {
                // Skip jika error
            }
        }

        return pagesRes.data.data;
    } catch (error) {
        log('❌ Error mendapatkan account info:', 'red');
        if (error.response) {
            log(JSON.stringify(error.response.data, null, 2), 'red');
        } else {
            log(error.message, 'red');
        }
        return null;
    }
}

async function testToken(token) {
    try {
        log('\n🧪 Testing token...', 'yellow');
        
        const url = 'https://graph.facebook.com/v18.0/me';
        const response = await axios.get(url, {
            params: { access_token: token }
        });

        log('✅ Token valid!', 'green');
        log(`👤 User: ${response.data.name} (ID: ${response.data.id})\n`, 'green');
        
        return true;
    } catch (error) {
        log('❌ Token tidak valid!', 'red');
        if (error.response) {
            log(JSON.stringify(error.response.data, null, 2), 'red');
        }
        return false;
    }
}

async function main() {
    log('\n╔════════════════════════════════════════════════════════════╗', 'bright');
    log('║        Instagram Graph API - Token Generator              ║', 'bright');
    log('╚════════════════════════════════════════════════════════════╝\n', 'bright');

    // Validate env vars
    if (!APP_ID || !APP_SECRET || APP_ID === 'your_app_id_here') {
        log('❌ Error: IG_APP_ID dan IG_APP_SECRET harus diisi di .env', 'red');
        rl.close();
        return;
    }

    log('📋 App ID: ' + APP_ID, 'blue');
    log('📋 App Secret: ' + APP_SECRET.substring(0, 8) + '...\n', 'blue');

    // Step 1: Generate OAuth URL
    log('═══ STEP 1: Dapatkan Short-lived Token ═══\n', 'bright');
    
    const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${APP_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&scope=pages_show_list` +
        `&response_type=token`;

    log('🌐 Buka URL ini di browser (login dengan akun Facebook yang terhubung ke IG Business):\n', 'yellow');
    log(oauthUrl + '\n', 'cyan');
    log('📝 Instruksi:', 'yellow');
    log('   1. Login dengan Facebook account', 'reset');
    log('   2. Authorize aplikasi', 'reset');
    log('   3. Setelah redirect, URL akan seperti ini:', 'reset');
    log('      https://localhost/#access_token=EAAJ...&expires_in=...', 'blue');
    log('   4. Copy HANYA bagian token (setelah access_token= sampai sebelum &)\n', 'reset');

    const shortToken = await question('🔑 Paste short-lived token di sini: ');

    if (!shortToken || shortToken.trim() === '') {
        log('❌ Token tidak boleh kosong', 'red');
        rl.close();
        return;
    }

    // Test short token
    const isValid = await testToken(shortToken.trim());
    if (!isValid) {
        rl.close();
        return;
    }

    // Step 2: Exchange for long-lived token
    log('\n═══ STEP 2: Exchange ke Long-lived Token ═══\n', 'bright');
    
    const longToken = await exchangeForLongLivedToken(shortToken.trim());
    if (!longToken) {
        rl.close();
        return;
    }

    // Step 3: Get Instagram Business Account info
    log('═══ STEP 3: Verify Instagram Business Account ═══\n', 'bright');
    
    await getInstagramBusinessAccountId(longToken);

    // Step 4: Show result
    log('\n═══ HASIL ═══\n', 'bright');
    log('✅ Long-lived Access Token berhasil didapat!\n', 'green');
    log('📋 Copy token ini ke .env file (IG_ACCESS_TOKEN):\n', 'yellow');
    log('─'.repeat(80), 'blue');
    log(longToken, 'cyan');
    log('─'.repeat(80) + '\n', 'blue');

    log('⚠️  PENTING:', 'yellow');
    log('   - Token ini valid untuk ~60 hari', 'reset');
    log('   - Simpan token dengan aman, jangan commit ke Git', 'reset');
    log('   - Set reminder untuk refresh token sebelum expire', 'reset');
    log('   - Bisa pakai script ini lagi untuk refresh token\n', 'reset');

    log('📝 Update .env file:', 'yellow');
    log(`   IG_ACCESS_TOKEN=${longToken}\n`, 'cyan');

    log('🚀 Setelah update .env, restart bot untuk apply changes\n', 'green');

    rl.close();
}

// Handle Ctrl+C
rl.on('SIGINT', () => {
    log('\n\n👋 Dibatalkan oleh user\n', 'yellow');
    process.exit(0);
});

main().catch(error => {
    console.error('❌ Unexpected error:', error);
    rl.close();
    process.exit(1);
});
