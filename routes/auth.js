const express = require('express');
const router = express.Router();
const passport = require('../middleware/passport');

// Login route
router.get('/login', passport.authenticate('discord'));

// Callback route (production-level logging)
router.get('/callback', (req, res, next) => {
    passport.authenticate('discord', (err, user) => {
        if (err) {
            console.error('[Auth] OAuth error:', err.message);
            return res.redirect('/');
        }
        if (!user) return res.redirect('/');
        req.logIn(user, (loginErr) => {
            if (loginErr) {
                console.error('[Auth] Login error:', loginErr.message);
                return res.redirect('/');
            }
            return res.redirect('/dashboard');
        });
    })(req, res, next);
});

// (removed) verbose error handler used during debugging

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

// (removed) /auth/session debug endpoint

module.exports = router;
