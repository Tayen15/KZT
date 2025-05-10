const { EmbedBuilder, WebhookClient } = require('discord.js');
const DEFAULT_RULES = {
     messageId: '1370717231113310302',
     channelId: '1370697604358213644',
     webhookUrl: 'https://discord.com/api/webhooks/1370697649489055764/kerc39XJnDmfzsPu_XV_Wsk9hbnr6YhjhACrml6eLuj4dzrnP2sIw0HWeZtvUz1uzFR4', // Tambahkan webhook URL
     rules: "### 1. Hormati Semua Anggota\nBersikaplah baik dan sopan kepada semua orang. Tidak ada ujaran kebencian, pelecehan, atau diskriminasi yang diperbolehkan.\n\n### 2. Dilarang Spam atau Promosi Pribadi\nJangan kirim pesan berulang-ulang atau promosi tanpa izin. Termasuk juga promosi via DM tanpa persetujuan.\n\n### 3. Konten Harus Ramah Semua Umur\nDilarang membagikan konten NSFW, kekerasan, atau materi yang mengandung unsur eksplisit.\n\n### 4. Gunakan Channel dengan Benar\nPastikan setiap pesan dikirim di channel yang sesuai. Baca deskripsi channel sebelum memposting sesuatu.\n\n### 6. Jangan Bagikan Informasi Pribadi\nDemi keamanan, jangan sebarkan informasi pribadi kamu atau orang lain, termasuk alamat, nomor telepon, dan akun media sosial.\n\n### 7. Bersikap Positif dan Bangun Komunitas yang Baik\nMari kita ciptakan lingkungan yang nyaman dan mendukung untuk semua orang!\n\n⚡ Bersama-sama kita bangun komunitas yang ramah dan menyenangkan untuk semua! 🚀"
};

async function sendRules(channel) {
     if (!channel) throw new Error('Channel is required');
     if (!DEFAULT_RULES.webhookUrl) throw new Error('Webhook URL is required');

     try {
          const webhook = new WebhookClient({ url: DEFAULT_RULES.webhookUrl });
          
          const rulesEmbed = new EmbedBuilder()
               .setColor('#25C1E8')
               .setDescription(DEFAULT_RULES.rules)
               .setFooter({ text: 'Last updated' })
               .setTimestamp();

          if (DEFAULT_RULES.messageId) {
               try {
                    await webhook.editMessage(DEFAULT_RULES.messageId, {
                         embeds: [rulesEmbed]
                    });
                    return;
               } catch (error) {
                    console.warn('Could not edit existing message, sending new one');
               }
          }

          return await webhook.send({
               embeds: [rulesEmbed]
          });
     } catch (error) {
          console.error('Error in sendRules:', error);
          throw error;
     }
}

module.exports = { sendRules };
