// Middleware to check if user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/login');
}

// Middleware to check if user is admin of a guild
async function ensureGuildAdmin(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/login');
    }

    const guildId = req.params.guildId;
    const user = req.user;

    // Check if user has admin access to this guild
    const guildMember = user.guilds.find(g => g.guild.guildId === guildId);

    if (!guildMember || !guildMember.isAdmin) {
        return res.status(403).render('error', {
            title: 'Access Denied',
            message: 'You do not have admin permissions for this server.'
        });
    }

    req.currentGuild = guildMember.guild;
    next();
}

// Middleware to check if user is bot owner
function ensureBotOwner(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/login');
    }

    const config = require('../config.json');
    if (req.user.discordId !== config.ownerId) {
        return res.status(403).render('error', {
            title: 'Access Denied',
            message: 'This page is only accessible to the bot owner.'
        });
    }

    next();
}

module.exports = {
    ensureAuthenticated,
    ensureGuildAdmin,
    ensureBotOwner
};
