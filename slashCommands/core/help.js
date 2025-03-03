const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Menampilkan daftar perintah yang tersedia'),
    async execute(client, interaction) {

        const categories = [...new Set(Array.from(client.commands.values()).map(cmd => cmd.category || 'Uncategorized'))];

        if (categories.length === 0) {
            return interaction.reply({ content: 'Tidak ada perintah yang tersedia.', ephemeral: true });
        }

        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('select_category')
            .setPlaceholder('Pilih kategori perintah')
            .addOptions(categories.map(category => ({
                label: category,
                value: category
            })));

        const categoryRow = new ActionRowBuilder().addComponents(categorySelect);

        const embed = new EmbedBuilder()
            .setAuthor({
                name: client.user.username,
                iconURL: client.user.displayAvatarURL({ dynamic: true })
            })
            .setTitle(`Welcome to the ${client.user.username} Help Guide`)
            .setDescription(`Here you will find all the available commands from <@${client.user.id}>.\n\n**Commands**\nYou can find all the basic commands on the website.\nOr use the select menu below.\n`)
            .setColor(0x00AE86);

        await interaction.reply({ embeds: [embed], components: [categoryRow], ephemeral: false });

        const filter = i => i.customId === 'select_category' && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            const selectedCategory = i.values[0];
            const commandsInCategory = Array.from(client.commands.values()).filter(cmd => (cmd.category || 'Uncategorized') === selectedCategory).values();

            if (!commandsInCategory.size) {
                return i.reply({ content: `Tidak ada perintah dalam kategori **${selectedCategory}**`, ephemeral: true });
            }

            const commandSelect = new StringSelectMenuBuilder()
                .setCustomId('select_command')
                .setPlaceholder('Pilih perintah untuk melihat detail')
                .addOptions(commandsInCategory.map(cmd => ({
                    label: `/${cmd.data.name}`,
                    description: cmd.data.description,
                    value: cmd.data.name
                })));

            const commandRow = new ActionRowBuilder().addComponents(commandSelect);

            const categoryEmbed = new EmbedBuilder()
                .setTitle(`📂 Kategori: ${selectedCategory}`)
                .setDescription('Pilih perintah untuk melihat detail penggunaannya.')
                .setColor(0x00AE86)
                .setTimestamp();

            await i.update({ embeds: [categoryEmbed], components: [commandRow] });

            const commandFilter = c => c.customId === 'select_command' && c.user.id === interaction.user.id;
            const commandCollector = interaction.channel.createMessageComponentCollector({ filter: commandFilter, time: 60000 });

            commandCollector.on('collect', async c => {
                const selectedCommand = client.commands.get(c.values[0]);

                if (!selectedCommand) {
                    return c.reply({ content: 'Perintah tidak ditemukan.', ephemeral: true });
                }

                const commandEmbed = new EmbedBuilder()
                    .setTitle(`📌 Detail Perintah: /${selectedCommand.data.name}`)
                    .setDescription(selectedCommand.data.description)
                    .addFields(
                        { name: '📑 **Kategori**', value: selectedCommand.category || 'Tidak diketahui', inline: true },
                        { name: '📖 **Cara Penggunaan**', value: selectedCommand.usage || `/${selectedCommand.data.name}`, inline: false },
                        { name: '🔗 **Alias**', value: selectedCommand.aliases && selectedCommand.aliases.length > 0 ? selectedCommand.aliases.join(', ') : 'Tidak ada', inline: false }
                    )
                    .setColor(0x00AE86)
                    .setTimestamp();

                await c.update({ embeds: [commandEmbed], components: [] });
            });
        });
    }
};
