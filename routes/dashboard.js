const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureGuildAdmin, ensureBotOwner, ensureBotInGuild } = require('../middleware/auth');
const prisma = require('../utils/database');

// TEST ROUTE - FOR DEVELOPMENT DEBUGGING ONLY
if (process.env.NODE_ENV === 'development') {
    router.get('/test/prayer/:guildId', async (req, res) => {
        try {
            const guildId = req.params.guildId;
            
            const guild = await prisma.guild.findUnique({
                where: { id: guildId }
            });
            
            if (!guild) {
                return res.status(404).json({ error: 'Guild not found' });
            }

            let prayerConfig = await prisma.prayerTime.findFirst({
                where: { guildId: guild.id }
            });

            if (!prayerConfig) {
                prayerConfig = await prisma.prayerTime.create({
                    data: { guildId: guild.id }
                });
            }

            res.json({
                success: true,
                guild: {
                    id: guild.id,
                    guildId: guild.guildId,
                    name: guild.name
                },
                prayerConfig
            });
        } catch (error) {
            console.error('[Test Route] Error:', error);
            res.status(500).json({ 
                error: error.message,
                stack: error.stack
            });
        }
    });
}

// Owner Dashboard - only accessible by bot owner
router.get('/owner', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        const client = req.discordClient;
        
        if (!client) {
            return res.status(503).render('error', {
                title: 'Bot Offline',
                message: 'The bot is currently offline or not connected.'
            });
        }

        // Get all guilds the bot is in
        const allGuilds = Array.from(client.guilds.cache.values()).map(guild => ({
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            memberCount: guild.memberCount,
            channels: guild.channels.cache
        }));

        // Bot statistics
        const botStats = {
            status: client.ws.status === 0 ? 'ONLINE' : 'OFFLINE',
            uptime: formatUptime(client.uptime),
            guilds: client.guilds.cache.size,
            users: client.users.cache.size,
            commands: client.commands?.size || 0,
            ping: Math.round(client.ws.ping)
        };

        // Database statistics
        const dbStats = {
            guilds: await prisma.guild.count(),
            users: await prisma.user.count()
        };

        // System information
        const systemInfo = {
            nodeVersion: process.version,
            discordVersion: require('discord.js').version,
            memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB / ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
            platform: `${process.platform} ${process.arch}`
        };

        // Command categories
        const commandCategories = [
            {
                name: 'Development',
                emoji: '🔧',
                count: 4,
                commands: ['announce', 'dm', 'reload', 'sendmessage']
            },
            {
                name: 'Information',
                emoji: 'ℹ️',
                count: 6,
                commands: ['help', 'ping', 'serverinfo', 'stats', 'test', 'userinfo']
            },
            {
                name: 'Moderation',
                emoji: '🛡️',
                count: 3,
                commands: ['ban', 'kick', 'clear']
            },
            {
                name: 'Music',
                emoji: '🎵',
                count: 3,
                commands: ['lofi', 'stoplofi', 'lyrics']
            },
            {
                name: 'Minecraft',
                emoji: '🎮',
                count: 1,
                commands: ['mcstatus']
            }
        ];

        res.render('dashboard/owner', {
            title: 'Owner Dashboard - ByteBot',
            user: req.user,
            allGuilds,
            botStats,
            dbStats,
            systemInfo,
            commandCategories
        });
    } catch (error) {
        console.error('[Dashboard] Error loading owner dashboard:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load owner dashboard'
        });
    }
});

// Owner Servers List - View all servers with ByteBot
router.get('/owner/servers', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        res.render('dashboard/servers', {
            title: 'All Servers - ByteBot',
            user: req.user
        });
    } catch (error) {
        console.error('[Dashboard] Error loading servers page:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load servers page'
        });
    }
});

// Owner Server Detail - View specific server info and members
router.get('/owner/servers/:guildId', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        const { guildId } = req.params;
        
        res.render('dashboard/server-detail', {
            title: 'Server Details - ByteBot',
            user: req.user,
            guildId
        });
    } catch (error) {
        console.error('[Dashboard] Error loading server detail page:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load server detail page'
        });
    }
});

