const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { ownerOnly } = require('../info/help');

const directories = ['info', 'core', 'minecraft', 'moderation', 'music', 'dev'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reloads a specific file or command')
        .addStringOption(option => {
            const commandChoices = [];

            // Generate command list
            for (const dir of directories) {
                const commandPath = path.join(__dirname, '..', dir);
                if (!fs.existsSync(commandPath)) continue;

                const files = fs.readdirSync(commandPath).filter(file => file.endsWith('.js'));

                for (const file of files) {
                    const commandName = file.replace('.js', '');
                    if (!commandChoices.some(c => c.name === commandName)) {
                        commandChoices.push({ name: commandName, value: commandName });
                    }
                }
            }

            return option
                .setName('command')
                .setDescription('Select the command you want to reload')
                .setRequired(true)
                .addChoices(...commandChoices.slice(0, 25)); 
        }),
    name: 'reload',
    category: 'dev',
    ownerOnly: true,
    options: [
        { name: 'command', type: 'STRING', required: true, description: 'The command to reload' }
    ],
    async execute(interaction) {
        const commandName = interaction.options.getString('command').toLowerCase();
        let directory;

        for (const dir of directories) {
            try {
                delete require.cache[require.resolve(`../${dir}/${commandName}.js`)];
                directory = dir;
                break;
            } catch {
                continue;
            }
        }

        if (!directory) {
            return interaction.reply({ content: 'Command not found!', flags: MessageFlags.Ephemeral });
        }

        const pull = require(`../${directory}/${commandName}.js`);
        interaction.client.commands.set(commandName, pull);

        await interaction.reply({ content: `✅ Command **${commandName.toUpperCase()}** has been successfully reloaded.`, flags: MessageFlags.Ephemeral });

        console.log(`[RELOAD] Command: ${commandName.toUpperCase()} by ${interaction.user.tag}`);
    }
};
