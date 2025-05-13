const { Events, MessageFlags } = require('discord.js');
const config = require('../config.json'); 

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isCommand()) return;

		const client = interaction.client;
		const command = client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`❌ No command matching "${interaction.commandName}" was found.`);
			await interaction.reply({ content: '⚠️ An error occurred! Command not found.', flags: MessageFlags.Ephemeral });
			return;
		}

		// Ensure commandIds is initialized
		if (!client.commandIds) {
			client.commandIds = new Map();
			console.log('[INFO] Initialized client.commandIds in interactionCreate.js');
		}

		// Check if bot is ready
		if (!client.isReady) {
			await interaction.reply({ content: '⚠️ The bot is still starting up. Please try again in a moment.', flags: MessageFlags.Ephemeral });
			return;
		}

		if (command.ownerOnly && interaction.user.id !== config.ownerId) {
			return interaction.reply({ content: 'This command is restricted to the bot owner.', flags: MessageFlags.Ephemeral });
		}
		if (command.requiredPermissions?.length && !interaction.member.permissions.has(command.requiredPermissions)) {
			return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(`❌ Error executing "${interaction.commandName}"`);
			console.error(error);

			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: '⚠️ An error occurred while executing the command!', flags: MessageFlags.Ephemeral });
			} else {
				await interaction.reply({ content: '⚠️ An error occurred while executing the command!', flags: MessageFlags.Ephemeral });
			}
		}
	},
};