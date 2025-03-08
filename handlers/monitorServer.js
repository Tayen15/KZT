const { EmbedBuilder, Colors } = require("discord.js");
const fetch = require("node-fetch");

const { UPTIME_API_KEY, MONITOR_CHANNELID } = require("../config.json");
const UPDATE_INTERVAL = 60 * 1000; // 60 detik
let lastMessageId = null; // Untuk menyimpan ID pesan terakhir

async function fetchServerStatus() {
     try {
          const response = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
               method: "POST",
               headers: { "Content-Type": "application/x-www-form-urlencoded" },
               body: `api_key=${UPTIME_API_KEY}&format=json&response_times=1&logs=1`
          });

          const data = await response.json();
          if (data.stat !== "ok") throw new Error("Gagal mengambil data dari API UptimeRobot");

          return data.monitors.map(monitor => ({
               name: monitor.friendly_name,
               url: monitor.url,
               status: monitor.status, // 2 = Up, 9 = Down, 1 = Paused
               uptime: monitor.average_response_time || "N/A", // Waktu respon rata-rata
               last_check: monitor.logs?.[0]?.datetime || null // Waktu terakhir dicek
          }));
     } catch (error) {
          console.error("[Monitor] Gagal mengambil status server:", error);
          return [];
     }
}

async function sendMonitoringMessage(client) {
     const channel = await client.channels.fetch(MONITOR_CHANNELID);
     if (!channel) return console.error("[Monitor] Channel tidak ditemukan!");

     const servers = await fetchServerStatus();
     if (servers.length === 0) return console.warn("[Monitor] Tidak ada server yang dimonitor.");

     const nextUpdateTimestamp = Math.floor((Date.now() + UPDATE_INTERVAL) / 1000); // Timestamp UNIX untuk <t:xxx:R>

     let serverDetails = servers.map(server => {
          let statusEmoji, statusText;
          switch (server.status) {
               case 2:
                    statusEmoji = "🟢";
                    statusText = "Online";
                    break;
               case 9:
                    statusEmoji = "🔴";
                    statusText = "Offline";
                    break;
               case 1:
                    statusEmoji = "🟡";
                    statusText = "Paused";
                    break;
               default:
                    statusEmoji = "⚪";
                    statusText = "Unknown";
                    break;
          }

          return `**${server.name}:** ${statusEmoji} **${statusText}**\n\`\`\`Uptime: ${server.uptime} ms\`\`\``;
     }).join("\n");

     const embed = new EmbedBuilder()
          .setTitle(`${client.user.username} Uptime`)
          .setColor(Colors.Blue)
          .setDescription(`Next update <t:${nextUpdateTimestamp}:R>`)
          .setTimestamp()
          .addFields(
               { name: "Server Stats", value: serverDetails, inline: false }
          )
          .setFooter({ text: `${client.user.username}`, iconURL: client.user.displayAvatarURL({ dynamic: true }) });

     if (lastMessageId) {
          try {
               const message = await channel.messages.fetch(lastMessageId);
               await message.edit({ embeds: [embed] });
          } catch (error) {
               const newMessage = await channel.send({ embeds: [embed] });
               lastMessageId = newMessage.id;
          }
     } else {
          const newMessage = await channel.send({ embeds: [embed] });
          lastMessageId = newMessage.id;
     }
}

module.exports = async (client) => {
     console.log("[Monitor] Memulai monitoring server...");

     await sendMonitoringMessage(client);

     setInterval(async () => {
          await sendMonitoringMessage(client);
     }, UPDATE_INTERVAL);
};
