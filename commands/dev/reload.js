const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reloads a specific file or command')
        .addStringOption(option => 
            option.setName('command')
                .setDescription('The command you want to reload')
                .setRequired(true)
        ),
    name: 'reload',
    description: 'Reloads a specific file or command',
    aliases:['r'],
    category: 'dev',
    async execute(interaction) {
        const commandName = interaction.options.getString('command').toLowerCase();
        const directories = ['info', 'music', 'core', 'dev'];
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
            return interaction.reply('The command was not found!');
        }

        const pull = require(`../${directory}/${commandName}.js`);
        interaction.client.commands.set(commandName, pull);
        await interaction.reply(`Command **${commandName.toUpperCase()}** has been reloaded.`);

        setTimeout(() => {
            interaction.deleteReply();
        }, 7000);
        
        console.log(`Command: ${commandName.toUpperCase()} Reload By: ${interaction.user.tag}`);
    },
};
