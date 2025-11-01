const { EmbedBuilder, WebhookClient } = require('discord.js');
const prisma = require('../utils/database');

async function sendRules(client, guildId, channelId, webhookUrl) {
     try {
          const rules = await prisma.rule.findMany({
               where: { guild: { guildId } },
               orderBy: { order: 'asc' }
          });

          if (rules.length === 0) {
               console.warn('[Rules] No rules found for guild ' + guildId);
               return null;
          }

          let rulesText = '';
          rules.forEach((rule, index) => {
               rulesText += '### ' + (index + 1) + '. ' + rule.title + '\n' + rule.description + '\n\n';
          });

          const rulesEmbed = new EmbedBuilder()
               .setColor('#25C1E8')
               .setTitle('📜 Server Rules')
               .setDescription(rulesText.trim())
               .setFooter({ text: 'Last updated' })
               .setTimestamp();

          if (webhookUrl) {
               try {
                    const webhook = new WebhookClient({ url: webhookUrl });
                    const message = await webhook.send({ embeds: [rulesEmbed] });
                    return message;
               } catch (error) {
                    console.error('[Rules] Failed to send via webhook:', error);
               }
          }

          if (client && channelId) {
               const channel = await client.channels.fetch(channelId).catch(() => null);
               if (channel) {
                    const message = await channel.send({ embeds: [rulesEmbed] });
                    return message;
               }
          }

          return null;
     } catch (error) {
          console.error('[Rules] Error in sendRules:', error);
          throw error;
     }
}

async function updateRules(client, guildId, messageId, channelId, webhookUrl) {
     try {
          const rules = await prisma.rule.findMany({
               where: { guild: { guildId } },
               orderBy: { order: 'asc' }
          });

          if (rules.length === 0) {
               console.warn('[Rules] No rules found for guild ' + guildId);
               return null;
          }

          let rulesText = '';
          rules.forEach((rule, index) => {
               rulesText += '### ' + (index + 1) + '. ' + rule.title + '\n' + rule.description + '\n\n';
          });

          const rulesEmbed = new EmbedBuilder()
               .setColor('#25C1E8')
               .setTitle('📜 Server Rules')
               .setDescription(rulesText.trim())
               .setFooter({ text: 'Last updated' })
               .setTimestamp();

          if (webhookUrl && messageId) {
               try {
                    const webhook = new WebhookClient({ url: webhookUrl });
                    await webhook.editMessage(messageId, { embeds: [rulesEmbed] });
                    return true;
               } catch (error) {
                    console.error('[Rules] Failed to update via webhook:', error);
               }
          }

          if (client && channelId && messageId) {
               const channel = await client.channels.fetch(channelId).catch(() => null);
               if (channel) {
                    try {
                         const message = await channel.messages.fetch(messageId);
                         await message.edit({ embeds: [rulesEmbed] });
                         return true;
                    } catch (error) {
                         console.error('[Rules] Failed to edit message:', error);
                    }
               }
          }

          return false;
     } catch (error) {
          console.error('[Rules] Error in updateRules:', error);
          throw error;
     }
}

module.exports = { sendRules, updateRules };
