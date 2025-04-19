const { getLofiSessions } = require('../utils/lofiStorage');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');

const STREAM_URL = 'https://stream-157.zeno.fm/0r0xa792kwzuv?zt=...'; // pakai URL milikmu

module.exports = async (client) => {
     const sessions = getLofiSessions();

     for (const { guildId, channelId } of sessions) {
          try {
               const guild = await client.guilds.fetch(guildId);
               const channel = await guild.channels.fetch(channelId);
               if (!channel || channel.type !== 2) continue;

               const resource = createAudioResource(STREAM_URL, {
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

               console.log(`[LofiReconnect] Reconnected to ${guild.name} - #${channel.name}`);
          } catch (err) {
               console.error(`[LofiReconnect] Error on ${guildId}:`, err.message);
          }
     }
};
