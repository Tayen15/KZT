const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { readdirSync } = require('fs');
const { prefix, iconLink } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Displays all commands in this bot and information about commands.")
        .addStringOption(option => option.setName('command')
        .setDescription('The name of the command to get more information about.')),
    name: "help",
    description: "Displays all commands in this bot.",
    aliases: [],
    usage: "{prefix}help",
    category: "core",
    cooldown: 5,
    async execute(interaction, args) {
        const { options, user } = interaction;
        const commandArg  = options.getString('command');
        const { client } = interaction;

        if (!commandArg) {
            const commandCategories = {};

            // Iterate through the files in the commands directory
            const commandFiles = readdirSync('./commands');
            for (const file of commandFiles) {
                const command = require(`../../commands/${file}`);
                const category = command.category || 'uncategorized';
                commandCategories[category] = commandCategories[category] || [];
                commandCategories[category].push(command.name);
            }

            // Create the embed fields for each category
            const fields = [];
            for (const category in commandCategories) {
                const commandList = commandCategories[category].map(cmd => `\`${cmd}\``).join(', ');
                fields.push({ name: category, value: commandList, inline: false });
            }

            await interaction.reply({
                content: 'Here are the available commands:',
                embeds: [
                    {
                        author: {
                            name: `${client.user.username}`,
                            iconURL: `${iconLink}`
                        },
                        fields,
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
