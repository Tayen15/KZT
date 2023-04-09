const config = require('../config');
const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log('%s is online: %s servers, and %s members', client.user.username, client.guilds.cache.size, client.guild.memberCount);

        const statusType = ActivityType.Listening;
        client.user.setPresence({
            activities: [
                { name: `Met Puasa Yagesya!`, type: statusType }
            ]
        });
        //client.user.setActivity(`${config.prefix}help`, { type: "WATCHING" });
    }
};