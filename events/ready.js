const { Events, ActivityType } = require('discord.js');
const moment = require('moment-timezone');
const fetch = require('axios');

const serverStatusURL = 'https://api.mcstatus.io/v2/';

async function getServerStatus() {
    try {
        const response = await fetch(serverStatusURL);
        const data = await response.json();
        return data.online;
    } catch (error) {
        console.error('Failed to fetch server status:', error);
        return false;
    }
}

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log('%s is online: %s servers, and %s members', client.user.username, client.guilds.cache.size, client.users.cache.size);

        const statusType = ActivityType.Listening;
        async function updatePresence() {
            const serverStatus = await getServerStatus();
            const currentTime = moment().tz('Asia/Jakarta').format('h:mm:ss A');
            let presenceActivity;

            if (serverStatus) {
                presenceActivity = `Online Players: ${serverStatus}`;
            } else {
                presenceActivity = 'Wandek Selalu Dihati';
            }

            client.user.setPresence({
                activities: [{ name: presenceActivity, type: statusType }]
            });

            console.log(`Presence updated at ${currentTime}: ${presenceActivity}`);
        }

        setInterval(updatePresence, 60000);
    }
};
