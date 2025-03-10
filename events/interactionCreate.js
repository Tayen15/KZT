const { Events, MessageFlags } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isCommand()) return; 

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`❌ No command matching "${interaction.commandName}" was found.`);
			await interaction.reply({ content: '⚠️ Terjadi kesalahan! Command tidak ditemukan.', flags: MessageFlags.Ephemeral });
			return;
		}

		try {

			await command.execute(interaction.client, interaction);
		} catch (error) {
			console.error(`❌ Error executing "${interaction.commandName}"`);
			console.error(error);

			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: '⚠️ Terjadi kesalahan saat menjalankan perintah!', flags: MessageFlags.Ephemeral });
			} else {
				await interaction.reply({ content: '⚠️ Terjadi kesalahan saat menjalankan perintah!', flags: MessageFlags.Ephemeral });
			}
		}
	},
};
