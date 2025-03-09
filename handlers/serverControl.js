const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors } = require("discord.js");
const fetch = require("node-fetch");

const { PTERODACTYL_API_KEY, PTERODACTYL_URL, SERVER_ID, SERVERCONTROL_CHANNELID } = require("../config.json");
const { getLastMessageId, saveLastMessageId } = require("../utils/jsonStorage");

const UPDATE_INTERVAL = 20 * 1000;

async function fetchServerStatus() {
     try {
          const response = await fetch(`${PTERODACTYL_URL}/api/client/servers/${SERVER_ID}/resources`, {
               method: "GET",
               headers: { "Authorization": `Bearer ${PTERODACTYL_API_KEY}`, "Content-Type": "application/json" }
          });

          const data = await response.json();
          if (!data.attributes) throw new Error("Gagal mengambil data server.");

            const uptimeSeconds = data.attributes.resources.uptime / 1000;
            const uptimeHours = Math.floor(uptimeSeconds / 3600);
            const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
            const uptime = `${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`;

            return {
                  status: data.attributes.current_state,
                  cpu: data.attributes.resources.cpu_absolute.toFixed(2),
                  memory: (data.attributes.resources.memory_bytes / 1024 / 1024).toFixed(2),
                  disk: (data.attributes.resources.disk_bytes / 1024 / 1024).toFixed(2),
                  uptime: uptime
            };
     } catch (error) {
          console.error("[ServerControl] Gagal mengambil status server:", error);
          return null;
     }
}

async function updateMonitoringMessage(client) {
     const channel = await client.channels.fetch(SERVERCONTROL_CHANNELID);
     if (!channel) return console.error("[ServerControl] Channel tidak ditemukan!");

     const server = await fetchServerStatus();
     if (!server) return;

     const statusMap = {
          running: "🟢 Running",
          offline: "🔴 Offline",
          starting: "🟡 Starting",
          stopping: "🟡 Stopping"
     };

     const nextUpdateTimestamp = Math.floor((Date.now() + UPDATE_INTERVAL) / 1000);

     const embed = new EmbedBuilder()
          .setTitle(`${client.user.username} - Server Control`)
          .setColor(Colors.Blue)
          .setDescription(`Update in <t:${nextUpdateTimestamp}:R>`)
          .addFields(
               { name: "Status Server", value: `\`\`\`${statusMap[server.status] || "Unknown"}\`\`\`` },
               { name: "CPU Usage", value: `\`\`\`${server.cpu}%\`\`\``, inline: true },
               { name: "Memory Usage", value: `\`\`\`${server.memory} MB\`\`\``, inline: true },
               { name: "Disk Usage", value: `\`\`\`${server.disk} MB\`\`\``, inline: true },
               { name: "Uptime", value : `\`\`\`${server.uptime}\`\`\`` }
          )
          .setFooter({
               text: `Powered by ${client.user.username} X Pterodactyl`, 
               iconURL: client.user.displayAvatarURL({ dynamic: true })
          })
          .setTimestamp();

     const startButton = new ButtonBuilder()
          .setCustomId("start_server")
          .setLabel("Start")
          .setStyle(ButtonStyle.Success)
          .setDisabled(server.status === "running" || server.status === "starting");

     const stopButton = new ButtonBuilder()
          .setCustomId("stop_server")
          .setLabel("Stop")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(server.status === "offline" || server.status === "stopping");

     const restartButton = new ButtonBuilder()
          .setCustomId("restart_server")
          .setLabel("Restart")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(server.status === "offline" || server.status === "starting" || server.status === "stopping");

     const row = new ActionRowBuilder().addComponents(startButton, stopButton, restartButton);

     const lastMessageId = getLastMessageId("serverControl");

     if (lastMessageId) {
          try {
               const message = await channel.messages.fetch(lastMessageId);
               await message.edit({ embeds: [embed], components: [row] });
          } catch (error) {
               const newMessage = await channel.send({ embeds: [embed], components: [row] });
               saveLastMessageId("serverControl", newMessage.id);
          }
     } else {
          const newMessage = await channel.send({ embeds: [embed], components: [row] });
          saveLastMessageId("serverControl", newMessage.id);
     }
}

module.exports = async (client) => {
     console.log("[ServerControl] Memulai monitoring server...");
     await updateMonitoringMessage(client);
     setInterval(() => updateMonitoringMessage(client), UPDATE_INTERVAL);
};
