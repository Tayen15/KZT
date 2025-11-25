const express = require('express');
const router = express.Router();
const passport = require('../middleware/passport');

// Login route
router.get('/login', passport.authenticate('discord'));

// Callback route
router.get('/callback', 
    passport.authenticate('discord', {
        failureRedirect: '/',
        failureMessage: true
    }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

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

module.exports = router;
