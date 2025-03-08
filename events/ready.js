const { Events, ActivityType } = require('discord.js');
const moment = require('moment-timezone');
const axios = require('axios');
const config = require('../config.json');
const monitorServer = require("../handlers/monitorServer");

const serverStatusURL = `https://api.mcsrvstat.us/3/${config.SERVER_IP}`;

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`[BOT READY] ${client.user.username} is online!`);
        console.log(`[INFO] Connected to ${client.guilds.cache.size} servers and ${client.users.cache.size} members.`);

        await monitorServer(client);

        async function updatePresence() {
            try {
                const response = await axios.get(serverStatusURL);
                const { players } = response.data;

                let presenceActivity = `${config.SERVER_NAME} Server is Offline`;
                if (players?.online !== undefined) {
                    presenceActivity = `${players.online}/${players.max} Villagers on ${config.SERVER_NAME}`;
                }

                client.user.setPresence({
                    activities: [{ name: presenceActivity, type: ActivityType.Watching }]
                });

            } catch (error) {
                console.error(`[ERROR] Failed to fetch server status:`, error.message);
            } finally {
                setTimeout(updatePresence, 5000); 
            }
        }

        updatePresence(); 
    }
};
