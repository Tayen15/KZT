const { EmbedBuilder, Colors } = require("discord.js");
const { fetch } = require("undici");
const { PRAYER_API_URL, PRAYER_CHANNELID, CITY, COUNTRY } = require("../config.json");
const { getLastMessageId, saveLastMessageId } = require("../utils/jsonStorage");

const UPDATE_INTERVAL = 60 * 1000;
let prayerTimes = {};

// Mengambil data jadwal salat dari API
async function fetchPrayerTimes() {
     try {
          const response = await fetch(`${PRAYER_API_URL}?city=${CITY}&country=${COUNTRY}&method=20`);
          const data = await response.json();

          if (!data?.data?.timings) throw new Error("Failed to retrieve prayer schedule data");

          prayerTimes = {
               Fajr: convertTo24HourFormat(data.data.timings.Fajr),
               Dhuhr: convertTo24HourFormat(data.data.timings.Dhuhr),
               Asr: convertTo24HourFormat(data.data.timings.Asr),
               Maghrib: convertTo24HourFormat(data.data.timings.Maghrib),
               Isha: convertTo24HourFormat(data.data.timings.Isha)
          };
     } catch (error) {
          console.error("[Prayer] Failed to take the prayer schedule:", error);
          prayerTimes = {};
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
function getNextPrayerTime() {
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
function formatPrayerTimesEmbed(client) {
     const now = new Date();
     const currentTime = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

     const fields = Object.entries(prayerTimes).map(([prayer, time]) => {
          const highlight = isWithinPrayerTime(time.hours, time.minutes) ? "(Sedang Waktu Salat)" : "";
          return { name: prayer, value: `\`\`\`${time.hours}:${time.minutes} WIB ${highlight}\`\`\``, inline: true };
     });

     return new EmbedBuilder()
          .setTitle(`🕌 Jadwal Salat (${CITY})`)
          .setColor(Colors.Green)
          .setThumbnail('https://cdn.discordapp.com/attachments/1008688176421933148/1350028133859987477/tob_tobitob.png?ex=67d53f2d&is=67d3edad&hm=18446e1e3299ec54f88f11583cb57a1799451f495e10afbedcc139005283d919&')
          .setDescription(
               `⏰ Sekarang: **${currentTime} WIB**\n📅 ${now.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}\n${getNextPrayerTime()}\n\nUpdate in <t:${Math.floor((Date.now() + UPDATE_INTERVAL) / 1000)}:R>`
          )
          .addFields(fields)
          .setTimestamp()
          .setFooter({ text: `${client.user.username} X aladhan`, iconURL: client.user.displayAvatarURL({ dynamic: true }) });
}

async function updatePrayerMessage(client) {
     const channel = await client.channels.fetch(PRAYER_CHANNELID).catch(() => null);
     if (!channel) return console.error("[Prayer] Channel not found!");

     const embed = formatPrayerTimesEmbed(client);
     let lastMessageId = getLastMessageId("prayerTimes");
     let success = false;

     while (!success) {
          try {
               const message = await channel.messages.fetch(lastMessageId);
               await message.edit({ embeds: [embed] });
               success = true;
          } catch (error) {
               console.error("[Prayer] Failed to update the message, trying again in 5 seconds...", error);
               await new Promise(res => setTimeout(res, 5000));
          }
     }
}

// Inisialisasi jadwal salat dan pembaruan berkala
module.exports = async (client) => {
     console.log("[Prayer] Starting to monitor prayer schedule...");
     await fetchPrayerTimes();
     await updatePrayerMessage(client);
     setInterval(async () => {
          await fetchPrayerTimes();
          await updatePrayerMessage(client);
     }, UPDATE_INTERVAL);
};
