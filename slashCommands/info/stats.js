const { version, EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const ms = require('ms');
const os = require('os');
const cpuStat = require('cpu-stat');
const packageJson = require('../../package.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Display bot statistics."),
    name: "stats",
    description: "Displays bot statistics.",
    aliases: [],
    category: "info",
    async execute(client, interaction) {
        const botUptime = formatUptime(interaction.client.uptime);
        const osUptime = formatUptime(os.uptime() * 1000);
        const usedMemory = os.totalmem() - os.freemem();
        const totalMemory = os.totalmem();
        const memoryUsage = `${formatBytes(process.memoryUsage().rss)} | ${(usedMemory / totalMemory * 100).toFixed(2)}%`;

        cpuStat.usagePercent((err, percent) => {
            if (err) {
                console.error(err);
                return interaction.reply({ content: "❌ Error fetching CPU usage.", flags: MessageFlags.Ephemeral });
            }

            const statsEmbed = new EmbedBuilder()
                .setTitle(interaction.user.username)
                .addFields(
                    { name: 'Version', value: packageJson.version, inline: true },
                    { name: 'Discord.js', value: version, inline: true },
                    { name: 'Creator', value: packageJson.author, inline: true },
                    { name: 'Guilds', value: `${interaction.client.guilds.cache.size}`, inline: true },
                    { name: 'Users', value: `${interaction.client.users.cache.size}`, inline: true },
                    { name: 'Channels', value: `${interaction.client.channels.cache.size}`, inline: true },
                    { name: 'CPU Usage', value: `${percent.toFixed(2)}%`, inline: true },
                    { name: 'OS Uptime', value: `\`\`\`${osUptime}\`\`\``, inline: false },
                    { name: 'Bot Uptime', value: `\`\`\`${botUptime}\`\`\``, inline: false },
                    { name: 'Memory Usage', value: `\`\`\`${memoryUsage}\`\`\``, inline: false }
                )
                .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `Latency: ${Math.round(interaction.client.ws.ping)}ms` })
                .setTimestamp();

            interaction.reply({ embeds: [statsEmbed] });
        });
    },
};

function formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
}

function formatUptime(milliseconds) {
    let totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / 86400);
    totalSeconds %= 86400;
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
}
