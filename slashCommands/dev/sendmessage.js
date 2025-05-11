const { SlashCommandBuilder, WebhookClient, EmbedBuilder, MessageFlags } = require("discord.js");
const config = require("../../config.json");

module.exports = {
     data: new SlashCommandBuilder()
          .setName("sendmessage")
          .setDescription("Send a message to channel with webhook"),
     name: "sendmessage",
     category: "dev",
     ownerOnly: true,
     async execute(client, interaction) {
          if (!config.sendmessages.channelId) throw new Error("Channel ID not set in config.json");
          if (!config.sendmessages.webhookUrl) throw new Error("Webhook URL not set in config.json");

          const webhook = new WebhookClient({ url: config.sendmessages.webhookUrl });

          const embedMessage = new EmbedBuilder()
               .setColor("Blue")
               .setDescription(config.sendmessages.rules)
               .setFooter({ text: "Last Updated" })
               .setTimestamp();

          if (config.sendmessages.messageId) {
               try {
                    await webhook.editMessage(config.sendmessages.messageId, {
                         embeds: [embedMessage]
                    });
                    return ;
               } catch (error) {
                    interaction.reply({
                         content: "Could not edit existing message, sending new one",
                         flags: MessageFlags.Ephemeral
                    });
               }
          }

          return await webhook.send({ embeds: [embedMessage] });
     }
}