// Owner Logs - View bot activity logs
router.get('/owner/logs', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        
        // Get log files from logs directory
        const logsDir = path.join(__dirname, '../logs');
        let logFiles = [];
        
        if (fs.existsSync(logsDir)) {
            logFiles = fs.readdirSync(logsDir)
                .filter(file => file.endsWith('.log'))
                .map(file => ({
                    name: file,
                    path: path.join(logsDir, file),
                    size: fs.statSync(path.join(logsDir, file)).size,
                    modified: fs.statSync(path.join(logsDir, file)).mtime
                }))
                .sort((a, b) => b.modified - a.modified);
        }
        
        res.render('dashboard/logs', {
            title: 'Bot Logs - ByteBot',
            user: req.user,
            logFiles
        });
    } catch (error) {
        console.error('[Dashboard] Error loading logs page:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load logs page'
        });
    }
});

// Owner Stats - Detailed bot statistics
router.get('/owner/stats', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        const client = req.discordClient;
        
        if (!client) {
            return res.status(503).render('error', {
                title: 'Bot Offline',
                message: 'The bot is currently offline or not connected.'
            });
        }

        // Gather comprehensive statistics
        const stats = {
            guilds: client.guilds.cache.size,
            users: client.users.cache.size,
            channels: client.channels.cache.size,
            commands: client.commands?.size || 0,
            uptime: client.uptime,
            ping: Math.round(client.ws.ping)
        };

        // Database stats
        const dbStats = {
            guilds: await prisma.guild.count(),
            users: await prisma.user.count(),
            prayerConfigs: await prisma.prayerTime.count(),
            monitoringConfigs: await prisma.serverMonitoring.count()
        };

        res.render('dashboard/stats', {
            title: 'Bot Statistics - ByteBot',
            user: req.user,
            stats,
            dbStats
        });
    } catch (error) {
        console.error('[Dashboard] Error loading stats page:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load stats page'
        });
    }
});

// Helper function to format uptime
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

// Dashboard home - shows user's guilds
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const user = req.user;
        const client = req.discordClient;
        
        // Get user's guilds where they have admin access
        const adminGuilds = user.guilds.filter(g => g.isAdmin).map(g => {
            const guild = g.guild;
            
            // Check if bot is in this guild
            let botInGuild = false;
            if (client && client.guilds) {
                const discordGuild = client.guilds.cache.get(guild.guildId);
                if (discordGuild) {
                    botInGuild = true;
                    guild.memberCount = discordGuild.memberCount;
                    guild.icon = discordGuild.icon;
                }
            }
            
            guild.botInGuild = botInGuild;
            return guild;
        });

        res.render('dashboard/index', {
            title: 'Dashboard',
            user,
            guilds: adminGuilds,
            clientId: process.env.DISCORD_CLIENT_ID
        });
    } catch (error) {
        console.error('[Dashboard] Error loading dashboard:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load dashboard'
        });
    }
});

// Guild dashboard - specific guild settings
router.get('/guild/:guildId', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const guildId = req.params.guildId;
        const guild = req.currentGuild;
        const client = req.discordClient;

        // Get guild settings
        let settings = await prisma.guildSettings.findUnique({
            where: { guildId: guild.id }
        });

        // Create default settings if not exists
        if (!settings) {
            settings = await prisma.guildSettings.create({
                data: {
                    guildId: guild.id
                }
            });
        }

        // Get user's admin guilds for server switcher dropdown
        const adminGuilds = req.user.guilds.filter(g => g.isAdmin).map(g => {
            const guildData = g.guild;
            
            // Check if bot is in this guild
            let botInGuild = false;
            if (client && client.guilds) {
                const discordGuild = client.guilds.cache.get(guildData.guildId);
                if (discordGuild) {
                    botInGuild = true;
                    guildData.icon = discordGuild.icon;
                }
            }
            
            guildData.botInGuild = botInGuild;
            return guildData;
        });

        res.render('dashboard/guild', {
            title: `${guild.name} - Settings`,
            user: req.user,
            guild,
            settings,
            guilds: adminGuilds
        });
    } catch (error) {
        console.error('[Dashboard] Error loading guild settings:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load guild settings'
        });
    }
});

