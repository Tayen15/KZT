const moment = require('moment')
const { version, EmbedBuilder, SlashCommandBuilder } = require('discord.js')
const ms = require('ms')
const packageJson = require('../../package.json')
const os = require('os')
const cpuStat = require('cpu-stat')

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Display statistic the bot."),
    name: "stats",
    description: "Displays statistic the bot",
    aliases: [],
    category: "info",
    usage: "{prefix}stats",
    cooldown: 5,
    async execute(interaction) {

        let totalSeconds = (interaction.uptime / 1000);
        let days = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        let hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = Math.floor(totalSeconds % 60);     

        const usedMemory = os.totalmem() -os.freemem(), totalMemory = os.totalmem();
        const getPercentage = ((usedMemory/totalMemory) * 100).toFixed(2) + '%';

        cpuStat.usagePercent((err, percent) => {
            const statsEmbed = new EmbedBuilder()
            .setTitle(interaction.user.username)
            .addFields(
                { name: 'Version', value: `${packageJson.version}`, inline: true },
                { name: 'Discord.js', value: `${version}`, inline: true },
                { name: 'Creator', value: `${packageJson.author}`, inline: true },
                { name: 'Guilds', value: `${interaction.guilds.cache.size}`, inline: true },
                { name: 'Users', value: `${interaction.users.cache.size}`, inline: true },
                { name: 'Channels', value: `${interaction.channels.cache.size}`, inline: true },
                { name: 'CPU Usage', value: `${percent.toFixed(2)}%`, inline: true },
                { name: 'OS Uptime', value: `${ms(os.uptime() ?? 0, { long: true })}`, inline: true },
                { name: 'Uptime', value: `\`\`\`${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds\`\`\``, inline: false },
                { name: 'Mem Usage', value: `\`\`\`${formatBytes(process.memoryUsage.rss())} | ${getPercentage}\`\`\``, inline: false },
            )
            .setThumbnail('https://cdn.discordapp.com/avatars/785398919923892264/fe7115806c2f0e77d9a999bfdf79d408.png')
            .setFooter({
                text: `Latency ${Math.round(interaction.ws.ping)}ms`
            })
            .setTimestamp();
        });
        await interaction.reply({ embeds: [statsEmbed] });
    },
};

function formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
};