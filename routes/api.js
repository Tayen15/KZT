const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureGuildAdmin, ensureBotOwner } = require('../middleware/auth');
const prisma = require('../utils/database');
const { toggleCommand, getAllCommandToggles } = require('../middleware/commandToggle');
const { ActivityType } = require('discord.js');

// ===== Owner API =====

// Send announcement to all guilds or specific guild
router.post('/owner/announce', ensureAuthenticated, ensureBotOwner, async (req, res) => {
    try {
        const { target, message } = req.body;
        const client = req.discordClient;

        if (!client) {
            return res.status(503).json({ success: false, error: 'Bot is not connected' });
        }

        let sentCount = 0;
        const guilds = target === 'all' 
            ? Array.from(client.guilds.cache.values())
            : [client.guilds.cache.get(target)];

        for (const guild of guilds) {
            if (!guild) continue;
            
            // Try to find a suitable channel to send announcement
            const channel = guild.channels.cache.find(
                c => c.type === 0 && c.permissionsFor(guild.members.me).has('SendMessages')
            );

            if (channel) {
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
            }
        }

        res.json({ 
            success: true, 
            message: `Announcement sent to ${sentCount} server(s)` 
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

        // Update or create settings
        let settings = await prisma.botSettings.findFirst();
        
        if (settings) {
            settings = await prisma.botSettings.update({
                where: { id: settings.id },
                data: {
                    activityType,
                    activityText,
                    status,
                    maintenanceMode,
                    maintenanceMessage
                }
            });
        } else {
            settings = await prisma.botSettings.create({
                data: {
                    activityType,
                    activityText,
                    status,
                    maintenanceMode,
                    maintenanceMessage
                }
            });
        }

        // Update bot presence immediately
        const activityTypeEnum = ActivityType[activityType] || ActivityType.Watching;
        client.user.setPresence({
            activities: [{
                name: activityText,
                type: activityTypeEnum
            }],
            status: status
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

// ===== Guild Settings API =====



// Get guild settings
router.get('/guild/:guildId/settings', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
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
router.post('/guild/:guildId/settings', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
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
router.get('/guild/:guildId/prayer', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
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
router.post('/guild/:guildId/prayer', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
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
router.get('/guild/:guildId/monitoring', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
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
router.post('/guild/:guildId/monitoring', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
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
router.put('/guild/:guildId/monitoring/:id', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
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
router.delete('/guild/:guildId/monitoring/:id', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
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
router.get('/guild/:guildId/rules', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
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
router.get('/guild/:guildId/rules', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
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
router.get('/guild/:guildId/rules/:ruleId', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
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
router.post('/guild/:guildId/rules', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
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

// Update existing rule
router.put('/guild/:guildId/rules/:ruleId', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
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
router.delete('/guild/:guildId/rules/:ruleId', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
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
router.put('/guild/:guildId/rules/config', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
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
router.get('/guild/:guildId/channels', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
    try {
        const { guildId } = req.params;
        const { client } = req.app.locals;

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
            }));

        res.json({ success: true, channels });
    } catch (error) {
        console.error('[API] Error getting channels:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
