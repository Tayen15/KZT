const fs = require('fs');

module.exports = (client) => {
     client.commands = new Map();
     const commandFolders = fs.readdirSync('./commands');

     for (const folder of commandFolders) {
          const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
          for (const file of commandFiles) {
               const command = require(`../commands/${folder}/${file}`);
               if (command.data && command.execute) {
                    client.commands.set(command.data.name, command);
                    console.log(`✅ Loaded command: ${command.data.name} from ${folder}`);
               } else {
                    console.log(`⚠️ Missing "data" or "execute" in command: ${folder}/${file}`);
               }
          }
     }
};
