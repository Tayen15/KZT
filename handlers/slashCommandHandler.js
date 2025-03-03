const fs = require('fs');
const path = require('path');

module.exports = (client) => {
     client.commands = new Map();
     const commandFolders = fs.readdirSync(path.join(__dirname, '../slashCommands'));

     for (const folder of commandFolders) {
          const commandFiles = fs.readdirSync(path.join(__dirname, `../slashCommands/${folder}`)).filter(file => file.endsWith('.js'));

          for (const file of commandFiles) {
               const command = require(path.join(__dirname, `../slashCommands/${folder}/${file}`));
               if (command.data && command.execute) {
                    client.commands.set(command.data.name, command);
                    console.log(`✅ Loaded command: ${command.data.name}`);
               } else {
                    console.log(`⚠️ Skipped: ${folder}/${file} (Missing "data" or "execute")`);
               }
          }
     }

};
