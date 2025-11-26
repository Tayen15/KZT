// Middleware to check if user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/login');
}

// Middleware to check if bot is in the guild
async function ensureBotInGuild(req, res, next) {
    const guildId = req.params.guildId;
    const client = req.discordClient;

    if (!client) {
        return res.status(503).json({ 
            success: false, 
            error: 'Bot is currently offline' 
        });
    }

    // Check if bot is in the guild
    const botGuild = client.guilds.cache.get(guildId);
    
    if (!botGuild) {
        // Bot not in guild - redirect to invite URL
        const clientId = process.env.DISCORD_CLIENT_ID;
        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands&guild_id=${guildId}&disable_guild_select=true`;
        
        return res.redirect(inviteUrl);
    }

    next();
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

    const cfg = (() => { try { return require('../config.json'); } catch { return {}; } })();
    const OWNER_ID = process.env.OWNER_ID || cfg.ownerId;
    if (req.user.discordId !== OWNER_ID) {
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
    ensureBotOwner,
    ensureBotInGuild
};
