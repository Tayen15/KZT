const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureGuildAdmin, ensureBotOwner } = require('../middleware/auth');
const prisma = require('../utils/database');
const config = require('../config.json');

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
        
        // Get user's guilds where they have admin access
        const adminGuilds = user.guilds.filter(g => g.isAdmin).map(g => g.guild);

        res.render('dashboard/index', {
            title: 'Dashboard',
            user,
            guilds: adminGuilds
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
router.get('/guild/:guildId', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
    try {
        const guildId = req.params.guildId;
        const guild = req.currentGuild;

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

        res.render('dashboard/guild', {
            title: `${guild.name} - Settings`,
            user: req.user,
            guild,
            settings
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
router.get('/guild/:guildId/prayer', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;

        let prayerTimes = await prisma.prayerTime.findFirst({
            where: { guildId: guild.id }
        });

        if (!prayerTimes) {
            prayerTimes = await prisma.prayerTime.create({
                data: { guildId: guild.id }
            });
        }

        res.render('dashboard/prayer', {
            title: `${guild.name} - Prayer Times`,
            user: req.user,
            guild,
            prayerTimes
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
router.get('/guild/:guildId/monitoring', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;

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

        res.render('dashboard/monitoring', {
            title: `${guild.name} - Server Monitoring`,
            user: req.user,
            guild,
            monitoring
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
router.get('/guild/:guildId/rules', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;

        let rulesConfig = await prisma.rule.findFirst({
            where: { guildId: guild.id }
        });

        // Parse rules from JSON or provide empty array
        const rules = rulesConfig && rulesConfig.rules ? 
            (Array.isArray(rulesConfig.rules) ? rulesConfig.rules : []) : 
            [];

        res.render('dashboard/rules', {
            title: `${guild.name} - Rules`,
            user: req.user,
            guild,
            rulesConfig,
            rules
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
