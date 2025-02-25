const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { iconLink } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Displays all commands in this bot and their information.")
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Get details about a specific command.')
        ),
    name: "help",
    description: "Shows available bot commands.",
    aliases: [],
    usage: "{prefix}help",
    category: "core",
    cooldown: 5,
    async execute(interaction) {
        const { client, options, user } = interaction;
        const commandArg = options.getString('command');

        if (!commandArg) {
            const categories = ['info', 'music', 'minecraft'];
            const categoryFields = categories.map(category => ({
                name: category.charAt(0).toUpperCase() + category.slice(1),
                value: client.commands
                    .filter(cmd => cmd.category === category)
                    .map(cmd => `</${cmd.name}:${cmd.id}>`).join(', ') || 'No commands available.',
                inline: false
            }));

            const helpEmbed = new EmbedBuilder()
                .setAuthor({ name: client.user.username, iconURL: iconLink })
                .setTitle('Available Commands')
                .addFields(categoryFields)
                .setFooter({ text: "For more details: /help <command>" })
                .setTimestamp();

            return interaction.reply({ embeds: [helpEmbed] });
        }

        // Detail untuk command tertentu
        const commandName = commandArg.toLowerCase();
        const command = client.commands.get(commandName) || 
                        client.commands.find(cmd => cmd.aliases?.includes(commandName));

        if (!command) return interaction.reply(`❌ Cannot find command: **${commandArg}**`);

        const commandEmbed = new EmbedBuilder()
            .setTitle(`Command: ${command.name}`)
            .setDescription(command.description)
            .addFields(
                { name: 'Category', value: command.category, inline: true },
                { name: 'Aliases', value: command.aliases.length > 0 ? command.aliases.join(', ') : 'None', inline: true },
                { name: 'Usage', value: `\`${command.usage.replace('{prefix}', '/')}\``, inline: false }
            )
            .setFooter({ text: `Requested by: ${user.username}` })
            .setTimestamp();

        return interaction.reply({ embeds: [commandEmbed] });
    },
};
