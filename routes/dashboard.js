const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureGuildAdmin, ensureBotOwner, ensureBotInGuild } = require('../middleware/auth');
const { checkFeature } = require('../middleware/featureToggle');
const prisma = require('../utils/database');

// Helper function to get feature toggle states
async function getFeatureStates() {
    try {
        const features = await prisma.featureToggle.findMany();
        const featureStates = {};
        features.forEach(feature => {
            featureStates[feature.featureKey] = feature.enabled;
        });
        return featureStates;
    } catch (error) {
        console.error('❌ Error fetching feature states:', error);
        return {}; // Return empty object on error (all features enabled by default)
    }
}

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

        // Get feature toggle states for UI
        const featureStates = await getFeatureStates();

        res.render('dashboard/guild', {
            title: `${guild.name} - Settings`,
            user: req.user,
            guild,
            settings,
            guilds: adminGuilds,
            featureStates
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
router.get('/guild/:guildId/prayer', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, checkFeature('prayer_times'), async (req, res) => {
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

        // Get Discord guild data for channels
        const discordGuild = client?.guilds?.cache.get(guild.guildId);
        let channels = [];

        if (discordGuild) {
            // Get text channels only (type 0 = GUILD_TEXT)
            channels = discordGuild.channels.cache
                .filter(ch => ch.type === 0)
                .map(ch => ({ id: ch.id, name: ch.name, position: ch.position }))
                .sort((a, b) => a.position - b.position);
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

        // Get feature toggle states for sidebar
        const featureStates = await getFeatureStates();

        res.render('dashboard/prayer', {
            title: `${guild.name} - Prayer Times`,
            user: req.user,
            guild,
            prayerTimes,
            channels,
            guilds: adminGuilds,
            featureStates
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
router.get('/guild/:guildId/monitoring', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, checkFeature('server_monitoring'), async (req, res) => {
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

        // Get feature toggle states for sidebar
        const featureStates = await getFeatureStates();

        res.render('dashboard/monitoring', {
            title: `${guild.name} - Server Monitoring`,
            user: req.user,
            guild,
            monitoring,
            guilds: adminGuilds,
            featureStates
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
router.get('/guild/:guildId/rules', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, checkFeature('rules_management'), async (req, res) => {
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

        // Get feature toggle states for sidebar
        const featureStates = await getFeatureStates();

        res.render('dashboard/rules', {
            title: `${guild.name} - Rules`,
            user: req.user,
            guild,
            rulesConfig,
            rules,
            guilds: adminGuilds,
            featureStates
        });
    } catch (error) {
        console.error('[Dashboard] Error loading rules:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load rules'
        });
    }
});

// Welcome message management (advanced)
router.get('/guild/:guildId/welcome', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, checkFeature('welcome_message'), async (req, res) => {
    try {
        const guild = req.currentGuild;
        const client = req.discordClient;

        let welcome = await prisma.welcomeConfig.findFirst({
            where: { guildId: guild.id }
        });

        if (!welcome) {
            welcome = await prisma.welcomeConfig.create({
                data: { guildId: guild.id }
            });
        }

        // Get Discord guild data for channels and roles
        const discordGuild = client?.guilds?.cache.get(guild.guildId);
        let channels = [];
        let roles = [];

        if (discordGuild) {
            // Get text channels only (type 0 = GUILD_TEXT)
            channels = discordGuild.channels.cache
                .filter(ch => ch.type === 0)
                .map(ch => ({ id: ch.id, name: ch.name, position: ch.position }))
                .sort((a, b) => a.position - b.position);

            // Get roles (exclude @everyone)
            roles = discordGuild.roles.cache
                .filter(role => role.id !== guild.guildId)
                .map(role => ({ id: role.id, name: role.name, color: role.hexColor, position: role.position }))
                .sort((a, b) => b.position - a.position);
        }

        // Build admin guilds for sidebar dropdown
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

        // Get feature toggle states for sidebar
        const featureStates = await getFeatureStates();

        res.render('dashboard/welcome', {
            title: `${guild.name} - Welcome Messages`,
            user: req.user,
            guild,
            welcome,
            channels,
            roles,
            guilds: adminGuilds,
            featureStates
        });
    } catch (error) {
        console.error('❌ Error loading welcome page:', error);
        res.status(500).render('error', { title: 'Error', message: 'Failed to load welcome settings', isAuthenticated: !!req.user });
    }
});

// Social Alert Dashboard
router.get('/guild/:guildId/social-alert', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, checkFeature('social_alerts'), async (req, res) => {
    try {
        const { guildId } = req.params;
        const client = req.discordClient;

        const guild = await prisma.guild.findUnique({
            where: { guildId }
        });

        if (!guild) {
            return res.status(404).render('error', { 
                title: 'Guild Not Found', 
                message: 'Guild not found in database',
                isAuthenticated: true
            });
        }

        // Get or create social alerts
        let alerts = await prisma.socialAlert.findMany({
            where: { guildId: guild.id },
            orderBy: { createdAt: 'desc' }
        });

        // Get Discord guild data
        const discordGuild = client?.guilds?.cache.get(guild.guildId);
        let channels = [];
        let roles = [];

        if (discordGuild) {
            // Get text channels
            channels = discordGuild.channels.cache
                .filter(ch => ch.type === 0)
                .map(ch => ({
                    id: ch.id,
                    name: ch.name,
                    position: ch.position
                }))
                .sort((a, b) => a.position - b.position);

            // Get roles
            roles = discordGuild.roles.cache
                .filter(role => role.id !== discordGuild.id && !role.managed)
                .map(role => ({
                    id: role.id,
                    name: role.name,
                    color: role.hexColor,
                    position: role.position
                }))
                .sort((a, b) => b.position - a.position);
        }

        const adminGuilds = req.session.adminGuilds?.map(g => ({
            guildId: g.guildId,
            name: g.name,
            icon: g.icon
        })) || [];

        // Get feature toggle states for sidebar
        const featureStates = await getFeatureStates();

        res.render('dashboard/social-alert', {
            title: `${guild.name} - Social Alerts`,
            user: req.user,
            guild,
            alerts,
            channels,
            roles,
            guilds: adminGuilds,
            featureStates
        });
    } catch (error) {
        console.error('❌ Error loading social alert page:', error);
        res.status(500).render('error', { 
            title: 'Error', 
            message: 'Failed to load social alert settings',
            isAuthenticated: !!req.user 
        });
    }
});

// Feature Toggle Management - Owner only
router.get('/owner/features', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        // Get all feature toggles
        let features = await prisma.featureToggle.findMany({
            orderBy: [
                { category: 'asc' },
                { name: 'asc' }
            ]
        });

        // If no features exist, initialize default features
        if (features.length === 0) {
            const defaultFeatures = [
                // Dashboard Features
                { featureKey: 'prayer_times', enabled: true, name: 'Prayer Times', description: 'Islamic prayer time notifications with automatic reminders', category: 'dashboard', icon: '🕌' },
                { featureKey: 'welcome_message', enabled: true, name: 'Welcome Message', description: 'Customizable welcome messages with canvas image generator', category: 'dashboard', icon: '👋' },
                { featureKey: 'social_alerts', enabled: true, name: 'Social Alerts', description: 'Monitor YouTube, Twitch, Twitter, Instagram for new content', category: 'dashboard', icon: '🔔' },
                { featureKey: 'server_monitoring', enabled: true, name: 'Server Monitoring', description: 'Minecraft server status monitoring with auto-updates', category: 'dashboard', icon: '🖥️' },
                { featureKey: 'rules_management', enabled: true, name: 'Rules Management', description: 'Server rules with embed display and management', category: 'dashboard', icon: '📜' },
                
                // Bot Features
                { featureKey: 'music_commands', enabled: true, name: 'Music Commands', description: 'Lofi music streaming and playlist management', category: 'bot', icon: '🎵' },
                { featureKey: 'moderation_commands', enabled: true, name: 'Moderation', description: 'Kick, ban, clear messages, and moderation tools', category: 'bot', icon: '🛡️' },
                { featureKey: 'info_commands', enabled: true, name: 'Info Commands', description: 'Server info, user info, bot stats commands', category: 'bot', icon: 'ℹ️' },
                
                // Integrations
                { featureKey: 'discord_oauth', enabled: true, name: 'Discord OAuth', description: 'Dashboard login via Discord authentication', category: 'integration', icon: '🔐' },
                { featureKey: 'api_endpoints', enabled: true, name: 'API Endpoints', description: 'RESTful API for dashboard features', category: 'integration', icon: '🔌' }
            ];

            for (const feature of defaultFeatures) {
                await prisma.featureToggle.create({ data: feature });
            }

            features = await prisma.featureToggle.findMany({
                orderBy: [
                    { category: 'asc' },
                    { name: 'asc' }
                ]
            });
        }

        // Group by category
        const featuresByCategory = features.reduce((acc, feature) => {
            if (!acc[feature.category]) {
                acc[feature.category] = [];
            }
            acc[feature.category].push(feature);
            return acc;
        }, {});

        res.render('dashboard/features', {
            title: 'Feature Toggles',
            user: req.user,
            guilds: req.adminGuilds,
            features,
            featuresByCategory,
            categories: {
                dashboard: { name: 'Dashboard Features', icon: '🖥️' },
                bot: { name: 'Bot Commands', icon: '🤖' },
                integration: { name: 'Integrations', icon: '🔗' }
            }
        });
    } catch (error) {
        console.error('❌ Error loading features:', error);
        res.status(500).render('error', {
            user: req.user,
            guilds: req.adminGuilds || [],
            error: {
                title: 'Error Loading Features',
                message: error.message,
                code: 500
            }
        });
    }
});

module.exports = router;
