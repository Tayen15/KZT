const { EmbedBuilder, Colors } = require("discord.js");
const fetch = require("node-fetch");
const { PRAYER_API_URL, PRAYER_CHANNELID, CITY, COUNTRY } = require("../config.json");
const { getLastMessageId, saveLastMessageId } = require("../utils/jsonStorage");

const UPDATE_INTERVAL = 60 * 1000;
let prayerTimes = {};

// Mengambil data jadwal salat dari API
async function fetchPrayerTimes() {
     try {
          const response = await fetch(`${PRAYER_API_URL}?city=${CITY}&country=${COUNTRY}&method=20`);
          const data = await response.json();

          if (!data?.data?.timings) throw new Error("Gagal mengambil data jadwal salat");

          prayerTimes = {
               Fajr: convertTo24HourFormat(data.data.timings.Fajr),
               Dhuhr: convertTo24HourFormat(data.data.timings.Dhuhr),
               Asr: convertTo24HourFormat(data.data.timings.Asr),
               Maghrib: convertTo24HourFormat(data.data.timings.Maghrib),
               Isha: convertTo24HourFormat(data.data.timings.Isha)
          };
     } catch (error) {
          console.error("[Prayer] Gagal mengambil jadwal salat:", error);
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

     return currentTime >= prayerTime && currentTime < prayerTime + 5;
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
          const highlight = isWithinPrayerTime(time.hours, time.minutes) ? "**(Sedang Waktu Salat)**" : "";
          return { name: prayer, value: `\`\`\`${time.hours}:${time.minutes} WIB ${highlight}\`\`\``, inline: true };
     });

     return new EmbedBuilder()
          .setTitle(`🕌 Jadwal Salat (${CITY})`)
          .setColor(Colors.Green)
          .setDescription(
               `⏰ Sekarang: **${currentTime} WIB**\n📅 ${now.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}\n${getNextPrayerTime()}\n\nUpdate in <t:${Math.floor((Date.now() + UPDATE_INTERVAL) / 1000)}:R>`
          )
          .addFields(fields)
          .setTimestamp()
          .setFooter({ text: `${client.user.username} X aladhan`, iconURL: client.user.displayAvatarURL({ dynamic: true }) });
}

// Mengirim atau memperbarui pesan jadwal salat di channel Discord
async function updatePrayerMessage(client) {
     const channel = await client.channels.fetch(PRAYER_CHANNELID).catch(() => null);
     if (!channel) return console.error("[Prayer] Channel tidak ditemukan!");

     const embed = formatPrayerTimesEmbed(client);
     let lastMessageId = getLastMessageId("prayerTimes");

     try {
          if (lastMessageId) {
               const message = await channel.messages.fetch(lastMessageId);
               await message.edit({ embeds: [embed] });
          } else {
               const newMessage = await channel.send({ embeds: [embed] });
               saveLastMessageId("prayerTimes", newMessage.id);
          }
     } catch (error) {
          console.error("[Prayer] Gagal memperbarui pesan:", error);
          const newMessage = await channel.send({ embeds: [embed] });
          saveLastMessageId("prayerTimes", newMessage.id);
     }
}

// Inisialisasi jadwal salat dan pembaruan berkala
module.exports = async (client) => {
     console.log("[Prayer] Memulai monitoring jadwal salat...");
     await fetchPrayerTimes();
     await updatePrayerMessage(client);
     setInterval(async () => {
          await fetchPrayerTimes();
          await updatePrayerMessage(client);
     }, UPDATE_INTERVAL);
};
