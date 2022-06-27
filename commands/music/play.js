module.exports = {
    name: "play",
    description: "Play a song or playlist",
    aliases: ['p'],
    category: "music",
    usage: "{prefix}play",
    cooldown: 5,
    execute(client, message, args) {
        message.channel.send("Playing!");
    }
};
