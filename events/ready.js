const { Events, ActivityType } = require('discord.js');
const moment = require('moment-timezone');
const axios = require('axios');
const config = require('../config.json');

const serverStatusURL = `https://api.mcstatus.io/v2/status/java/${config.SERVER_IP}:${config.SERVER_PORT}`;



module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {

        console.log('%s is online: %s servers, and %s members', client.user.username, client.guilds.cache.size, client.users.cache.size);

        async function updatePresence() {
            try {
                const response = await axios.get(serverStatusURL);
                const data = response.data;
                const serverStatus = data.players.online;
                const playerMax = data.players.max;
                const currentTime = moment().tz('Asia/Jakarta').format('h:mm:ss A');
                let presenceActivity;
        
                if (serverStatus) {
                    presenceActivity = `${serverStatus}/${playerMax} Players on PPLGCraft`;
                } else {
                    presenceActivity = 'Wandek Jaya Jaya';
                }
                const statusType = ActivityType.Watching;
                
                client.user.setPresence({
                    activities: [{ name: presenceActivity, type: statusType }]
                });
        
                console.log(`Presence updated at ${currentTime}: ${presenceActivity}`);
            } catch (error) {
                console.error('Failed to fetch server status:', error);
            }
        }
    
        setInterval(updatePresence, 30000);
    }
};
