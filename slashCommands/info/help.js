const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays a list of available commands')
        .addStringOption(option => {
            const commandChoices = [];
            const commandPath = path.join(__dirname, '..');
            const directories = fs.readdirSync(commandPath).filter(file => fs.statSync(path.join(commandPath, file)).isDirectory());

            for (const dir of directories) {
                const dirPath = path.join(commandPath, dir);
                const files = fs.readdirSync(dirPath).filter(file => file.endsWith('.js'));

                for (const file of files) {
                    const commandName = file.replace('.js', '');
                    if (!commandChoices.some(c => c.name === commandName)) {
                        commandChoices.push({ name: commandName, value: commandName });
                    }
                }
            }

            return option
                .setName('command')
                .setDescription('(Optional) Slash command to view details')
                .setRequired(false)
                .addChoices(...commandChoices.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 25));
        })
        .addStringOption(option => {
            const categoryChoices = [];
            const commandPath = path.join(__dirname, '..');
            const directories = fs.readdirSync(commandPath).filter(file => fs.statSync(path.join(commandPath, file)).isDirectory());

            for (const dir of directories) {
                if (!categoryChoices.some(c => c.name === dir)) {
                    categoryChoices.push({ name: dir, value: dir });
                }
            }

            return option
                .setName('category')
                .setDescription('(Optional) Category to view commands')
                .setRequired(false)
                .addChoices(...categoryChoices.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 25));
        }),
    name: 'help',
    category: 'info',
    ownerOnly: false,
    requiredPermissions: [],
    options: [
        { name: 'command', type: 'STRING', required: false, description: '(Optional) Slash command to view details' },
        { name: 'category', type: 'STRING', required: false, description: '(Optional) Category to view commands' }
    ],
    async execute(client, interaction) {
        const config = require('../../config.json'); 
        const isOwner = interaction.user.id === config.ownerId;

        // Filter commands based on authorization
        const authorizedCommands = Array.from(client.commands.values()).filter(cmd => {
            if (cmd.ownerOnly && !isOwner) return false;
            if (cmd.requiredPermissions?.length && !interaction.member.permissions.has(cmd.requiredPermissions)) {
                return false;
            }
            return true;
        });

        // Get categories from authorized commands
        const categories = [...new Set(authorizedCommands.map(cmd => cmd.category || 'Uncategorized'))];
        const commandOption = interaction.options.getString('command');
        const categoryOption = interaction.options.getString('category');

        // Dynamically set usage for the help command
        const commandId = client.commandIds.get('help');
        this.usage = commandId ? `</help:${commandId}> [command] [category]` : '/help [command] [category]';

        // Handle command option
        if (commandOption) {
            const selectedCommand = authorizedCommands.find(cmd => cmd.data.name === commandOption);

            if (!selectedCommand) {
                return interaction.reply({ content: `No command named **${commandOption}** found or you lack permission.`, flags: MessageFlags.Ephemeral });
            }

            // Dynamically set usage for the selected command
            const commandId = client.commandIds.get(selectedCommand.data.name);
            let usage = commandId ? `</${selectedCommand.data.name}:${commandId}>` : `/${selectedCommand.data.name}`;

            if (selectedCommand.options && selectedCommand.options.length > 0) {
                const optionsString = selectedCommand.options
                    .map(opt => (opt.required ? `<${opt.name}>` : `[${opt.name}]`))
                    .join(' ');
                usage += ` ${optionsString}`;
            }

            selectedCommand.usage = usage;

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

            return interaction.reply({ embeds: [commandEmbed], flags: MessageFlags.Ephemeral });
        }

        // Handle category option
        if (categoryOption) {
            if (!categories.includes(categoryOption)) {
                return interaction.reply({ content: `No category named **${categoryOption}** found or you lack permission.`, flags: MessageFlags.Ephemeral });
            }

            const commandsInCategory = authorizedCommands.filter(cmd => (cmd.category || 'Uncategorized') === categoryOption);

            if (commandsInCategory.length === 0) {
                return interaction.reply({ content: `No commands in category **${categoryOption}**`, flags: MessageFlags.Ephemeral });
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
                .setTitle(`📂 Category: ${categoryOption}`)
                .setDescription('Select a command to view details.')
                .setColor(0x00AE86)
                .setTimestamp();

            await interaction.reply({ embeds: [categoryEmbed], components: [commandRow], flags: MessageFlags.Ephemeral });

            const commandCollector = interaction.channel.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 60000,
                filter: c => c.user.id === interaction.user.id && c.customId === 'select_command'
            });

            commandCollector.on('collect', async c => {
                const selectedCommand = authorizedCommands.find(cmd => cmd.data.name === c.values[0]);

                if (!selectedCommand) {
                    return c.reply({ content: 'Command not found or you lack permission.', flags: MessageFlags.Ephemeral });
                }

                // Dynamically set usage for the selected command
                const commandId = client.commandIds.get(selectedCommand.data.name);
                let usage = commandId ? `</${selectedCommand.data.name}:${commandId}>` : `/${selectedCommand.data.name}`;

                if (selectedCommand.options && selectedCommand.options.length > 0) {
                    const optionsString = selectedCommand.options
                        .map(opt => (opt.required ? `<${opt.name}>` : `[${opt.name}]`))
                        .join(' ');
                    usage += ` ${optionsString}`;
                }

                selectedCommand.usage = usage;

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
                await interaction.editReply({ components: [] }).catch(() => { });
            });

            return;
        }

        // If no options are provided, show category selection
        if (categories.length === 0) {
            return interaction.reply({ content: 'No commands available for you.', flags: MessageFlags.Ephemeral });
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
            const commandsInCategory = authorizedCommands.filter(cmd => (cmd.category || 'Uncategorized') === selectedCategory);

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
                const selectedCommand = authorizedCommands.find(cmd => cmd.data.name === c.values[0]);

                if (!selectedCommand) {
                    return c.reply({ content: 'Command not found or you lack permission.', flags: MessageFlags.Ephemeral });
                }

                // Dynamically set usage for the selected command
                const commandId = client.commandIds.get(selectedCommand.data.name);
                let usage = commandId ? `</${selectedCommand.data.name}:${commandId}>` : `/${selectedCommand.data.name}`;

                if (selectedCommand.options && selectedCommand.options.length > 0) {
                    const optionsString = selectedCommand.options
                        .map(opt => (opt.required ? `<${opt.name}>` : `[${opt.name}]`))
                        .join(' ');
                    usage += ` ${optionsString}`;
                }

                selectedCommand.usage = usage;

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
                await i.editReply({ components: [] }).catch(() => { });
            });
        });

        collector.on('end', async () => {
            await interaction.editReply({ components: [] }).catch(() => { });
        });
    }
};