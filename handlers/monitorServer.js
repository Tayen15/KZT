const { EmbedBuilder, Colors } = require("discord.js");
const fetch = require("node-fetch");
const fs = require("fs");

const { UPTIME_API_KEY, MONITOR_CHANNELID } = require("../config.json");
const { getLastMessageId, saveLastMessageId } = require("../utils/jsonStorage");

const UPDATE_INTERVAL = 60 * 1000;

async function fetchServerStatus() {
     try {
          const response = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
               method: "POST",
               headers: { "Content-Type": "application/x-www-form-urlencoded" },
               body: `api_key=${UPTIME_API_KEY}&format=json&response_times=1&logs=1`
          });

          const data = await response.json();
          if (data.stat !== "ok") throw new Error("Gagal mengambil data dari API");

          return data.monitors.map(monitor => ({
               name: monitor.friendly_name,
               status: monitor.status,
               uptime: monitor.average_response_time || "N/A",
               last_check: monitor.logs?.[0]?.datetime || null
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

     const nextUpdateTimestamp = Math.floor((Date.now() + UPDATE_INTERVAL) / 1000);
     let serverDetails = servers.map(server => {
          let statusEmoji = server.status === 2 ? "🟢" : server.status === 9 ? "🔴" : "🟡";
          let statusText = server.status === 2 ? "Online" : server.status === 9 ? "Offline" : "Paused";
          return `**${server.name}:** ${statusEmoji} **${statusText}**\n\`\`\`Uptime: ${server.uptime} ms\`\`\``;
     }).join("\n");

     const embed = new EmbedBuilder()
          .setTitle(`${client.user.username} Uptime`)
          .setColor(Colors.Blue)
          .setDescription(`Next update <t:${nextUpdateTimestamp}:R>`)
          .setTimestamp()
          .addFields({ name: "Server Stats", value: serverDetails })
          .setFooter({ text: `${client.user.username}`, iconURL: client.user.displayAvatarURL({ dynamic: true }) });

     let lastMessageId = getLastMessageId("monitorServer");

     if (lastMessageId) {
          try {
               const message = await channel.messages.fetch(lastMessageId);
               await message.edit({ embeds: [embed] });
          } catch {
               const newMessage = await channel.send({ embeds: [embed] });
               saveLastMessageId("monitorServer", newMessage.id);
          }
     } else {
          const newMessage = await channel.send({ embeds: [embed] });
          saveLastMessageId("monitorServer", newMessage.id);
     }
}

module.exports = async (client) => {
     console.log("[Monitor] Memulai monitoring server...");
     await sendMonitoringMessage(client);
     setInterval(async () => await sendMonitoringMessage(client), UPDATE_INTERVAL);
};
