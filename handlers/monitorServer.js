const { EmbedBuilder, Colors } = require("discord.js");
const { fetch } = require("undici");
const prisma = require("../utils/database");
const { getLastMessageId, saveLastMessageId } = require("../utils/jsonStorage");

const activeMonitors = new Map();

// Fetch Minecraft server status
async function fetchMinecraftStatus(host, port = 25565) {
     try {
          const response = await fetch(`https://api.mcsrvstat.us/3/${host}:${port}`);
          const data = await response.json();

          return {
               online: data.online || false,
               players: data.players || { online: 0, max: 0 },
               version: data.version || "Unknown",
               motd: data.motd?.clean?.join(' ') || "No description",
               hostname: data.hostname || host,
               port: data.port || port
          };
     } catch (error) {
          console.error(`[Monitor] Failed to fetch status for ${host}:${port}:`, error);
          return {
               online: false,
               players: { online: 0, max: 0 },
               version: "Unknown",
               motd: "Error fetching status",
               hostname: host,
               port: port
          };
     }
}

// Create embed for server status
function createStatusEmbed(client, serverName, status, checkInterval) {
     const statusEmoji = status.online ? "🟢" : "🔴";
     const statusText = status.online ? "Online" : "Offline";
     const nextUpdateTimestamp = Math.floor((Date.now() + checkInterval * 60 * 1000) / 1000);

     let description = `${statusEmoji} **${statusText}**\n\n`;
     description += `**Server:** \`${status.hostname}:${status.port}\`\n`;
     description += `**Players:** \`${status.players.online}/${status.players.max}\`\n`;
     description += `**Version:** \`${status.version}\`\n`;
     description += `**MOTD:** ${status.motd}\n\n`;
     description += `Next update <t:${nextUpdateTimestamp}:R>`;

     const color = status.online ? Colors.Green : Colors.Red;

     return new EmbedBuilder()
          .setTitle(`📊 ${serverName || 'Minecraft Server'} Status`)
          .setColor(color)
          .setDescription(description)
          .setTimestamp()
          .setFooter({ 
               text: `${client.user.username}`, 
               iconURL: client.user.displayAvatarURL({ dynamic: true }) 
          });
}


// Update monitoring message
async function updateMonitoringMessage(client, guildId) {
     try {
          // Get monitoring config from database
          const monitorConfig = await prisma.serverMonitoring.findFirst({
               where: {
                    guild: { guildId },
                    enabled: true
               },
               include: { guild: true }
          });

          if (!monitorConfig) return;

          const channel = await client.channels.fetch(monitorConfig.channelId).catch(() => null);
          if (!channel) return console.error(`[Monitor] Channel not found for guild ${guildId}!`);

          // Fetch server status
          const status = await fetchMinecraftStatus(monitorConfig.serverHost, monitorConfig.serverPort);
          
          // Update database with current status
          const wasOnline = monitorConfig.isOnline;
          await prisma.serverMonitoring.update({
               where: { id: monitorConfig.id },
               data: {
                    isOnline: status.online,
                    currentPlayers: status.players.online,
                    maxPlayers: status.players.max,
                    version: status.version,
                    lastChecked: new Date()
               }
          });

          // Send notification if status changed
          if (wasOnline !== status.online) {
               if (status.online && monitorConfig.notifyOnline) {
                    await channel.send(`✅ **${monitorConfig.serverName || 'Server'}** is now **ONLINE**!`);
               } else if (!status.online && monitorConfig.notifyOffline) {
                    await channel.send(`⚠️ **${monitorConfig.serverName || 'Server'}** is now **OFFLINE**!`);
               }
          }

          // Create embed
          const embed = createStatusEmbed(client, monitorConfig.serverName, status, monitorConfig.checkInterval);
          let lastMessageId = getLastMessageId(`monitorServer_${guildId}`);

          if (lastMessageId) {
               try {
                    const message = await channel.messages.fetch(lastMessageId);
                    await message.edit({ embeds: [embed] });
               } catch {
                    const newMessage = await channel.send({ embeds: [embed] });
                    saveLastMessageId(`monitorServer_${guildId}`, newMessage.id);
               }
          } else {
               const newMessage = await channel.send({ embeds: [embed] });
               saveLastMessageId(`monitorServer_${guildId}`, newMessage.id);
          }
     } catch (error) {
          console.error(`[Monitor] Error updating monitoring for guild ${guildId}:`, error);
     }
}

// Start monitoring for a specific guild
async function startServerMonitoring(client, guildId) {
     if (activeMonitors.has(guildId)) return; // Already monitoring

     console.log(`[Monitor] Starting server monitoring for guild ${guildId}`);
     
     // Get check interval
     const monitorConfig = await prisma.serverMonitoring.findFirst({
          where: { guild: { guildId }, enabled: true }
     });

     if (!monitorConfig) return;

     // Initial update
     await updateMonitoringMessage(client, guildId);
     
     // Set interval
     const checkInterval = (monitorConfig.checkInterval || 5) * 60 * 1000; // Convert minutes to milliseconds
     const interval = setInterval(async () => {
          await updateMonitoringMessage(client, guildId);
     }, checkInterval);
     
     activeMonitors.set(guildId, interval);
}

// Stop monitoring for a specific guild
function stopServerMonitoring(guildId) {
     const interval = activeMonitors.get(guildId);
     if (interval) {
          clearInterval(interval);
          activeMonitors.delete(guildId);
          console.log(`[Monitor] Stopped server monitoring for guild ${guildId}`);
     }
}

// Initialize server monitoring
module.exports = async (client) => {
     console.log("[Monitor] Initializing server monitoring...");
     
     try {
          // Get all enabled monitoring configurations
          const monitorConfigs = await prisma.serverMonitoring.findMany({
               where: { enabled: true },
               include: { guild: true }
          });

          console.log(`[Monitor] Found ${monitorConfigs.length} active server monitors`);

          // Start monitoring for each guild
          for (const config of monitorConfigs) {
               await startServerMonitoring(client, config.guild.guildId);
          }
     } catch (error) {
          console.error("[Monitor] Failed to initialize server monitoring:", error);
     }
};

// Export functions for use in API routes
module.exports.startServerMonitoring = startServerMonitoring;
module.exports.stopServerMonitoring = stopServerMonitoring;
