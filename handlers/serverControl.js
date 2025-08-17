const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, MessageFlags } = require("discord.js");
const { fetch } = require("undici");
const { PTERODACTYL_API_KEY, PTERODACTYL_URL, SERVER_ID, SERVERCONTROL_CHANNELID } = require("../config.json");
const { getLastMessageId, saveLastMessageId } = require("../utils/jsonStorage");

const UPDATE_INTERVAL = 15 * 1000;

async function fetchServerStatus() {
     try {
          const response = await fetch(`${PTERODACTYL_URL}/api/client/servers/${SERVER_ID}/resources`, {
               method: "GET",
               headers: { "Authorization": `Bearer ${PTERODACTYL_API_KEY}`, "Content-Type": "application/json" }
          });

          const data = await response.json();
          if (!data.attributes) throw new Error("Failed to fetch server data.");

          const uptimeSeconds = Math.floor(data.attributes.resources.uptime / 1000);
          const uptimeDays = Math.floor(uptimeSeconds / 86400);
          const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);
          const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
          const uptime = `${uptimeDays}d ${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds % 60}s`;

          return {
               status: data.attributes.current_state,
               cpu: data.attributes.resources.cpu_absolute.toFixed(2),
               memory: (data.attributes.resources.memory_bytes / 1024 / 1024).toFixed(2),
               disk: (data.attributes.resources.disk_bytes / 1024 / 1024).toFixed(2),
               uptime,
               inbounds: (data.attributes.resources.network_rx_bytes / 1024 / 1024).toFixed(2), 
               outbounds: (data.attributes.resources.network_tx_bytes / 1024 / 1024).toFixed(2)
          };
     } catch (error) {
          console.error("[ServerControl] Failed to fetch server status:", error);
          return null;
     }
}

async function controlServer(action) {
     try {
          const response = await fetch(`${PTERODACTYL_URL}/api/client/servers/${SERVER_ID}/power`, {
               method: "POST",
               headers: {
                    "Authorization": `Bearer ${PTERODACTYL_API_KEY}`,
                    "Content-Type": "application/json"
               },
               body: JSON.stringify({ signal: action })
          });

          if (!response.ok) throw new Error(`Failed to send command: ${action}`);
          return { success: true, message: `Server ${action} command sent successfully!` };
     } catch (error) {
          console.error(`[ServerControl] Failed to control server (${action}):`, error);
          return { success: false, message: `Failed to send ${action} command.` };
     }
}

async function updateMonitoringMessage(client) {
     try {
          const channel = await client.channels.fetch(SERVERCONTROL_CHANNELID);
          if (!channel) throw new Error("Channel not found!");

          const server = await fetchServerStatus();
          if (!server) return;

          const statusMap = {
               running: "🟢 Running",
               offline: "🔴 Offline",
               starting: "🟡 Starting",
               stopping: "🟡 Stopping"
          };

          const embed = new EmbedBuilder()
               .setTitle(`${client.user.username} - Server Control`)
               .setColor(Colors.Blue)
               .setDescription(`Update in <t:${Math.floor((Date.now() + UPDATE_INTERVAL) / 1000)}:R>`)
               .addFields(
                    { name: "Server Status", value: `\`\`\`${statusMap[server.status] || "Unknown"}\`\`\`` },
                    { name: "CPU Usage", value: `\`\`\`${server.cpu}%\`\`\``, inline: true },
                    { name: "Memory Usage", value: `\`\`\`${server.memory} MB\`\`\``, inline: true },
                    { name: "Disk Usage", value: `\`\`\`${server.disk} MB\`\`\``, inline: true },
                    { name: "Uptime", value: `\`\`\`${server.uptime}\`\`\``, inline: false },
                    { name: "Inbound", value: `\`\`\`${server.inbounds} MB\`\`\``, inline: true },
                    { name: "Outbound", value: `\`\`\`${server.outbounds} MB\`\`\``, inline: true }
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
                    console.warn("[ServerControl] Previous message not found, sending a new message.");
                    const newMessage = await channel.send({ embeds: [embed], components: [row] });
                    saveLastMessageId("serverControl", newMessage.id);
               }
          } else {
               const newMessage = await channel.send({ embeds: [embed], components: [row] });
               saveLastMessageId("serverControl", newMessage.id);
          }
     } catch (error) {
          console.error("[ServerControl] Failed to update monitoring message:", error);
     }
}

module.exports = async (client) => {
     console.log("[ServerControl] Starting server monitoring...");
     await updateMonitoringMessage(client);
     setInterval(() => updateMonitoringMessage(client), UPDATE_INTERVAL);

     client.on("interactionCreate", async (interaction) => {
          if (!interaction.isButton()) return;

          const actionMap = {
               "start_server": "start",
               "stop_server": "stop",
               "restart_server": "restart"
          };

          const action = actionMap[interaction.customId];

          if (action) {
               await interaction.deferReply({ flags: MessageFlags.Ephemeral });

               const response = await controlServer(action);
               await interaction.followUp({ content: response.message, flags: MessageFlags.Ephemeral });

               setTimeout(() => updateMonitoringMessage(client), 5000);
          }
     });
};
