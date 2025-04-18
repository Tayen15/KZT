const { getLofiSessions } = require('../utils/lofiStorage');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');
const play = require('play-dl');

const YT_URL = 'https://www.youtube.com/watch?v=jfKfPfyJRdk';

module.exports = async (client) => {
     const sessions = getLofiSessions();

     for (const { guildId, channelId } of sessions) {
          try {
               const guild = await client.guilds.fetch(guildId);
               const channel = await guild.channels.fetch(channelId);
               if (!channel || channel.type !== 2) continue;

               const stream = await play.stream(YT_URL);
               const resource = createAudioResource(stream.stream, {
                    inputType: stream.type,
                    inlineVolume: true
               });
               resource.volume.setVolume(0.5);

               const player = createAudioPlayer({
                    behaviors: {
                         noSubscriber: NoSubscriberBehavior.Play,
                    }
               });

               player.play(resource);

               const connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfDeaf: false
               });

               connection.subscribe(player);

               player.on(AudioPlayerStatus.Idle, async () => {
                    const newStream = await play.stream(YT_URL);
                    const newResource = createAudioResource(newStream.stream, {
                         inputType: newStream.type,
                         inlineVolume: true
                    });
                    newResource.volume.setVolume(0.5);
                    player.play(newResource);
               });

               console.log(`[LofiReconnect] Reconnected to ${guild.name} - #${channel.name}`);
          } catch (err) {
               console.error(`[LofiReconnect] Error on ${guildId}:`, err.message);
          }
     }
};
