const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
     data: new SlashCommandBuilder()
          .setName('serverinfo')
          .setDescription('Displays information about this server'),
     name: 'serverinfo',
     category: 'info',
     async execute(client, interaction) {
          const { guild } = interaction;

          const owner = await guild.fetchOwner();
          const createdAt = `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`;
          const rolesCount = guild.roles.cache.size;
          const emojisCount = guild.emojis.cache.size;
          const channelsCount = guild.channels.cache.size;
          const memberCount = guild.memberCount;

          const embed = new EmbedBuilder()
               .setTitle(`📊 Server Information`)
               .setThumbnail(guild.iconURL({ dynamic: true }))
               .setColor(0x5865F2)
               .addFields(
                    { name: '📛 Server Name', value: guild.name, inline: true },
                    { name: '🆔 Server ID', value: guild.id, inline: true },
                    { name: '👑 Owner', value: `${owner.user.tag}`, inline: true },
                    { name: '👥 Member Count', value: `${memberCount}`, inline: true },
                    { name: '📁 Channels', value: `${channelsCount}`, inline: true },
                    { name: '📌 Role Count', value: `${rolesCount}`, inline: true },
                    { name: '😄 Emojis', value: `${emojisCount}`, inline: true },
                    { name: '📅 Created On', value: `${createdAt}`, inline: false }
               )
               .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
               .setTimestamp();

          await interaction.reply({ embeds: [embed] });
     }
};
