const { Events, ActivityType } = require('discord.js');
const axios = require('axios');
const cfg = (() => { try { return require('../config.json'); } catch { return {}; } })();
const monitorServer = require("../handlers/monitorServer");
const serverControl = require("../handlers/serverControl");
const rules = require("../handlers/rules");
const prayerTime = require("../handlers/prayerTime");
const lofiReconnect = require("../handlers/lofiReconnect");
const { initializeCommandToggles } = require('../middleware/commandToggle');
const prisma = require('../utils/database');

const MC_SERVER_IP = process.env.MC_SERVER_IP || cfg.SERVER_IP;
const serverStatusURL = `https://api.mcsrvstat.us/3/${MC_SERVER_IP}`;

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`[BOT READY] ${client.user.username} is online!`);
        console.log(`[INFO] Connected to ${client.guilds.cache.size} servers and ${client.users.cache.size} members.`);

        if (!client.commandIds) {
            client.commandIds = new Map();
            console.log('[INFO] Initialized client.commandIds as Map in ready.js');
        }

        client.isReady = false;

        try {
            const commands = await client.application.commands.fetch();
            commands.forEach(command => {
                client.commandIds.set(command.name, command.id);
                // console.log(`[COMMAND ID] ${command.name}: ${command.id}`);
            });
            console.log(`[INFO] Successfully fetched ${commands.size} command IDs.`);
        } catch (error) {
            console.error(`[ERROR] Failed to fetch command IDs:`, error.message);
        }

        client.isReady = true;

        // Initialize command toggles
        await initializeCommandToggles(client.commands);

        // await monitorServer(client);
        // await serverControl(client);
        await prayerTime(client);
        await lofiReconnect(client);
        // await rules.sendRules(client.channels.cache.get(config.RULES_CHANNELID));

        async function updatePresence() {
            try {
                // Get bot settings from database
                let botSettings = await prisma.botSettings.findFirst();

                // Create default settings if not exists
                if (!botSettings) {
                    botSettings = await prisma.botSettings.create({
                        data: {
                            activityType: (cfg.presence && cfg.presence.type) || 'Playing',
                            activityText: (cfg.presence && cfg.presence.name) || 'over servers',
                            status: 'online'
                        }
                    });
                }

                // Map activity type string to Discord.js ActivityType enum
                const activityTypeMap = {
                    'Playing': ActivityType.Playing,     // 0
                    'Streaming': ActivityType.Streaming, // 1
                    'Listening': ActivityType.Listening, // 2
                    'Watching': ActivityType.Watching,   // 3
                    'Custom': ActivityType.Custom,       // 4
                    'Competing': ActivityType.Competing  // 5
                };

                const activityType = activityTypeMap[botSettings.activityType] || ActivityType.Playing;
                
                // Ensure activityText is a valid string
                const activityText = botSettings.activityText && typeof botSettings.activityText === 'string' 
                    ? botSettings.activityText 
                    : 'over servers';

                // Build activity object
                // NOTE: Always use 'name' property - Discord.js requires it even for Custom status
                // Discord.js will automatically convert 'name' to 'state' for Custom type
                const activity = {
                    type: activityType,
                    name: activityText
                };

                // Set presence
                client.user.setPresence({
                    activities: [activity],
                    status: botSettings.status || 'online'
                });

                console.log(`[Presence] Updated: ${botSettings.activityType} "${activityText}" (${botSettings.status})`);
            } catch (error) {
                console.error(`[ERROR] Failed to update presence:`, error.message);
                
                // Fallback to config
                const activityTypeMap = {
                    'Playing': ActivityType.Playing,
                    'Streaming': ActivityType.Streaming,
                    'Listening': ActivityType.Listening,
                    'Watching': ActivityType.Watching,
                    'Custom': ActivityType.Custom,
                    'Competing': ActivityType.Competing
                };
                
                const fallbackType = activityTypeMap[(cfg.presence && cfg.presence.type)] || ActivityType.Playing;
                const fallbackText = (cfg.presence && cfg.presence.name) && typeof cfg.presence.name === 'string'
                    ? cfg.presence.name
                    : 'over servers';
                
                client.user.setPresence({
                    activities: [{
                        type: fallbackType,
                        name: fallbackText
                    }],
                    status: 'online'
                });
            } finally {
                // Update presence every 5 minutes
                setTimeout(updatePresence, 300000);
            }
        }

        updatePresence();
    }
};