const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');
const play = require('play-dl');
const { saveLofiSession } = require('../../utils/lofiStorage');

const YT_LOFI_URL = 'https://www.youtube.com/watch?v=jfKfPfyJRdk';

module.exports = {
     data: new SlashCommandBuilder()
          .setName('lofi')
          .setDescription('Play lofi music from YouTube 24/7'),
     name: 'lofi',
     category: 'music',
     async execute(client, interaction) {
          const channel = interaction.member.voice.channel;
          if (!channel) {
               return interaction.reply({ content: '❌ Please join a voice channel first!', flags: MessageFlags.Ephemeral });
          }

          try {
               // Menunda respons
               await interaction.deferReply({ content: '⏳ Trying to play lofi music...', flags: MessageFlags.Ephemeral });

               // Ambil stream dari YouTube
               const stream = await play.stream(YT_LOFI_URL);
               const resource = createAudioResource(stream.stream, {
                    inputType: stream.type,
                    inlineVolume: true
               });

               resource.volume.setVolume(0.5); // Sesuaikan volume

               const player = createAudioPlayer({
                    behaviors: {
                         noSubscriber: NoSubscriberBehavior.Play,
                    }
               });

               player.play(resource);

               // Bergabung ke channel suara
               const connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    selfDeaf: false
               });

               connection.subscribe(player);

               // Save lofi session to storage
               saveLofiSession(interaction.guild.id, interaction.member.voice.channel.id);

               // Menangani event ketika player idle
               player.on(AudioPlayerStatus.Idle, async () => {
                    try {
                         const newStream = await play.stream(YT_LOFI_URL);
                         const newResource = createAudioResource(newStream.stream, {
                              inputType: newStream.type,
                              inlineVolume: true
                         });
                         newResource.volume.setVolume(0.5);
                         player.play(newResource);
                    } catch (error) {
                         console.error('Error during stream restart:', error);
                    }
               });

               const embed = new EmbedBuilder()
                    .setColor('#1DB954') // Soft green color
                    .setTitle('🎧 Lofi Music')
                    .setDescription(`Now playing **lofi** music from YouTube in <#${channel.id}>`)
                    .setFooter({ text: 'Enjoy the vibes!' }) 
                    .setTimestamp();

               await interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          } catch (error) {
               console.error('Error playing lofi music:', error);
               await interaction.editReply({ content: '❌ Something went wrong while trying to play the lofi music!', flags: MessageFlags.Ephemeral });
          }
     }
};
