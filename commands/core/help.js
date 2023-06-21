const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { prefix, iconLink } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Displays all command in this bot and Information about command.")
        .addStringOption(option => option.setName('command')
        .setDescription('The name of the command to get more information about.')),
    name: "help",
    description: "Displays all command in this bot.",
    aliases: [],
    usage: "{prefix}help",
    category: "core",
    cooldown: 5,
    async execute(interaction, args) {
        const { options, user } = interaction;
        const commandArg  = options.getString('command');
        const { client } = interaction;
        
        if (!commandArg) {
            const infoCommands = client.commands.filter(x => x.category === 'info').map((x) => `\`${x.name}\``).join(', ');
            const musicCommands = client.commands.filter(x => x.category === 'music').map((x) => `\`${x.name}\``).join(', ');
    
            await interaction.reply({
                content: 'Here are the available commands:',
                embeds: [
                    {
                        author: {
                            name: `${client.user.username}`,
                            iconURL: `${iconLink}`
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
            const commandName = commandArg.toLowerCase();
            const command = client.commands.get(commandName) || client.commands.find(x => x.aliases && x.aliases.includes(commandName));
    
            if (!command) return await interaction.reply(`Cannot find command: **${commandArg}**`);
    
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