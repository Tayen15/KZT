const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const utils = require('axios');
const config = require('../../config.json');

module.exports = {
     data: new SlashCommandBuilder()
          .setName('list')
          .setDescription('Sends the actual list players online'),
     name: "list",
     description: 'Sends the actual list players online',
     aliases: [],
     category: 'minecraft',
     usage: '{prefix}list',
     async execute(interaction) {
          utils.get(`https://api.mcstatus.io/v2/status/java/${config.SERVER_IP}:${config.SERVER_PORT}`)
               .then((response) => {
                    const trueList = response.data.players.list ? "\n\`\`\`" + response.data.players.list.map(p => ` ${p.name_clean} `).join('\r\n') + "\`\`\`" : "";

                    const serverEmbed = new EmbedBuilder()
                         .setAuthor({ name: config.SERVER_NAME, iconURL: config.iconLink })
                         .setURL('https://youtu.be/dQw4w9WgXcQ')
                         .setThumbnail(`${config.iconLink}`)
                         .addFields(
                              { name: 'Status', value: '\`\`\`🟢 Online\`\`\`' },
                              { name: 'Players', value: `\`\`\`${response.data.players.online}/${response.data.players.max}\`\`\``, inline: true },
                              { name: 'Connect Server', value: `\`\`\`${config.SERVER_IP}:${config.SERVER_PORT}\`\`\``, inline: false},
                              { name: 'List Playing', value: `${trueList}`, inline: false },
                         )
                         .setFooter({ text: 'Kyonezet x PPLG'})
                         .setTimestamp();
                    interaction.reply({ embeds: [statsEmbed] });
               })
               .catch((error) => {
                    const errorEmbed = new EmbedBuilder()
                         .setAuthor({ name: config.SERVER_NAME, iconURL: config.iconLink })
                         .setURL('https://youtu.be/dQw4w9WgXcQ')
                         .setThumbnail(`${config.iconLink}`)
                         .addFields(
                              { name: 'Status', value: '\`\`\`🔴 Offline\`\`\`', inline: true },
                              { name: 'Players', value: `\`\`\`None\`\`\``, inline: true },
                              { name: 'Connect Server', value: `\`\`\`${config.SERVER_IP}:${config.SERVER_PORT}\`\`\``, inline: false},
                              { name: 'List Playing', value: `\`\`\`No player(s) is creating!\`\`\``, inline: false },
                         )
                         .setFooter({ text: 'Kyonezet x PPLG'})
                         .setTimestamp();
                    interaction.reply({ embeds: [errorEmbed] });
               })
     }
}