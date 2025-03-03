const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const eventPath = path.join(__dirname, '../events');
    const eventFiles = fs.readdirSync(eventPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const event = require(path.join(eventPath, file));

        if (!event.name || typeof event.execute !== 'function') {
            console.warn(`⚠️ Event "${file}" tidak memiliki properti "name" atau "execute"!`);
            continue;
        }

        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }

        console.log(`✅ Loaded event: ${event.name}`);
    }
};
