const express = require('express');
const router = express.Router();
const passport = require('../middleware/passport');

// Login route
router.get('/login', passport.authenticate('discord'));

// Callback route
router.get('/callback', 
    passport.authenticate('discord', {
        failureRedirect: '/',
    }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

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
