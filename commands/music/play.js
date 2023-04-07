const { QueryType } = require('discord-player');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a song or playlist"),
    name: "play",
    description: "Play a song or playlist",
    aliases: ['p'],
    category: "music",
    usage: "{prefix}play",
    cooldown: 5,
    execute(client, message, args) {
        
        if (!args[0]) return message.channel.send(`Please enter a valid search ${message.author}... try again ? ❌`);

        const res = player.search(args.join(' '), {
            requestedBy: message.member,
            searchEngine: QueryType.AUTO
        });

        if (!res || !res.tracks.length) return message.channel.send(`No results found ${message.author}... try again ? ❌`);

        const queue = player.createQueue(message.guild, {
            metadata: message.channel
        });

        try {
            if (!queue.connection) return queue.connect(message.member.voice.channel);
        } catch {
            player.deleteQueue(message.guild.id);
            return message.channel.send(`I can't join the voice channel ${message.author}... try again ? ❌`);
        }

        message.channel.send(`Loading your ${res.playlist ? 'playlist' : 'track'}... 🎧`);

        res.playlist ? queue.addTracks(res.tracks) : queue.addTrack(res.tracks[0]);

        if (!queue.playing) queue.play();
    },
};
