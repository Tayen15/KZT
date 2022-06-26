const { MessageEmbed } = require('discord.js');
const prefix = require('../../config');

module.exports = {
    name: "help",
    description: "Displays all command in this bot.",
    aliases: [],
    usage: "{prefix}help",
    category: "core",
    cooldown: 5,
    execute(client, message, args) {
        
        if (!args[0]) {
            const infor = message.client.commands.filter(x => x.category == 'info').map((x) => '`' + x.name + '`').join(', ');
            const mod = message.client.commands.filter(x => x.category == 'moderation').map((x) => '`' + x.name + '`').join(', ');
            const musik = message.client.commands.filter(x => x.category == 'music').map((x) => '`' + x.name + '`').join(', ');

            const helpEmbed = new MessageEmbed()
            .setAuthor({
                name: `${client.user.username} Commands`,
                iconURL: 'https://cdn.discordapp.com/avatars/785398919923892264/fe7115806c2f0e77d9a999bfdf79d408.png'
            })
            .addFields(
                { name: 'Info', value: `${infor}`, inline: false },
                { name: 'Music', value: `${musik}`, inline: false }
            )
            .setFooter({
                text: `For more information on a command try: ${prefix}help <command>`
            })
            message.channel.send({ embeds: [helpEmbed] });

        } else {
            const command = message.client.commands.get(args.join(" ").toLowerCase()) || message.client.commands.find(x => x.aliases && x.aliases.includes(args.join(" ").toLowerCase()));

            if (!command) return message.channel.send(
                `Cannot find command: **${args}**`
            );
        }
    },
};