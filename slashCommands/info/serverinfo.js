const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
     data: new SlashCommandBuilder()
          .setName('serverinfo')
          .setDescription('Displays information about this server'),
     name: 'serverinfo',
     category: 'info',
     async execute(interaction) {
          const { guild } = interaction;

          const owner = await guild.fetchOwner();
          const createdAt = `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`;
          const rolesCount = guild.roles.cache.size;
          const emojisCount = guild.emojis.cache.size;
          const channelsCount = guild.channels.cache.size;
          const memberCount = guild.memberCount;
          const boostCount = guild.premiumSubscriptionCount || 0;
          const boostTier = guild.premiumTier ? `Tier ${guild.premiumTier}` : 'None';
          const iconURL = guild.iconURL({ dynamic: true, size: 1024 });

          // Menghitung jumlah channel berdasarkan tipe
          const channelTypes = {
               text: guild.channels.cache.filter(ch => ch.type === 0).size, // Text channels
               voice: guild.channels.cache.filter(ch => ch.type === 2).size, // Voice channels
               category: guild.channels.cache.filter(ch => ch.type === 4).size, // Categories
               stage: guild.channels.cache.filter(ch => ch.type === 13).size, // Stage channels
               forum: guild.channels.cache.filter(ch => ch.type === 15).size // Forum channels
          };

          const embed = new EmbedBuilder()
               .setTitle(`📊 Server Information`)
               .setThumbnail(iconURL)
               .setColor(0x5865F2)
               .addFields(
                    { name: 'Server Name', value: `- ${guild.name}`, inline: false },
                    { name: 'Server ID', value: `- ${guild.id}`, inline: false },
                    { name: 'Owner', value: `- ${owner.user.tag}`, inline: false },
                    { name: 'Member Count', value: `- ${memberCount}`, inline: false },
                    { name: 'Role Count', value: `- ${rolesCount}`, inline: false },
                    { name: 'Emojis', value: `- ${emojisCount}`, inline: false },
                    { name: 'Boosts', value: `- ${boostCount} (${boostTier})`, inline: false },
                    { name: 'Icon URL', value: `- [View Icon](${iconURL})`, inline: false },
                    { name: 'Created On', value: `- ${createdAt}`, inline: false },
                    {
                         name: 'Channels',
                         value: `- Total: ${channelsCount}\n  - Text: ${channelTypes.text}\n  - Voice: ${channelTypes.voice}\n  - Category: ${channelTypes.category}\n  - Stage: ${channelTypes.stage}\n  - Forum: ${channelTypes.forum}`,
                         inline: false
                    }
               )
               .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
               .setTimestamp();

          await interaction.reply({ embeds: [embed] });
     }
};
