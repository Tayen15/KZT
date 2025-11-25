const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const fetch = require('node-fetch');
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
               console.log('🎧 [Lofi] Starting lofi stream setup...');

               // Quick connectivity check (helps detect Heroku outbound/network issues)
               try {
                    const head = await fetch(STREAM_URL, { method: 'HEAD' });
                    console.log(`🔎 [Lofi] HEAD status: ${head.status}`);
               } catch (netErr) {
                    console.warn('⚠️ [Lofi] HEAD request failed, stream may be unreachable:', netErr.message);
               }

               const player = createAudioPlayer({
                    behaviors: {
                         noSubscriber: NoSubscriberBehavior.Play
                    }
               });

               player.on('error', (err) => {
                    console.error('❌ [LofiPlayer] Error:', err.message);
               });

               player.on('stateChange', (oldState, newState) => {
                    console.log(`🔄 [LofiPlayer] ${oldState.status} -> ${newState.status}`);
               });

               const resource = createAudioResource(STREAM_URL, {
                    inlineVolume: true
               });
               resource.volume.setVolume(1.0);
               player.play(resource);

               const connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    selfDeaf: true
               });

               connection.on('stateChange', (oldState, newState) => {
                    console.log(`🔌 [Voice] ${oldState.status} -> ${newState.status}`);
               });

               connection.subscribe(player);

               // Await readiness (helps catch failed encryption libs / opus problems on Heroku)
               try {
                    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
                    console.log('✅ [Voice] Connection ready.');
               } catch (readyErr) {
                    console.error('❌ [Voice] Connection failed to become ready:', readyErr.message);
               }

               saveLofiSession(interaction.guild.id, interaction.member.voice.channel.id);

               const embed = new EmbedBuilder()
                    .setColor('#1DB954')
                    .setTitle('🎧 Lofi Music')
                    .setDescription(`Now playing **lofi** 24/7 radio in <#${channel.id}>`)
                    .setFooter({ text: 'Enjoy the vibes!' })
                    .setTimestamp();

               await interaction.editReply({ embeds: [embed] });
               console.log('✅ [Lofi] Playback initialized and reply sent.');

          } catch (error) {
               console.error('❌ [Lofi] Error playing lofi music:', error);
               await interaction.editReply({ content: '❌ Something went wrong while trying to play the lofi music!', flags: MessageFlags.Ephemeral });
          }
     }
};