// Prayer times management
router.get('/guild/:guildId/prayer', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;
        const client = req.discordClient;

        let prayerTimes = await prisma.prayerTime.findFirst({
            where: { guildId: guild.id }
        });

        if (!prayerTimes) {
            prayerTimes = await prisma.prayerTime.create({
                data: { guildId: guild.id }
            });
        }

        // Get user's admin guilds for server switcher dropdown
        const adminGuilds = req.user.guilds.filter(g => g.isAdmin).map(g => {
            const guildData = g.guild;
            let botInGuild = false;
            if (client && client.guilds) {
                const discordGuild = client.guilds.cache.get(guildData.guildId);
                if (discordGuild) {
                    botInGuild = true;
                    guildData.icon = discordGuild.icon;
                }
            }
            guildData.botInGuild = botInGuild;
            return guildData;
        });

        res.render('dashboard/prayer', {
            title: `${guild.name} - Prayer Times`,
            user: req.user,
            guild,
            prayerTimes,
            guilds: adminGuilds
        });
    } catch (error) {
        console.error('[Dashboard] Error loading prayer settings:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load prayer settings'
        });
    }
});

// Server monitoring management
router.get('/guild/:guildId/monitoring', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;
        const client = req.discordClient;

        let monitoring = await prisma.serverMonitoring.findFirst({
            where: { guildId: guild.id }
        });

        if (!monitoring) {
            monitoring = await prisma.serverMonitoring.create({
                data: { 
                    guildId: guild.id,
                    type: 'uptime' // default type
                }
            });
        }

        // Get user's admin guilds for server switcher dropdown
        const adminGuilds = req.user.guilds.filter(g => g.isAdmin).map(g => {
            const guildData = g.guild;
            let botInGuild = false;
            if (client && client.guilds) {
                const discordGuild = client.guilds.cache.get(guildData.guildId);
                if (discordGuild) {
                    botInGuild = true;
                    guildData.icon = discordGuild.icon;
                }
            }
            guildData.botInGuild = botInGuild;
            return guildData;
        });

        res.render('dashboard/monitoring', {
            title: `${guild.name} - Server Monitoring`,
            user: req.user,
            guild,
            monitoring,
            guilds: adminGuilds
        });
    } catch (error) {
        console.error('[Dashboard] Error loading monitoring settings:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load monitoring settings'
        });
    }
});

// Rules management
router.get('/guild/:guildId/rules', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;
        const client = req.discordClient;

        let rulesConfig = await prisma.rule.findFirst({
            where: { guildId: guild.id }
        });

        // Parse rules from JSON or provide empty array
        const rules = rulesConfig && rulesConfig.rules ? 
            (Array.isArray(rulesConfig.rules) ? rulesConfig.rules : []) : 
            [];

        // Get user's admin guilds for server switcher dropdown
        const adminGuilds = req.user.guilds.filter(g => g.isAdmin).map(g => {
            const guildData = g.guild;
            let botInGuild = false;
            if (client && client.guilds) {
                const discordGuild = client.guilds.cache.get(guildData.guildId);
                if (discordGuild) {
                    botInGuild = true;
                    guildData.icon = discordGuild.icon;
                }
            }
            guildData.botInGuild = botInGuild;
            return guildData;
        });

        res.render('dashboard/rules', {
            title: `${guild.name} - Rules`,
            user: req.user,
            guild,
            rulesConfig,
            rules,
            guilds: adminGuilds
        });
    } catch (error) {
        console.error('[Dashboard] Error loading rules:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load rules'
        });
    }
});

module.exports = router;
