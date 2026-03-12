const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Genius = require('genius-lyrics');
const cfg = (() => { try { return require('../../config.json'); } catch { return {}; } })();

module.exports = {
     data: new SlashCommandBuilder()
          .setName('lyrics')
          .setDescription('Find the lyrics of any song.')
          .addStringOption(option =>
               option
                    .setName('song')
                    .setDescription('The title of the song to search for lyrics')
                    .setRequired(true)
          ),
     name: 'lyrics',
     category: 'music',
     ownerOnly: false,
     requiredPermissions: [], 
     options: [
          { name: 'song', type: 'STRING', required: true, description: 'The title of the song to search for lyrics' }
     ],
     async execute(interaction) {

          const songTitle = interaction.options.getString('song');
          await interaction.deferReply({});

          try {
               const token = process.env.GENIUS_API_TOKEN || cfg.geniusApiToken;
               if (!token) {
                    return interaction.editReply({ content: 'GENIUS_API_TOKEN is not configured.', flags: MessageFlags.Ephemeral });
               }
               const genius = new Genius.Client(token);

               const searches = await genius.songs.search(songTitle);
               if (!searches || searches.length === 0) {
                    return interaction.editReply({ content: `No songs found for "**${songTitle}**".`, flags: MessageFlags.Ephemeral });
               }

               const song = searches[0];
               const lyrics = await song.lyrics();

               if (!lyrics) {
                    return interaction.editReply({ content: `Lyrics not available for "**${song.title}** by ${song.artist.name}.`, flags: MessageFlags.Ephemeral });
               }

               const embed = new EmbedBuilder()
                    .setTitle(`🎵 Lyrics: ${song.title} by ${song.artist.name}`)
                    .setURL(song.url)
                    .setThumbnail(song.image)
                    .setColor(0x00AE86)
                    .setTimestamp();

               if (lyrics.length <= 4096) {
                    embed.setDescription(lyrics);
               } else {
                    const parts = [];
                    let currentPart = '';
                    const lines = lyrics.split('\n');

                    for (const line of lines) {
                         if (currentPart.length + line.length + 1 > 4096) {
                              parts.push(currentPart);
                              currentPart = line + '\n';
                         } else {
                              currentPart += line + '\n';
                         }
                    }
                    if (currentPart) parts.push(currentPart);

                    embed.setDescription(parts[0]);
                    embed.setFooter({ text: `Showing part 1 of ${parts.length}. Use a lyrics website for the full text.` });
               }

               await interaction.editReply({ embeds: [embed] });
          } catch (err) {
               console.error('Error fetching lyrics:', err);
               await interaction.editReply({ content: '❌ Failed to fetch lyrics. Please try again later.', flags: MessageFlags.Ephemeral });
          }
     }
};