const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const { saveLofiSession } = require('../../utils/lofiStorage');

const STREAM_URL = 'https://stream-157.zeno.fm/0r0xa792kwzuv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiIwcjB4YTc5Mmt3enV2IiwiaG9zdCI6InN0cmVhbS0xNTcuemVuby5mbSIsInJ0dGwiOjUsImp0aSI6IkVwRE53VEJIVGNDY0RJTmlpUzlRb1EiLCJpYXQiOjE3NDY4NzU2NTYsImV4cCI6MTc0Njg3NTcxNn0.A8kS0ZSXDoVvPX_gOCz2DJa0slpoJ2jt_7TryS5EKoo&zt='; // pakai URL milikmu

module.exports = {
     data: new SlashCommandBuilder()
          .setName('lofi')
          .setDescription('Play lofi music from a 24/7 stream'),
     name: 'lofi',
     category: 'music',
     async execute(interaction) {
          const channel = interaction.member.voice.channel;
          if (!channel) {
               return interaction.reply({ content: '❌ Please join a voice channel first!', flags: MessageFlags.Ephemeral });
          }
          
          await interaction.deferReply();

          try {
               const player = createAudioPlayer({
                    behaviors: {
                         noSubscriber: NoSubscriberBehavior.Play
                    }
               });

               player.on('error', (err) => {
                    console.error('❌ [Lofi] Player error:', err.message);
               });

               const resource = createAudioResource(STREAM_URL, {
                    inlineVolume: true
               });
               resource.volume.setVolume(1.0);
               
               resource.playStream.on('error', (err) => {
                    console.error('❌ [Lofi] Stream error:', err.message);
               });
               
               player.play(resource);

               const connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    selfDeaf: true
               });

               connection.on('error', (err) => {
                    console.error('❌ [Lofi] Connection error:', err.message);
               });

               connection.subscribe(player);

               try {
                    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
               } catch (readyErr) {
                    console.error('❌ [Lofi] Connection failed to become ready:', readyErr.message);
               }

               saveLofiSession(interaction.guild.id, interaction.member.voice.channel.id);

               const embed = new EmbedBuilder()
                    .setColor('#1DB954')
                    .setTitle('🎧 Lofi Music')
                    .setDescription(`Now playing **lofi** 24/7 radio in <#${channel.id}>`)
                    .setFooter({ text: 'Enjoy the vibes!' })
                    .setTimestamp();

               await interaction.editReply({ embeds: [embed] });

          } catch (error) {
               console.error('❌ [Lofi] Error:', error);
               await interaction.editReply({ content: '❌ Something went wrong while trying to play the lofi music!', flags: MessageFlags.Ephemeral });
          }
     }
};
