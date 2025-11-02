const { EmbedBuilder, Colors } = require("discord.js");
const { fetch } = require("undici");
const prisma = require("../utils/database");
const { getLastMessageId, saveLastMessageId } = require("../utils/jsonStorage");

const UPDATE_INTERVAL = 60 * 1000;
const activePrayerSchedules = new Map();

// Mengambil data jadwal salat dari API
async function fetchPrayerTimes(city, country) {
     try {
          const PRAYER_API_URL = "https://api.aladhan.com/v1/timingsByCity";
          const response = await fetch(`${PRAYER_API_URL}?city=${city}&country=${country}&method=20`);
          const data = await response.json();

          if (!data?.data?.timings) throw new Error("Failed to retrieve prayer schedule data");

          return {
               Fajr: convertTo24HourFormat(data.data.timings.Fajr),
               Dhuhr: convertTo24HourFormat(data.data.timings.Dhuhr),
               Asr: convertTo24HourFormat(data.data.timings.Asr),
               Maghrib: convertTo24HourFormat(data.data.timings.Maghrib),
               Isha: convertTo24HourFormat(data.data.timings.Isha)
          };
     } catch (error) {
          console.error("[Prayer] Failed to fetch prayer schedule:", error);
          return {};
     }
}

// Konversi waktu dari format API (HH:MM) ke objek { hours, minutes }
function convertTo24HourFormat(time) {
     const [hours, minutes] = time.split(":").map(num => num.padStart(2, "0"));
     return { hours, minutes };
}

// Cek apakah saat ini berada dalam waktu salat
function isWithinPrayerTime(prayerHour, prayerMinute) {
     const now = new Date();
     const currentTime = now.getHours() * 60 + now.getMinutes();
     const prayerTime = parseInt(prayerHour) * 60 + parseInt(prayerMinute);

     return currentTime >= prayerTime && currentTime < prayerTime + 15;
}

// Dapatkan waktu salat berikutnya dan tampilkan dalam format timestamp Discord
function getNextPrayerTime(prayerTimes) {
     const now = new Date();  
     const currentMinutes = now.getHours() * 60 + now.getMinutes();

     for (const [prayer, time] of Object.entries(prayerTimes)) {
          const prayerMinutes = parseInt(time.hours) * 60 + parseInt(time.minutes);
          if (prayerMinutes > currentMinutes) {
               const nextPrayerTime = new Date();
               nextPrayerTime.setHours(time.hours, time.minutes, 0, 0);

               const timestamp = Math.floor(nextPrayerTime.getTime() / 1000);
               return `Waktu salat selanjutnya: **${prayer} <t:${timestamp}:R>.**`;
          }
     }
     return "**Tidak ada salat berikutnya untuk hari ini.**";
}

// Membentuk Embed untuk jadwal salat
function formatPrayerTimesEmbed(client, prayerTimes, city, customMessage) {
     const now = new Date();
     const currentTime = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

     const fields = Object.entries(prayerTimes).map(([prayer, time]) => {
          const highlight = isWithinPrayerTime(time.hours, time.minutes) ? "(Sedang Waktu Salat)" : "";
          return { name: prayer, value: `\`\`\`${time.hours}:${time.minutes} WIB ${highlight}\`\`\``, inline: true };
     });

     let description = `⏰ Sekarang: **${currentTime} WIB**\n📅 ${now.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}\n${getNextPrayerTime(prayerTimes)}\n\nUpdate in <t:${Math.floor((Date.now() + UPDATE_INTERVAL) / 1000)}:R>`;
     
     if (customMessage) {
          description = `${customMessage}\n\n${description}`;
     }

     return new EmbedBuilder()
          .setTitle(`🕌 Jadwal Salat (${city})`)
          .setColor(Colors.Green)
          .setThumbnail('https://cdn.discordapp.com/attachments/1008688176421933148/1350028133859987477/tob_tobitob.png?ex=67d53f2d&is=67d3edad&hm=18446e1e3299ec54f88f11583cb57a1799451f495e10afbedcc139005283d919&')
          .setDescription(description)
          .addFields(fields)
          .setTimestamp()
          .setFooter({ text: `${client.user.username} X aladhan`, iconURL: client.user.displayAvatarURL({ dynamic: true }) });
}

