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

        const prayerConfig = await prisma.prayerTime.updateMany({
            where: { guildId: guild.id },
            data: updates
        });

        if (prayerConfig.count === 0) {
            await prisma.prayerTime.create({
                data: {
                    guildId: guild.id,
                    ...updates
                }
            });
        }

        res.json({ success: true, message: 'Prayer times updated successfully' });
    } catch (error) {
        console.error('[API] Error updating prayer config:', error);
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

// Create monitoring config
router.post('/guild/:guildId/monitoring', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;
        const data = req.body;

        const monitor = await prisma.serverMonitoring.create({
            data: {
                guildId: guild.id,
                ...data
            }
        });

        res.json({ success: true, monitor });
    } catch (error) {
        console.error('[API] Error creating monitor:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update monitoring config
router.put('/guild/:guildId/monitoring/:id', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const monitor = await prisma.serverMonitoring.update({
            where: { id },
            data: updates
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

// Update rules
router.post('/guild/:guildId/rules', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
    try {
        const guild = req.currentGuild;
        const { rules, channelId, webhookUrl } = req.body;

        const existing = await prisma.rule.findFirst({
            where: { guildId: guild.id }
        });

        let rulesConfig;
        if (existing) {
            rulesConfig = await prisma.rule.update({
                where: { id: existing.id },
                data: {
                    rules,
                    channelId,
                    webhookUrl
                }
            });
        } else {
            rulesConfig = await prisma.rule.create({
                data: {
                    guildId: guild.id,
                    rules,
                    channelId,
                    webhookUrl
                }
            });
        }

        res.json({ success: true, rulesConfig });
    } catch (error) {
        console.error('[API] Error updating rules:', error);
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
