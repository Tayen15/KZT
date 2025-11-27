const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureGuildAdmin, ensureBotOwner, ensureBotInGuild } = require('../middleware/auth');
const prisma = require('../utils/database');
const { toggleCommand, getAllCommandToggles } = require('../middleware/commandToggle');
const { ActivityType } = require('discord.js');

// ===== Owner API =====

// Send announcement to all guilds or specific guild
router.post('/owner/announce', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        const { target, message, channelId } = req.body;
        const client = req.discordClient;

        if (!client) {
            return res.status(503).json({ success: false, error: 'Bot is not connected' });
        }

        let sentCount = 0;
        let failedGuilds = [];
        const guilds = target === 'all'
            ? Array.from(client.guilds.cache.values())
            : [client.guilds.cache.get(target)];

        for (const guild of guilds) {
            if (!guild) continue;

            let channel = null;

            // If specific channelId provided, try to use it
            if (channelId && target !== 'all') {
                channel = guild.channels.cache.get(channelId);

                // Validate channel exists and bot has permission
                if (channel && channel.type === 0) {
                    const permissions = channel.permissionsFor(guild.members.me);
                    if (!permissions || !permissions.has('SendMessages')) {
                        failedGuilds.push({
                            name: guild.name,
                            reason: 'No permission to send messages in selected channel'
                        });
                        continue;
                    }
                } else {
                    failedGuilds.push({
                        name: guild.name,
                        reason: 'Channel not found or not a text channel'
                    });
                    continue;
                }
            } else {
                // Auto-find a suitable channel (original behavior)
                channel = guild.channels.cache.find(
                    c => c.type === 0 && c.permissionsFor(guild.members.me).has('SendMessages')
                );
            }

            if (channel) {
                try {
                    await channel.send({
                        embeds: [{
                            title: '📢 Announcement from ByteBot Owner',
                            description: message,
                            color: 0x5865F2,
                            timestamp: new Date(),
                            footer: {
                                text: 'ByteBot Announcement System'
                            }
                        }]
                    });
                    sentCount++;
                } catch (error) {
                    failedGuilds.push({
                        name: guild.name,
                        reason: error.message
                    });
                }
            } else {
                failedGuilds.push({
                    name: guild.name,
                    reason: 'No suitable channel found'
                });
            }
        }

        res.json({
            success: true,
            message: `Announcement sent to ${sentCount} server(s)`,
            sentCount,
            failedCount: failedGuilds.length,
            failedGuilds: failedGuilds.length > 0 ? failedGuilds : undefined
        });
    } catch (error) {
        console.error('[API] Error sending announcement:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reload bot commands
router.post('/owner/reload', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        const client = req.discordClient;

        if (!client) {
            return res.status(503).json({ success: false, error: 'Bot is not connected' });
        }

        // Clear existing commands
        client.commands.clear();

        // Reload slash command handler
        require('../handlers/slashCommandHandler')(client);

        res.json({
            success: true,
            message: 'Commands reloaded successfully',
            count: client.commands.size
        });
    } catch (error) {
        console.error('[API] Error reloading commands:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Leave a guild
router.post('/owner/leave/:guildId', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        const { guildId } = req.params;
        const client = req.discordClient;

        if (!client) {
            return res.status(503).json({ success: false, error: 'Bot is not connected' });
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ success: false, error: 'Guild not found' });
        }

        const guildName = guild.name;
        await guild.leave();

        res.json({
            success: true,
            message: `Left ${guildName} successfully`
        });
    } catch (error) {
        console.error('[API] Error leaving guild:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all command toggles
router.get('/owner/commands', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        const client = req.discordClient;
        if (!client) {
            return res.status(503).json({ success: false, error: 'Bot is not connected' });
        }

        const toggles = await getAllCommandToggles();

        // Get all commands from client
        const allCommands = Array.from(client.commands.values()).map(cmd => ({
            name: cmd.name || cmd.data.name,
            category: cmd.category || 'other',
            description: cmd.data?.description || 'No description'
        }));

        // Merge with toggles
        const commandsWithStatus = allCommands.map(cmd => {
            const toggle = toggles.find(t => t.commandName === cmd.name);
            return {
                ...cmd,
                enabled: toggle ? toggle.enabled : true,
                reason: toggle ? toggle.reason : null
            };
        });

        res.json({ success: true, commands: commandsWithStatus });
    } catch (error) {
        console.error('[API] Error getting commands:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Toggle command
router.post('/owner/commands/:commandName/toggle', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        const { commandName } = req.params;
        const { enabled, reason } = req.body;
        const client = req.discordClient;

        if (!client) {
            return res.status(503).json({ success: false, error: 'Bot is not connected' });
        }

        const command = client.commands.get(commandName);
        if (!command) {
            return res.status(404).json({ success: false, error: 'Command not found' });
        }

        const category = command.category || 'other';
        await toggleCommand(commandName, enabled, category, reason);

        res.json({
            success: true,
            message: `Command ${commandName} ${enabled ? 'enabled' : 'disabled'}`
        });
    } catch (error) {
        console.error('[API] Error toggling command:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get bot settings
router.get('/owner/settings', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        let settings = await prisma.botSettings.findFirst();

        if (!settings) {
            settings = await prisma.botSettings.create({
                data: {
                    activityType: 'Watching',
                    activityText: 'over servers',
                    status: 'online'
                }
            });
        }

        res.json({ success: true, settings });
    } catch (error) {
        console.error('[API] Error getting bot settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update bot settings
router.post('/owner/settings', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        const { activityType, activityText, status, maintenanceMode, maintenanceMessage } = req.body;
        const client = req.discordClient;

        if (!client) {
            return res.status(503).json({ success: false, error: 'Bot is not connected' });
        }

        // Validate and sanitize inputs
        const validActivityType = activityType && typeof activityType === 'string' ? activityType : 'Playing';
        const validActivityText = activityText && typeof activityText === 'string' && activityText.trim() !== ''
            ? activityText.trim()
            : 'over servers';
        const validStatus = status && typeof status === 'string' ? status : 'online';

        // Update or create settings
        let settings = await prisma.botSettings.findFirst();

        if (settings) {
            settings = await prisma.botSettings.update({
                where: { id: settings.id },
                data: {
                    activityType: validActivityType,
                    activityText: validActivityText,
                    status: validStatus,
                    maintenanceMode,
                    maintenanceMessage
                }
            });
        } else {
            settings = await prisma.botSettings.create({
                data: {
                    activityType: validActivityType,
                    activityText: validActivityText,
                    status: validStatus,
                    maintenanceMode,
                    maintenanceMessage
                }
            });
        }

        // Update bot presence immediately
        const activityTypeMap = {
            'Playing': ActivityType.Playing,
            'Streaming': ActivityType.Streaming,
            'Listening': ActivityType.Listening,
            'Watching': ActivityType.Watching,
            'Custom': ActivityType.Custom,
            'Competing': ActivityType.Competing
        };
        const activityTypeEnum = activityTypeMap[validActivityType] || ActivityType.Playing;

        // Build activity object
        // NOTE: Discord.js ALWAYS requires 'name' property, even for Custom status
        // For Custom status, Discord.js will automatically convert 'name' to 'state'
        // See: discord.js/src/structures/ClientPresence.js lines 58-61
        const activity = {
            type: activityTypeEnum,
            name: validActivityText  // Always use 'name', Discord.js handles Custom conversion
        };

        client.user.setPresence({
            activities: [activity],
            status: validStatus
        });

        res.json({ success: true, settings, message: 'Bot settings updated' });
    } catch (error) {
        console.error('[API] Error updating bot settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get lofi sessions
router.get('/owner/lofi', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        const sessions = await prisma.lofiSession.findMany({
            where: { isActive: true },
            include: {
                guild: true
            }
        });

        res.json({ success: true, sessions });
    } catch (error) {
        console.error('[API] Error getting lofi sessions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get channels for a guild (Owner only)
router.get('/owner/guild/:guildId/channels', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        const { guildId } = req.params;
        const client = req.discordClient;

        if (!client) {
            return res.status(503).json({ success: false, error: 'Bot is not connected' });
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ success: false, error: 'Guild not found' });
        }

        // Get text channels where bot has permission to send messages
        const textChannels = Array.from(guild.channels.cache.values())
            .filter(channel => {
                if (channel.type !== 0) return false; // Only text channels
                const permissions = channel.permissionsFor(guild.members.me);
                return permissions && permissions.has('SendMessages');
            })
            .map(channel => ({
                id: channel.id,
                name: channel.name,
                position: channel.position
            }))
            .sort((a, b) => a.position - b.position);

        res.json({ success: true, channels: textChannels });
    } catch (error) {
        console.error('[API] Error getting guild channels:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== Guild Settings API =====

// Get guild info (member count, etc.)
router.get('/guild/:guildId/info', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const { guildId } = req.params;
        const client = req.discordClient;

        if (!client) {
            return res.status(503).json({ success: false, error: 'Bot is not connected' });
        }

        const discordGuild = client.guilds.cache.get(guildId);
        if (!discordGuild) {
            return res.status(404).json({ success: false, error: 'Guild not found' });
        }

        res.json({
            success: true,
            memberCount: discordGuild.memberCount,
            name: discordGuild.name,
            icon: discordGuild.icon
        });
    } catch (error) {
        console.error('[API] Error getting guild info:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get guild settings
router.get('/guild/:guildId/settings', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;
        let settings = await prisma.guildSettings.findUnique({
            where: { guildId: guild.id }
        });

        if (!settings) {
            settings = await prisma.guildSettings.create({
                data: { guildId: guild.id }
            });
        }

        res.json({ success: true, settings });
    } catch (error) {
        console.error('[API] Error getting guild settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update guild settings
router.post('/guild/:guildId/settings', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;
        const updates = req.body;

        const settings = await prisma.guildSettings.upsert({
            where: { guildId: guild.id },
            update: updates,
            create: {
                guildId: guild.id,
                ...updates
            }
        });

        res.json({ success: true, settings });
    } catch (error) {
        console.error('[API] Error updating guild settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== Prayer Times API =====

// Get prayer times config
router.get('/guild/:guildId/prayer', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;
        let prayerConfig = await prisma.prayerTime.findFirst({
            where: { guildId: guild.id }
        });

        if (!prayerConfig) {
            prayerConfig = await prisma.prayerTime.create({
                data: { guildId: guild.id }
            });
        }

        res.json({ success: true, prayerConfig });
    } catch (error) {
        console.error('[API] Error getting prayer config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update prayer times config
router.post('/guild/:guildId/prayer', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;
        const updates = req.body;

        // Get existing config to check if message needs to be deleted
        const existingConfig = await prisma.prayerTime.findFirst({
            where: { guildId: guild.id }
        });

        // Convert string booleans to actual booleans
        const data = {
            enabled: updates.enabled === 'true' || updates.enabled === true,
            city: updates.city,
            country: updates.country,
            channelId: updates.channelId || null,
            method: parseInt(updates.method) || 20,
            notifyFajr: updates.notifyFajr === 'true' || updates.notifyFajr === true,
            notifyDhuhr: updates.notifyDhuhr === 'true' || updates.notifyDhuhr === true,
            notifyAsr: updates.notifyAsr === 'true' || updates.notifyAsr === true,
            notifyMaghrib: updates.notifyMaghrib === 'true' || updates.notifyMaghrib === true,
            notifyIsha: updates.notifyIsha === 'true' || updates.notifyIsha === true,
            customMessage: updates.customMessage || null
        };

        // If disabling prayer times, delete the existing message
        if (!data.enabled && existingConfig?.lastMessageId && existingConfig?.channelId) {
            const client = req.app.get('discordClient');
            if (client) {
                try {
                    const channel = await client.channels.fetch(existingConfig.channelId).catch(() => null);
                    if (channel) {
                        const message = await channel.messages.fetch(existingConfig.lastMessageId).catch(() => null);
                        if (message) {
                            await message.delete();
                            console.log(`[Prayer] Deleted message ${existingConfig.lastMessageId} for guild ${guild.guildId}`);
                        }
                    }
                } catch (error) {
                    console.error('[Prayer] Error deleting message:', error);
                }
            }

            // Clear lastMessageId from database
            data.lastMessageId = null;

            // Stop monitoring
            const { stopPrayerMonitoring } = require('../handlers/prayerTime');
            stopPrayerMonitoring(guild.guildId);
        }

        const prayerConfig = await prisma.prayerTime.updateMany({
            where: { guildId: guild.id },
            data
        });

        if (prayerConfig.count === 0) {
            await prisma.prayerTime.create({
                data: {
                    guildId: guild.id,
                    ...data
                }
            });
        }

        // Trigger prayer monitoring update if enabled
        if (data.enabled && data.channelId) {
            const { startPrayerMonitoring } = require('../handlers/prayerTime');
            const client = req.app.get('discordClient');
            if (client) {
                await startPrayerMonitoring(client, guild.guildId);
            }
        }

        // Check if request is from form (redirect) or API (JSON)
        if (req.headers.accept && req.headers.accept.includes('text/html')) {
            // Form submission - redirect to dashboard
            return res.redirect(`/dashboard/guild/${guild.guildId}/prayer`);
        }

        // API request - return JSON
        res.json({ success: true, message: 'Prayer times updated successfully' });
    } catch (error) {
        console.error('[API] Error updating prayer config:', error);

        // Check if request is from form
        if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return res.redirect(`/dashboard/guild/${req.params.guildId}/prayer?error=update_failed`);
        }

        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== Server Monitoring API =====

// Get monitoring configs
router.get('/guild/:guildId/monitoring', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;
        const monitors = await prisma.serverMonitoring.findMany({
            where: { guildId: guild.id }
        });

        res.json({ success: true, monitors });
    } catch (error) {
        console.error('[API] Error getting monitors:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create or Update monitoring config
router.post('/guild/:guildId/monitoring', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;
        const body = req.body;

        // Check if monitoring config exists
        const existing = await prisma.serverMonitoring.findFirst({
            where: { guildId: guild.id }
        });

        // Convert string booleans to actual booleans and integers
        const data = {
            enabled: body.enabled === 'true' || body.enabled === true,
            type: body.type || 'minecraft',
            channelId: body.channelId || null,

            // Minecraft fields
            serverHost: body.serverHost || null,
            serverPort: parseInt(body.serverPort) || 25565,
            serverName: body.serverName || null,
            checkInterval: parseInt(body.checkInterval) || 5,

            // Notification settings
            notifyOnline: body.notifyOnline === 'true' || body.notifyOnline === true,
            notifyOffline: body.notifyOffline === 'true' || body.notifyOffline === true,
            notifyPlayerCount: body.notifyPlayerCount === 'true' || body.notifyPlayerCount === true,

            // Uptime/Pterodactyl fields
            uptimeApiKey: body.uptimeApiKey || null,
            pterodactylUrl: body.pterodactylUrl || null,
            pterodactylApiKey: body.pterodactylApiKey || null,
            serverId: body.serverId || null,
            updateInterval: parseInt(body.updateInterval) || 60000
        };

        // If disabling monitoring, delete the existing message
        if (!data.enabled && existing?.lastMessageId && existing?.channelId) {
            const client = req.app.get('discordClient');
            if (client) {
                try {
                    const channel = await client.channels.fetch(existing.channelId).catch(() => null);
                    if (channel) {
                        const message = await channel.messages.fetch(existing.lastMessageId).catch(() => null);
                        if (message) {
                            await message.delete();
                            console.log(`[Monitoring] Deleted message ${existing.lastMessageId} for guild ${guild.guildId}`);
                        }
                    }
                } catch (error) {
                    console.error('[Monitoring] Error deleting message:', error);
                }
            }

            // Clear lastMessageId from database
            data.lastMessageId = null;

            // Stop monitoring
            const { stopServerMonitoring } = require('../handlers/monitorServer');
            stopServerMonitoring(guild.guildId);
        }

        let monitor;
        if (existing) {
            // Update existing
            monitor = await prisma.serverMonitoring.update({
                where: { id: existing.id },
                data
            });
        } else {
            // Create new
            monitor = await prisma.serverMonitoring.create({
                data: {
                    guildId: guild.id,
                    ...data
                }
            });
        }

        // Trigger monitoring update if enabled
        if (data.enabled && data.channelId) {
            const { startServerMonitoring } = require('../handlers/monitorServer');
            const client = req.app.get('discordClient');
            if (client) {
                await startServerMonitoring(client, guild.guildId);
            }
        }

        // Check if request is from form (redirect) or API (JSON)
        if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return res.redirect(`/dashboard/guild/${guild.guildId}/monitoring`);
        }

        res.json({ success: true, monitor });
    } catch (error) {
        console.error('[API] Error saving monitor:', error);

        if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return res.redirect(`/dashboard/guild/${req.params.guildId}/monitoring?error=save_failed`);
        }

        res.status(500).json({ success: false, error: error.message });
    }
});

// Update monitoring config
router.put('/guild/:guildId/monitoring/:id', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;

        // Convert string booleans to actual booleans and integers
        const data = {
            enabled: body.enabled === 'true' || body.enabled === true,
            type: body.type,
            channelId: body.channelId || null,

            // Minecraft fields
            serverHost: body.serverHost || null,
            serverPort: body.serverPort ? parseInt(body.serverPort) : undefined,
            serverName: body.serverName || null,
            checkInterval: body.checkInterval ? parseInt(body.checkInterval) : undefined,

            // Notification settings
            notifyOnline: body.notifyOnline === 'true' || body.notifyOnline === true,
            notifyOffline: body.notifyOffline === 'true' || body.notifyOffline === true,
            notifyPlayerCount: body.notifyPlayerCount === 'true' || body.notifyPlayerCount === true,

            // Uptime/Pterodactyl fields
            uptimeApiKey: body.uptimeApiKey || undefined,
            pterodactylUrl: body.pterodactylUrl || undefined,
            pterodactylApiKey: body.pterodactylApiKey || undefined,
            serverId: body.serverId || undefined,
            updateInterval: body.updateInterval ? parseInt(body.updateInterval) : undefined
        };

        const monitor = await prisma.serverMonitoring.update({
            where: { id },
            data
        });

        res.json({ success: true, monitor });
    } catch (error) {
        console.error('[API] Error updating monitor:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete monitoring config
router.delete('/guild/:guildId/monitoring/:id', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.serverMonitoring.delete({
            where: { id }
        });

        res.json({ success: true, message: 'Monitor deleted successfully' });
    } catch (error) {
        console.error('[API] Error deleting monitor:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== Rules API =====

// Get rules
router.get('/guild/:guildId/rules', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;
        const rulesConfig = await prisma.rule.findFirst({
            where: { guildId: guild.id }
        });

        res.json({ success: true, rulesConfig });
    } catch (error) {
        console.error('[API] Error getting rules:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== Rules API =====

// Get rules config
router.get('/guild/:guildId/rules', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;
        const rulesConfig = await prisma.rule.findFirst({
            where: { guildId: guild.id }
        });

        res.json({
            success: true,
            rulesConfig,
            rules: rulesConfig?.rules || []
        });
    } catch (error) {
        console.error('[API] Error getting rules:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get individual rule
router.get('/guild/:guildId/rules/:ruleId', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;
        const { ruleId } = req.params;

        const rulesConfig = await prisma.rule.findFirst({
            where: { guildId: guild.id }
        });

        if (!rulesConfig) {
            return res.status(404).json({ success: false, error: 'Rules not found' });
        }

        const rules = Array.isArray(rulesConfig.rules) ? rulesConfig.rules : [];
        const rule = rules.find(r => r.id === ruleId);

        if (!rule) {
            return res.status(404).json({ success: false, error: 'Rule not found' });
        }

        res.json({ success: true, ...rule });
    } catch (error) {
        console.error('[API] Error getting rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create/Add new rule
router.post('/guild/:guildId/rules', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;
        const { title, description } = req.body;

        if (!title || !description) {
            return res.status(400).json({ success: false, error: 'Title and description are required' });
        }

        const existing = await prisma.rule.findFirst({
            where: { guildId: guild.id }
        });

        const newRule = {
            id: Date.now().toString(), // Simple ID generation
            title,
            description
        };

        let rulesConfig;
        if (existing) {
            const currentRules = Array.isArray(existing.rules) ? existing.rules : [];
            currentRules.push(newRule);

            rulesConfig = await prisma.rule.update({
                where: { id: existing.id },
                data: { rules: currentRules }
            });
        } else {
            rulesConfig = await prisma.rule.create({
                data: {
                    guildId: guild.id,
                    rules: [newRule]
                }
            });
        }

        res.json({ success: true, rule: newRule, rulesConfig });
    } catch (error) {
        console.error('[API] Error creating rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save Welcome Message Settings
router.post('/guild/:guildId/welcome', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;

        // Debug log to check req.body
        console.log('📝 Received welcome config update:', {
            hasBody: !!req.body,
            bodyKeys: req.body ? Object.keys(req.body) : [],
            contentType: req.headers['content-type']
        });

        // Ensure req.body exists
        if (!req.body || Object.keys(req.body).length === 0) {
            console.error('❌ req.body is empty or undefined');
            return res.status(400).json({
                success: false,
                error: 'No data received. Please check form submission.'
            });
        }

        const {
            enabled, channelId, message, embedTitle, embedDescription, embedColor, imageUrl, dmEnabled, autoRoleId,
            useCustomImage, layout, font, circleColor, titleColor, usernameColor, messageColor, overlayColor, bgImageUrl, bgColor, avatarShape, overlayOpacity
        } = req.body;

        await prisma.welcomeConfig.upsert({
            where: { guildId: guild.id },
            update: {
                enabled: enabled === 'true' || enabled === true,
                channelId: channelId || null,
                message: message || null,
                embedTitle: embedTitle || null,
                embedDescription: embedDescription || null,
                embedColor: embedColor || null,
                imageUrl: imageUrl || null,
                dmEnabled: dmEnabled === 'true' || dmEnabled === true,
                autoRoleId: autoRoleId || null,
                useCustomImage: useCustomImage === 'true' || useCustomImage === true,
                layout: layout || 'classic',
                font: font || 'Discord',
                circleColor: circleColor || null,
                titleColor: titleColor || null,
                usernameColor: usernameColor || null,
                messageColor: messageColor || null,
                overlayColor: overlayColor || null,
                bgImageUrl: bgImageUrl || null,
                bgColor: bgColor || null,
                avatarShape: avatarShape || 'circle',
                overlayOpacity: overlayOpacity ? parseInt(overlayOpacity) : 50,
            },
            create: {
                guildId: guild.id,
                enabled: enabled === 'true' || enabled === true,
                channelId: channelId || null,
                message: message || null,
                embedTitle: embedTitle || null,
                embedDescription: embedDescription || null,
                embedColor: embedColor || null,
                imageUrl: imageUrl || null,
                dmEnabled: dmEnabled === 'true' || dmEnabled === true,
                autoRoleId: autoRoleId || null,
                useCustomImage: useCustomImage === 'true' || useCustomImage === true,
                layout: layout || 'classic',
                font: font || 'Discord',
                circleColor: circleColor || null,
                titleColor: titleColor || null,
                usernameColor: usernameColor || null,
                messageColor: messageColor || null,
                overlayColor: overlayColor || null,
                bgImageUrl: bgImageUrl || null,
                bgColor: bgColor || null,
                avatarShape: avatarShape || 'circle',
                overlayOpacity: overlayOpacity ? parseInt(overlayOpacity) : 50,
            }
        });

        // Check if it's AJAX request (for dashboard form submission)
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({ success: true, message: 'Welcome settings saved successfully' });
        }

        res.redirect(`/dashboard/guild/${guild.guildId}/welcome?success=${encodeURIComponent('Welcome settings saved')}`);
    } catch (error) {
        console.error('❌ Error saving welcome settings:', error);
        res.redirect(`/dashboard/guild/${req.params.guildId}/welcome?error=${encodeURIComponent('Failed to save settings')}`);
    }
});

// Update existing rule
router.put('/guild/:guildId/rules/:ruleId', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;
        const { ruleId } = req.params;
        const { title, description } = req.body;

        const rulesConfig = await prisma.rule.findFirst({
            where: { guildId: guild.id }
        });

        if (!rulesConfig) {
            return res.status(404).json({ success: false, error: 'Rules not found' });
        }

        const rules = Array.isArray(rulesConfig.rules) ? rulesConfig.rules : [];
        const ruleIndex = rules.findIndex(r => r.id === ruleId);

        if (ruleIndex === -1) {
            return res.status(404).json({ success: false, error: 'Rule not found' });
        }

        rules[ruleIndex] = {
            id: ruleId,
            title,
            description
        };

        const updated = await prisma.rule.update({
            where: { id: rulesConfig.id },
            data: { rules }
        });

        res.json({ success: true, rule: rules[ruleIndex], rulesConfig: updated });
    } catch (error) {
        console.error('[API] Error updating rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete rule
router.delete('/guild/:guildId/rules/:ruleId', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;
        const { ruleId } = req.params;

        const rulesConfig = await prisma.rule.findFirst({
            where: { guildId: guild.id }
        });

        if (!rulesConfig) {
            return res.status(404).json({ success: false, error: 'Rules not found' });
        }

        const rules = Array.isArray(rulesConfig.rules) ? rulesConfig.rules : [];
        const filtered = rules.filter(r => r.id !== ruleId);

        const updated = await prisma.rule.update({
            where: { id: rulesConfig.id },
            data: { rules: filtered }
        });

        res.json({ success: true, rulesConfig: updated });
    } catch (error) {
        console.error('[API] Error deleting rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update rules config (channel, webhook, etc)
router.put('/guild/:guildId/rules/config', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;
        const { channelId, webhookUrl } = req.body;

        const existing = await prisma.rule.findFirst({
            where: { guildId: guild.id }
        });

        let rulesConfig;
        if (existing) {
            rulesConfig = await prisma.rule.update({
                where: { id: existing.id },
                data: { channelId, webhookUrl }
            });
        } else {
            rulesConfig = await prisma.rule.create({
                data: {
                    guildId: guild.id,
                    channelId,
                    webhookUrl,
                    rules: []
                }
            });
        }

        res.json({ success: true, rulesConfig });
    } catch (error) {
        console.error('[API] Error updating rules config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== Guild Channels API (for dropdowns) =====

// Get channels for a specific guild (for admin dashboard)
router.get('/guild/:guildId/channels', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    try {
        const { guildId } = req.params;
        const client = req.discordClient;

        if (!client) {
            return res.status(503).json({ success: false, error: 'Bot is not ready' });
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ success: false, error: 'Guild not found' });
        }

        const channels = guild.channels.cache
            .filter(c => c.type === 0 || c.type === 2) // Text or Voice channels
            .map(c => ({
                id: c.id,
                name: c.name,
                type: c.type === 0 ? 'text' : 'voice'
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        res.json({ success: true, channels });
    } catch (error) {
        console.error('[API] Error getting channels:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get channels for owner dashboard (for specific guild)
router.get('/owner/guild/:guildId/channels', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        const { guildId } = req.params;
        const client = req.discordClient;

        if (!client) {
            return res.status(503).json({ success: false, error: 'Bot is not ready' });
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ success: false, error: 'Guild not found' });
        }

        // Get text channels where bot has permission to send messages
        const channels = guild.channels.cache
            .filter(c => {
                if (c.type !== 0) return false; // Only text channels
                const permissions = c.permissionsFor(guild.members.me);
                return permissions && permissions.has('SendMessages');
            })
            .map(c => ({
                id: c.id,
                name: c.name,
                type: 'text'
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        res.json({ success: true, channels });
    } catch (error) {
        console.error('[API] Error getting channels:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get detailed server information for owner
router.get('/owner/servers/:guildId', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        const { guildId } = req.params;
        const client = req.discordClient;

        if (!client) {
            return res.status(503).json({ success: false, error: 'Bot is not ready' });
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ success: false, error: 'Guild not found' });
        }

        // Fetch all members if not cached
        await guild.members.fetch();

        // Get server info
        const serverInfo = {
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ dynamic: true, size: 256 }),
            owner: {
                id: guild.ownerId,
                username: guild.members.cache.get(guild.ownerId)?.user?.username || 'Unknown',
                tag: guild.members.cache.get(guild.ownerId)?.user?.tag || 'Unknown'
            },
            memberCount: guild.memberCount,
            createdAt: guild.createdAt,
            joinedAt: guild.joinedAt,
            description: guild.description,
            verificationLevel: guild.verificationLevel,
            boostTier: guild.premiumTier,
            boostCount: guild.premiumSubscriptionCount,
            channels: {
                total: guild.channels.cache.size,
                text: guild.channels.cache.filter(c => c.type === 0).size,
                voice: guild.channels.cache.filter(c => c.type === 2).size,
                category: guild.channels.cache.filter(c => c.type === 4).size
            },
            roles: guild.roles.cache.size,
            emojis: guild.emojis.cache.size,
            features: guild.features
        };

        res.json({ success: true, server: serverInfo });
    } catch (error) {
        console.error('[API] Error getting server info:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get members list for a specific server
router.get('/owner/servers/:guildId/members', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        const { guildId } = req.params;
        const { page = 1, limit = 50, search = '' } = req.query;
        const client = req.discordClient;

        if (!client) {
            return res.status(503).json({ success: false, error: 'Bot is not ready' });
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ success: false, error: 'Guild not found' });
        }

        // Fetch all members if not cached
        await guild.members.fetch();

        // Get all members
        let members = Array.from(guild.members.cache.values());

        // Filter by search if provided
        if (search) {
            const searchLower = search.toLowerCase();
            members = members.filter(m =>
                m.user.username.toLowerCase().includes(searchLower) ||
                m.user.tag.toLowerCase().includes(searchLower) ||
                m.displayName.toLowerCase().includes(searchLower)
            );
        }

        // Sort by join date (newest first)
        members.sort((a, b) => b.joinedTimestamp - a.joinedTimestamp);

        // Pagination
        const total = members.length;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedMembers = members.slice(startIndex, endIndex);

        // Format member data
        const memberList = paginatedMembers.map(member => ({
            id: member.id,
            username: member.user.username,
            tag: member.user.tag,
            discriminator: member.user.discriminator,
            displayName: member.displayName,
            avatar: member.user.displayAvatarURL({ dynamic: true, size: 128 }),
            isBot: member.user.bot,
            isOwner: member.id === guild.ownerId,
            joinedAt: member.joinedAt,
            roles: member.roles.cache
                .filter(r => r.id !== guild.id) // Exclude @everyone
                .map(r => ({ id: r.id, name: r.name, color: r.hexColor }))
                .sort((a, b) => b.position - a.position),
            permissions: {
                isAdmin: member.permissions.has('Administrator'),
                canManageGuild: member.permissions.has('ManageGuild'),
                canManageChannels: member.permissions.has('ManageChannels'),
                canKick: member.permissions.has('KickMembers'),
                canBan: member.permissions.has('BanMembers')
            }
        }));

        res.json({
            success: true,
            members: memberList,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('[API] Error getting members:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all servers list for owner dashboard
router.get('/owner/servers', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        const client = req.discordClient;

        if (!client) {
            return res.status(503).json({ success: false, error: 'Bot is not ready' });
        }

        const servers = Array.from(client.guilds.cache.values()).map(guild => ({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ dynamic: true, size: 128 }),
            memberCount: guild.memberCount,
            owner: {
                id: guild.ownerId,
                username: guild.members.cache.get(guild.ownerId)?.user?.username || 'Unknown'
            },
            joinedAt: guild.joinedAt,
            boostTier: guild.premiumTier
        })).sort((a, b) => b.memberCount - a.memberCount); // Sort by member count

        res.json({ success: true, servers, total: servers.length });
    } catch (error) {
        console.error('[API] Error getting servers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