async function updatePrayerMessage(client, guildId) {
     try {
          // Get prayer config from database
          const prayerConfig = await prisma.prayerTime.findFirst({
               where: {
                    guild: { guildId },
                    enabled: true
               },
               include: { guild: true }
          });

          if (!prayerConfig) return;

          const channel = await client.channels.fetch(prayerConfig.channelId).catch(() => null);
          if (!channel) {
               console.error(`[Prayer] Channel ${prayerConfig.channelId} not found for guild ${guildId}!`);
               return;
          }

          // Fetch prayer times from API
          const prayerTimes = await fetchPrayerTimes(prayerConfig.city, prayerConfig.country);
          if (Object.keys(prayerTimes).length === 0) return;

          const embed = formatPrayerTimesEmbed(client, prayerTimes, prayerConfig.city, prayerConfig.customMessage);
          
          // Try to update existing message or create new one
          let message = null;
          
          if (prayerConfig.lastMessageId) {
               try {
                    message = await channel.messages.fetch(prayerConfig.lastMessageId);
                    await message.edit({ embeds: [embed] });
                    console.log(`[Prayer] Updated message for guild ${guildId}`);
               } catch (error) {
                    console.log(`[Prayer] Could not update message, creating new one...`);
                    message = null;
               }
          }
          
          // Create new message if update failed or no message exists
          if (!message) {
               message = await channel.send({ embeds: [embed] });
               
               // Save message ID to database
               await prisma.prayerTime.update({
                    where: { id: prayerConfig.id },
                    data: { lastMessageId: message.id }
               });
               
               console.log(`[Prayer] Created new message ${message.id} for guild ${guildId}`);
          }
     } catch (error) {
          console.error(`[Prayer] Error updating prayer message for guild ${guildId}:`, error);
     }
}

// Start monitoring for a specific guild
async function startPrayerMonitoring(client, guildId) {
     if (activePrayerSchedules.has(guildId)) return; // Already monitoring

     console.log(`[Prayer] Starting prayer monitoring for guild ${guildId}`);
     
     // Initial update
     await updatePrayerMessage(client, guildId);
     
     // Set interval
     const interval = setInterval(async () => {
          await updatePrayerMessage(client, guildId);
     }, UPDATE_INTERVAL);
     
     activePrayerSchedules.set(guildId, interval);
}

// Stop monitoring for a specific guild
function stopPrayerMonitoring(guildId) {
     const interval = activePrayerSchedules.get(guildId);
     if (interval) {
          clearInterval(interval);
          activePrayerSchedules.delete(guildId);
          console.log(`[Prayer] Stopped prayer monitoring for guild ${guildId}`);
     }
}

// Inisialisasi jadwal salat dan pembaruan berkala
module.exports = async (client) => {
     console.log("[Prayer] Initializing prayer time monitoring...");
     
     try {
          // Get all enabled prayer configurations
          const prayerConfigs = await prisma.prayerTime.findMany({
               where: { enabled: true },
               include: { guild: true }
          });

          console.log(`[Prayer] Found ${prayerConfigs.length} active prayer configurations`);

          // Start monitoring for each guild
          for (const config of prayerConfigs) {
               await startPrayerMonitoring(client, config.guild.guildId);
          }
     } catch (error) {
          console.error("[Prayer] Failed to initialize prayer monitoring:", error);
     }
};

// Export functions for use in API routes
module.exports.startPrayerMonitoring = startPrayerMonitoring;
module.exports.stopPrayerMonitoring = stopPrayerMonitoring;
