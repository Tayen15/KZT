const { getLofiSessions } = require('../utils/lofiStorage');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');

const STREAM_URL = 'https://stream-157.zeno.fm/0r0xa792kwzuv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiIwcjB4YTc5Mmt3enV2IiwiaG9zdCI6InN0cmVhbS0xNTcuemVuby5mbSIsInJ0dGwiOjUsImp0aSI6IkVwRE53VEJIVGNDY0RJTmlpUzlRb1EiLCJpYXQiOjE3NDY4NzU2NTYsImV4cCI6MTc0Njg3NTcxNn0.A8kS0ZSXDoVvPX_gOCz2DJa0slpoJ2jt_7TryS5EKoo&zt=';
const RECONNECT_INTERVAL = 30000; // 30 detik

module.exports = async (client) => {
     const sessions = await getLofiSessions();     

     if (!sessions || sessions.length === 0) {
          console.log('[LofiReconnect] No active lofi sessions to reconnect');
          return;
     }

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
                    selfDeaf: true
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
