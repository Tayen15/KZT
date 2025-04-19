const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');
const play = require('play-dl');
const { saveLofiSession } = require('../../utils/lofiStorage');

const YT_LOFI_URL = 'https://www.youtube.com/watch?v=28KRPhVzCus';

module.exports = {
     data: new SlashCommandBuilder()
          .setName('lofi')
          .setDescription('Play lofi music from a single YouTube video'),
     name: 'lofi',
     category: 'music',
     async execute(client, interaction) {
          const channel = interaction.member.voice.channel;
          if (!channel) {
               return interaction.reply({ content: '❌ Please join a voice channel first!', flags: MessageFlags.Ephemeral });
          }

          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          try {
               const player = createAudioPlayer({
                    behaviors: {
                         noSubscriber: NoSubscriberBehavior.Play
                    }
               });

               const stream = await play.stream(YT_LOFI_URL);
               const resource = createAudioResource(stream.stream, {
                    inputType: stream.type,
                    inlineVolume: true
               });
               resource.volume.setVolume(1.0);
               player.play(resource);

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
                    .setDescription(`Now playing **lofi** music from YouTube in <#${channel.id}>`)
                    .setFooter({ text: 'Enjoy the vibes!' })
                    .setTimestamp();

               await interaction.editReply({ embeds: [embed] });

          } catch (error) {
               console.error('Error playing lofi music:', error);
               await interaction.editReply({ content: '❌ Something went wrong while trying to play the lofi music!', flags: MessageFlags.Ephemeral });
          }
     }
};
