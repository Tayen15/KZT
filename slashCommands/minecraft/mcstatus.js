const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../../config.json');

module.exports = {
     data: new SlashCommandBuilder()
          .setName('mcstatus')
          .setDescription('Check the status of the Minecraft server.'),
     name: 'mcstatus',     
     category: 'minecraft',
     async execute(interaction) {
          try {
               const getServerStatus = await axios.get(`https://api.mcsrvstat.us/3/${config.SERVER_IP}`);
               const { online, motd, version, players, ip, port, icon, debug, ping } = getServerStatus.data;

               const playerList = (players?.list && players.list.length > 0)
                    ? `\n\`\`\`\n${players.list.map(p => `${p.name} (${p.uuid})`).join('\n')}\n\`\`\``
                    : '```No players online.```';

               const serverIcon = icon ? `https://api.mcsrvstat.us/icon/${config.SERVER_IP}` : interaction.client.user.displayAvatarURL();

               const cleanMotd = motd.clean.join('\n');

               const embed = new EmbedBuilder()
                    .setAuthor({ name: config.SERVER_NAME, iconURL: serverIcon })
                    .setThumbnail(serverIcon)
                    .setColor(online ? 0x00ff00 : 0xff0000)
                    .addFields(
                         { name: '📡 Status', value: `\`\`\`${online ? '🟢 Online' : '🔴 Offline'}\`\`\``, inline: false },
                         { name: '📌 MOTD', value: `\`\`\`${cleanMotd}\`\`\`` },
                         { name: '🕹️ Version', value: `\`\`\`${version}\`\`\``, inline: true },
                         { name: '👥 Players', value: `\`\`\`${players.online}/${players.max}\`\`\``, inline: false },
                         { name: '🌍 Java Edition', value: `\`\`\`${config.SERVER_IP}\`\`\``, inline: true },
                         { name: '🎮 Bedrock Edition', value: `\`\`\`${ip}:19132\`\`\``, inline: true },
                         { name: '🎭 List Playing', value: playerList }
                    )
                    .setFooter({ text: `Server Info | ${interaction.client.user.username}` })
                    .setTimestamp();

               await interaction.reply({ embeds: [embed] });
          } catch (error) {
               console.error('[ERROR] Failed to fetch server status:', error.message);

               const errorEmbed = new EmbedBuilder()
                    .setAuthor({ name: config.SERVER_NAME, iconURL: interaction.client.user.displayAvatarURL({ dynamic: true }) })
                    .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
                    .setColor(0xff0000)
                    .setTitle('🔴 Server Offline')
                    .addFields(
                         { name: '📡 Status', value: '```Offline```', inline: false },
                         { name: '🌍 Java Edition', value: `\`\`\`${config.SERVER_IP}\`\`\``, inline: true },
                         { name: '🎮 Bedrock Edition', value: `\`\`\`${config.SERVER_IP}:${config.SERVER_PORT}\`\`\``, inline: true },
                         { name: '👥 Players', value: '```None```', inline: false }
                    )
                    .setFooter({ text: `Server Info | ${interaction.client.user.username}` })
                    .setTimestamp();

               await interaction.reply({ embeds: [errorEmbed] });
          }
     }
};
