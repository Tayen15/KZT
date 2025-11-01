const { Events, ActivityType } = require('discord.js');
const axios = require('axios');
const config = require('../config.json');
const monitorServer = require("../handlers/monitorServer");
const serverControl = require("../handlers/serverControl");
const rules = require("../handlers/rules");
const prayerTime = require("../handlers/prayerTime");
const lofiReconnect = require("../handlers/lofiReconnect");
const { initializeCommandToggles } = require('../middleware/commandToggle');
const prisma = require('../utils/database');

const serverStatusURL = `https://api.mcsrvstat.us/3/${config.SERVER_IP}`;

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
                            activityType: config.presence.type || 'Watching',
                            activityText: config.presence.name || 'over servers',
                            status: 'online'
                        }
                    });
                }

                // Set presence based on database settings
                const activityType = ActivityType[botSettings.activityType] || ActivityType.Watching;

                client.user.setPresence({
                    activities: [{
                        name: botSettings.activityText,
                        type: activityType
                    }],
                    status: botSettings.status
                });
            } catch (error) {
                console.error(`[ERROR] Failed to update presence:`, error.message);
                // Fallback to config
                client.user.setPresence({
                    activities: [{ name: config.presence.name, type: ActivityType[config.presence.type] }]
                });
            } finally {
                // Update presence every 5 minutes instead of 5 seconds
                setTimeout(updatePresence, 300000);
            }
        }

        updatePresence();
    }
};