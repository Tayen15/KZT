const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');
const play = require('play-dl');
const { saveLofiSession } = require('../../utils/lofiStorage');

const YT_LOFI_PLAYLIST = [
     'https://www.youtube.com/watch?v=sF80I-TQiW0', // lofi 1
     'https://www.youtube.com/watch?v=l_7e2ZamUpI', // lofi 2
     'https://www.youtube.com/watch?v=e94hCLHEEsk', // lofi 3
     'https://www.youtube.com/watch?v=OO2kPK5-qno',  // lofi 4
     'https://www.youtube.com/watch?v=Q89Dzox4jAE',
     'https://www.youtube.com/watch?v=ZlyR0Ou11Qc'
];

module.exports = {
     data: new SlashCommandBuilder()
          .setName('lofi')
          .setDescription('Play lofi music from YouTube playlist (non-live)'),
     name: 'lofi',
     category: 'music',
     async execute(client, interaction) {
          const channel = interaction.member.voice.channel;
          if (!channel) {
               return interaction.reply({ content: '❌ Please join a voice channel first!', flags: MessageFlags.Ephemeral });
          }

          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          try {
               let currentIndex = 0;

               const player = createAudioPlayer({
                    behaviors: {
                         noSubscriber: NoSubscriberBehavior.Play
                    }
               });

               async function playTrack(index) {
                    const url = YT_LOFI_PLAYLIST[index];
                    const stream = await play.stream(url);
                    const resource = createAudioResource(stream.stream, {
                         inputType: stream.type,
                         inlineVolume: true
                    });
                    resource.volume.setVolume(0.5);
                    player.play(resource);
               }

               player.on(AudioPlayerStatus.Idle, async () => {
                    try {
                         currentIndex = (currentIndex + 1) % YT_LOFI_PLAYLIST.length;
                         await playTrack(currentIndex);
                    } catch (err) {
                         console.error('Error playing next lofi video:', err);
                    }
               });

               await playTrack(currentIndex);

               const connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    selfDeaf: false
               });

               connection.subscribe(player);

               saveLofiSession(interaction.guild.id, interaction.member.voice.channel.id);

               const embed = new EmbedBuilder()
                    .setColor('#1DB954')
                    .setTitle('🎧 Lofi Music')
                    .setDescription(`Now playing **lofi** playlist from YouTube in <#${channel.id}>`)
                    .setFooter({ text: 'Enjoy the vibes!' })
                    .setTimestamp();

               await interaction.editReply({ embeds: [embed] });

          } catch (error) {
               console.error('Error playing lofi music:', error);
               await interaction.editReply({ content: '❌ Something went wrong while trying to play the lofi playlist!', flags: MessageFlags.Ephemeral });
          }
     }
};
