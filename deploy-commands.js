const { REST, Routes } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const token = process.env.DISCORD_TOKEN;

if (!token) {
	console.warn('⚠️  Slash command deployment skipped: DISCORD_TOKEN not set.');
	return;
}

const commands = [];

const commandFolders = fs.readdirSync('./slashCommands');

for (const folder of commandFolders) {
	const commandFiles = fs.readdirSync(`./slashCommands/${folder}`).filter(file => file.endsWith('.js'));

	for (const file of commandFiles) {
		const command = require(`./slashCommands/${folder}/${file}`);
		if (command.data) {
			commands.push(command.data.toJSON());
		} else {
			console.log(`⚠️ Skipped: ${folder}/${file} (Missing "data")`);
		}
	}
}

const rest = new REST({ version: '10' }).setToken(token);

const clientID = process.env.DISCORD_CLIENT_ID;

async function validateApplication(restClient, expectedId) {
	try {
		const appData = await restClient.get(Routes.currentApplication());
		if (appData.id !== expectedId) {
			console.warn(`⚠️  Application ID mismatch: token belongs to ${appData.id} but config.json clientID is ${expectedId}. Skipping deployment.`);
			return false;
		}
		return true;
	} catch (err) {
		console.warn('⚠️  Could not validate application with provided token:', err.message);
		return false;
	}
}

(async () => {
	// Validate token matches configured application ID before attempting deploy
	const ok = await validateApplication(rest, clientID);
	if (!ok) return;
	try {
		console.log(`🚀 Deploying ${commands.length} application (/) commands.`);

		const data = await rest.put(
			Routes.applicationCommands(clientID),
			{ body: commands }
		);

		console.log(`✅ Successfully deployed ${data.length} slash commands.`);
		
	} catch (error) {
		if (error && error.message && /token/i.test(error.message)) {
			console.error('❌ Error deploying commands: invalid token. Verify DISCORD_TOKEN/DEV_DISCORD_TOKEN.');
		} else {
			console.error('❌ Error deploying commands:', error);
		}
	}
})();
