const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');
const { saveLofiSession } = require('../../utils/lofiStorage');

const STREAM_URL = 'https://stream-157.zeno.fm/0r0xa792kwzuv?zt=...'; // pakai URL milikmu

module.exports = {
     data: new SlashCommandBuilder()
          .setName('lofi')
          .setDescription('Play lofi music from a 24/7 stream'),
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

               const resource = createAudioResource(STREAM_URL, {
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
                    .setDescription(`Now playing **lofi** 24/7 radio in <#${channel.id}>`)
                    .setFooter({ text: 'Enjoy the vibes!' })
                    .setTimestamp();

               await interaction.editReply({ embeds: [embed] });

          } catch (error) {
               console.error('Error playing lofi music:', error);
               await interaction.editReply({ content: '❌ Something went wrong while trying to play the lofi music!', flags: MessageFlags.Ephemeral });
          }
     }
};
