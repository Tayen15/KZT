const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../../config.json');

module.exports = {
     data: new SlashCommandBuilder()
          .setName('list')
          .setDescription('Displays the current list of players online'),
     category: 'minecraft',
     usage: '{prefix}list',
     async execute(client, interaction) {
          try {
               const getServerStatus = await axios.get(`https://api.mcstatus.io/v2/status/java/${config.SERVER_IP}:${config.SERVER_PORT}`);
               const getServerIcon = await axios.get(`https://api.mcstatus.io/v2/icon/${config.SERVER_IP}:${config.SERVER_PORT}`);
               const { players } = getServerStatus.data;
               const { icon } = getServerIcon.data;

               const playerList = players.list?.length
                    ? `\n\`\`\`\n${players.list.map(p => ` ${p.name_clean} `).join('\n')}\n\`\`\``
                    : 'No players online.';


               const embed = new EmbedBuilder()
                    .setAuthor({ name: config.SERVER_NAME, iconURL: icon })
                    .setURL('https://youtu.be/dQw4w9WgXcQ')
                    .setThumbnail(icon)
                    .addFields(
                         { name: 'Status', value: '```🟢 Online```', inline: false },
                         { name: 'Players', value: `\`\`\`${players.online}/${players.max}\`\`\``, inline: true },
                         { name: 'Connect Server', value: `\`\`\`${config.SERVER_IP}:${config.SERVER_PORT}\`\`\``, inline: false },
                         { name: 'List Playing', value: playerList, inline: false }
                    )
                    .setFooter({ text: client.user.username })
                    .setTimestamp();

               await interaction.reply({ embeds: [embed] });
          } catch (error) {
               const errorEmbed = new EmbedBuilder()
                    .setAuthor({ name: config.SERVER_NAME, iconURL: client.user.displayAvatarURL({ dynamic: true }) })
                    .setURL('https://youtu.be/dQw4w9wGxC')
                    .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
                    .addFields(
                         { name: 'Status', value: '```🔴 Offline```', inline: false },
                         { name: 'Players', value: '```None```', inline: true },
                         { name: 'Connect Server', value: `\`\`\`${config.SERVER_IP}:${config.SERVER_PORT}\`\`\``, inline: false },
                         { name: 'List Playing', value: '```No players online.```', inline: false }
                    )
                    .setFooter({ text: client.user.username })
                    .setTimestamp();

               await interaction.reply({ embeds: [errorEmbed] });
               console.log(error);
          }
     }
};