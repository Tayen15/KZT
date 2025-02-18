const { REST, Routes } = require('discord.js');
const { clientID } = require('./config.json');
const fs = require('fs');

const { token } = './config.json';

const commands = [];
fs.readdirSync('./commands').forEach(dirs => {
	const commandFiles = fs.readdirSync(`./commands/${dirs}`).filter((files) => files.endsWith('.js'));
	
	for (const file of commandFiles) {
		const command = require(`./commands/${dirs}/${file}`);
		commands.push(command.data);
	}
})

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		const data = await rest.put(
			Routes.applicationCommands(clientID),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
})();
