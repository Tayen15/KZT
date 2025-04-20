const { getLofiSessions } = require('../utils/lofiStorage');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');

const STREAM_URL = 'https://stream-157.zeno.fm/0r0xa792kwzuv?zt=...';
const RECONNECT_INTERVAL = 30000; // 30 detik

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

               setInterval(async () => {
                    try {
                         const status = player.state.status;
                         const res = await fetch(STREAM_URL, { method: 'HEAD' });
               
                         if (status !== AudioPlayerStatus.Playing || !res.ok) {
               
                              const newResource = createAudioResource(STREAM_URL, {
                                   inlineVolume: true
                              });
                              newResource.volume.setVolume(0.5);
                              player.play(newResource);
                         }
                    } catch (err) {
                         console.error('[LofiReconnect] Auto-reconnect check failed:', err.message);
                    }
               }, RECONNECT_INTERVAL);

               console.log(`[LofiReconnect] Reconnected to ${guild.name} - #${channel.name}`);
          } catch (err) {
               console.error(`[LofiReconnect] Error on ${guildId}:`, err.message);
          }
     }
};
