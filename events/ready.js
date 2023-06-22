const { Events, ActivityType } = require('discord.js');
const moment = require('moment-timezone');
const axios = require('axios');
const config = require('../config.json');

const serverStatusURL = `https://api.mcstatus.io/v2/status/java/${config.SERVER_IP}:${config.SERVER_PORT}`;

async function getServerStatus() {
    try {
        const response = await axios.get(serverStatusURL);
        const data = response.data;
        return data.players.online;
    } catch (error) {
        console.error('Failed to fetch server status:', error);
        return false;
    }
}

async function getPlayersMax() {
    try {
        const response = await axios.get(serverStatusURL);
        const data = response.data;
        return data.players.max;
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

        const statusType = ActivityType.Watching;
    
        async function updatePresence() {
            const serverStatus = await getServerStatus();
            const playerMax = await getPlayersMax();
            const currentTime = moment().tz('Asia/Jakarta').format('h:mm:ss A');
            let presenceActivity;

            if (serverStatus) {
                presenceActivity = `${serverStatus}/${playerMax} Players`;
            } else {
                presenceActivity = 'Wandek Jaya Jaya';
            }
            
            client.user.setPresence({
                activities: [{ name: presenceActivity, type: statusType }]
            });

            console.log(`Presence updated at ${currentTime}: ${presenceActivity}`);
        }

        setInterval(updatePresence, 30000);
    }
};
