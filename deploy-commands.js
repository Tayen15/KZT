const { REST, Routes } = require('discord.js');
const { clientID } = require('./config.json');
const fs = require('fs');
require('dotenv').config();

const token = process.env.token;
const commands = [];

const commandFolders = fs.readdirSync('./slashCommands');

for (const folder of commandFolders) {
	const commandFiles = fs.readdirSync(`./slashCommands/${folder}`).filter(file => file.endsWith('.js'));

	for (const file of commandFiles) {
		const command = require(`./slashCommands/${folder}/${file}`);
		if (command.data) {
			commands.push(command.data.toJSON());
			console.log(`✅ Loaded slash command: ${command.data.name}`);
		} else {
			console.log(`⚠️ Skipped: ${folder}/${file} (Missing "data")`);
		}
	}
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
	try {
		console.log(`🚀 Deploying ${commands.length} application (/) commands.`);

		const data = await rest.put(
			Routes.applicationCommands(clientID),
			{ body: commands }
		);

		console.log(`✅ Successfully deployed ${data.length} slash commands.`);

		data.forEach(cmd => {
			console.log(`Command: ${cmd.name}, ID: ${cmd.id}`);
		});
	} catch (error) {
		console.error('❌ Error deploying commands:', error);
	}
})();
