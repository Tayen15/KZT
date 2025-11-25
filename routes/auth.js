const express = require('express');
const router = express.Router();
const passport = require('../middleware/passport');

// Login route
router.get('/login', passport.authenticate('discord'));

// Callback route with detailed error logging
router.get('/callback', (req, res, next) => {
    passport.authenticate('discord', (err, user, info) => {
        if (err) {
            console.error('❌ [Auth] OAuth Error object:', err);
            console.error('   message:', err.message);
            console.error('   type:', err.name);
            console.error('   query.code:', req.query.code);
            console.error('   callbackURL (env):', process.env.DISCORD_CALLBACK_URL);
            console.error('   clientID (env):', process.env.DISCORD_CLIENT_ID);
            // info may contain additional details
            if (info) console.error('   info:', info);
            return res.status(500).render('error', {
                title: 'Authentication Error',
                message: 'Discord OAuth failed. Check console logs for details.',
                isAuthenticated: false,
                user: null
            });
        }
        if (!user) {
            console.error('⚠️ [Auth] No user returned. Info:', info);
            return res.redirect('/');
        }
        req.logIn(user, (loginErr) => {
            if (loginErr) {
                console.error('❌ [Auth] Login session error:', loginErr.message);
                return res.status(500).render('error', {
                    title: 'Session Error',
                    message: 'Failed to establish session after OAuth.',
                    isAuthenticated: false,
                    user: null
                });
            }
            return res.redirect('/dashboard');
        });
    })(req, res, next);
});

// Error handler for auth failures
router.use((err, req, res, next) => {
    if (err.name === 'TokenError' || err.name === 'InternalOAuthError') {
        console.error('❌ [Auth] OAuth Error:', err.message);
        console.error('   Check Discord Developer Portal:');
        console.error('   1. Verify Redirect URI matches:', process.env.DISCORD_CALLBACK_URL);
        console.error('   2. Verify Client ID and Secret are correct');
        return res.status(500).render('error', {
            title: 'Authentication Error',
            message: 'Failed to authenticate with Discord. Please check your OAuth settings.',
            isAuthenticated: false,
            user: null
        });
    }
    next(err);
});

// Logout route
router.get('/logout', (req, res) => {
    req.logout(err => {
        if (err) {
            console.error('[Auth] Error logging out:', err);
            return res.redirect('/dashboard');
        }
        res.redirect('/');
    });
});

// Check auth status (API endpoint)
router.get('/status', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({
            authenticated: true,
            user: {
                id: req.user.discordId,
                username: req.user.username,
                avatar: req.user.avatar
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Session debug (helps diagnose redirect loops and cookie issues)
router.get('/session', (req, res) => {
    res.json({
        isAuthenticated: typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false,
        sessionID: req.sessionID || null,
        hasSession: !!req.session,
        cookieHeader: req.headers['cookie'] || null,
        callbackEnv: process.env.DISCORD_CALLBACK_URL,
        forwardedProto: req.headers['x-forwarded-proto'] || null,
        host: req.headers['host'] || null,
    });
});

module.exports = router;
