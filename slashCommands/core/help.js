const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays a list of available commands'),
    name: 'help',
    category: 'info',
    async execute(client, interaction) {

        const commandId = client.commandIds.get('help');
        this.usage = commandId ? `</help:${commandId}>` : '/help';

        const categories = [...new Set(Array.from(client.commands.values()).map(cmd => cmd.category || 'Uncategorized'))];

        if (categories.length === 0) {
            return interaction.reply({ content: 'No commands available.', flags: MessageFlags.Ephemeral });
        }

        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('select_category')
            .setPlaceholder('Select a command category')
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
            .setTitle(`Welcome to ${client.user.username} Help Guide`)
            .setDescription(`Here you will find all available commands of <@${client.user.id}>.\n\n**Commands**\nUse the menu below to browse available commands.`)
            .setColor(0x00AE86);

        await interaction.reply({ embeds: [embed], components: [categoryRow], flags: MessageFlags.Ephemeral });

        const collector = interaction.channel.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000,
            filter: i => i.user.id === interaction.user.id
        });

        collector.on('collect', async i => {
            if (i.customId !== 'select_category') return;

            const selectedCategory = i.values[0];
            const commandsInCategory = Array.from(client.commands.values()).filter(cmd => (cmd.category || 'Uncategorized') === selectedCategory);

            if (commandsInCategory.length === 0) {
                return i.reply({ content: `No commands in category **${selectedCategory}**`, flags: MessageFlags.Ephemeral });
            }

            const commandSelect = new StringSelectMenuBuilder()
                .setCustomId('select_command')
                .setPlaceholder('Select a command to view details')
                .addOptions(commandsInCategory.map(cmd => ({
                    label: `/${cmd.data.name}`,
                    description: cmd.data.description,
                    value: cmd.data.name
                })));

            const commandRow = new ActionRowBuilder().addComponents(commandSelect);

            const categoryEmbed = new EmbedBuilder()
                .setTitle(`📂 Category: ${selectedCategory}`)
                .setDescription('Select a command to view details.')
                .setColor(0x00AE86)
                .setTimestamp();

            await i.update({ embeds: [categoryEmbed], components: [commandRow] });

            const commandCollector = interaction.channel.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 60000,
                filter: c => c.user.id === interaction.user.id && c.customId === 'select_command'
            });

            commandCollector.on('collect', async c => {
                const selectedCommand = client.commands.get(c.values[0]);

                if (!selectedCommand) {
                    return c.reply({ content: 'Command not found.', flags: MessageFlags.Ephemeral });
                }

                // Dynamically set usage for the selected command
                const commandId = client.commandIds.get(selectedCommand.data.name);
                selectedCommand.usage = commandId ? `</${selectedCommand.data.name}:${commandId}>` : `/${selectedCommand.data.name}`;

                const commandEmbed = new EmbedBuilder()
                    .setTitle(`📌 Command: /${selectedCommand.data.name}`)
                    .setDescription(selectedCommand.data.description)
                    .addFields(
                        { name: '📑 **Category**', value: selectedCommand.category || 'Unknown', inline: true },
                        { name: '📖 **Usage**', value: selectedCommand.usage || `/${selectedCommand.data.name}`, inline: false },
                        { name: '🔗 **Aliases**', value: selectedCommand.aliases?.length ? selectedCommand.aliases.join(', ') : 'None', inline: false }
                    )
                    .setColor(0x00AE86)
                    .setTimestamp();

                await c.update({ embeds: [commandEmbed], components: [] });
            });

            commandCollector.on('end', async () => {
                await c.editReply({ components: [] }).catch(() => { });
            });
        });

        collector.on('end', async () => {
            await interaction.editReply({ components: [] }).catch(() => { });
        });
    }
};