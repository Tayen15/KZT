const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { prefix } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Displays all command in this bot and Information about command."),
    name: "help",
    description: "Displays all command in this bot.",
    aliases: [],
    usage: "{prefix}help",
    category: "core",
    cooldown: 5,
    async execute(interaction) {
        const { options, user } = interaction;
        const args = options.getString('args');
        const { client } = interaction;
        
        if (!args) {
            const infoCommands = client.commands.filter(x => x.category === 'info').map((x) => `\`${x.name}\``).join(', ');
            const musicCommands = client.commands.filter(x => x.category === 'music').map((x) => `\`${x.name}\``).join(', ');

            await interaction.reply({
                content: 'Here are the available commands:',
                embeds: [
                    {
                        author: {
                            name: `${client.user.username}`,
                            iconURL: 'https://cdn.discordapp.com/avatars/785398919923892264/fe7115806c2f0e77d9a999bfdf79d408.png'
                        },
                        fields: [
                            { name: 'Info', value: infoCommands, inline: true },
                            { name: 'Music', value: musicCommands, inline: false }
                        ],
                        footer: {
                            text: `For more information on a command: /help <command>`
                        }
                    }
                ]
            });
        } else {
            const command = client.commands.get(args.toLowerCase()) || client.commands.find(x => x.aliases && x.aliases.includes(args.toLowerCase()));

            if (!command) return await interaction.reply(`Cannot find command: **${args}**`);

            await interaction.reply({
                content: '',
                embeds: [
                    {
                        author: {
                            name: `Command ${command.name}`
                        },
                        fields: [
                            { name: 'Category', value: command.category, inline: true },
                            { name: 'Aliases', value: command.aliases.length < 1 ? 'None' : command.aliases.join(', '), inline: true },
                            { name: 'Usage', value: `/${command.name}`, inline: false }
                        ],
                        description: command.description,
                        footer: {
                            text: `${user.username}`
                        }
                    }
                ]
            });
        }
    },
};