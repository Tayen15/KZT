const config = require('../config');

module.exports = {
    name: "ready",
    execute(client) {
        console.log('%s is online: %s servers, and %s members', client.user.username, client.guilds.cache.size, client.users.cache.size);

        client.user.setActivity(`${config.prefix}help`, { type: "WATCHING" });
    }
};