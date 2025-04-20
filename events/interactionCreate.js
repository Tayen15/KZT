const { Events } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isCommand()) return;

		const client = interaction.client;
		const command = client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`❌ No command matching "${interaction.commandName}" was found.`);
			await interaction.reply({ content: '⚠️ An error occurred! Command not found.', ephemeral: true });
			return;
		}

		// Ensure commandIds is initialized
		if (!client.commandIds) {
			client.commandIds = new Map();
			console.log('[INFO] Initialized client.commandIds in interactionCreate.js');
		}

		// Check if bot is ready
		if (!client.isReady) {
			await interaction.reply({ content: '⚠️ The bot is still starting up. Please try again in a moment.', ephemeral: true });
			return;
		}

		try {
			await command.execute(client, interaction);
		} catch (error) {
			console.error(`❌ Error executing "${interaction.commandName}"`);
			console.error(error);

			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: '⚠️ An error occurred while executing the command!', ephemeral: true });
			} else {
				await interaction.reply({ content: '⚠️ An error occurred while executing the command!', ephemeral: true });
			}
		}
	},
};