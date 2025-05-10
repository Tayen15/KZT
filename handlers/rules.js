const { EmbedBuilder } = require('discord.js');
const DEFAULT_RULES = {
     messageId: '1370717231113310302',
     channelId: '1370697604358213644',
     rules: "### 1. Hormati Semua Anggota\nBersikaplah baik dan sopan kepada semua orang. Tidak ada ujaran kebencian, pelecehan, atau diskriminasi yang diperbolehkan.\n\n### 2. Dilarang Spam atau Promosi Pribadi\nJangan kirim pesan berulang-ulang atau promosi tanpa izin. Termasuk juga promosi via DM tanpa persetujuan.\n\n### 3. Konten Harus Ramah Semua Umur\nDilarang membagikan konten NSFW, kekerasan, atau materi yang mengandung unsur eksplisit.\n\n### 4. Gunakan Channel dengan Benar\nPastikan setiap pesan dikirim di channel yang sesuai. Baca deskripsi channel sebelum memposting sesuatu.\n\n### 6. Jangan Bagikan Informasi Pribadi\nDemi keamanan, jangan sebarkan informasi pribadi kamu atau orang lain, termasuk alamat, nomor telepon, dan akun media sosial.\n\n### 7. Bersikap Positif dan Bangun Komunitas yang Baik\nMari kita ciptakan lingkungan yang nyaman dan mendukung untuk semua orang!\n\n⚡ Bersama-sama kita bangun komunitas yang ramah dan menyenangkan untuk semua! 🚀"
};

async function sendRules(channel) {
     if (!channel) throw new Error('Channel is required');

     try {
          const rulesEmbed = new EmbedBuilder()
               .setColor('#25C1E8')
               .setDescription(DEFAULT_RULES.rules)
               .setFooter({ text: 'Last updated' })
               .setTimestamp();

          if (DEFAULT_RULES.messageId && DEFAULT_RULES.channelId) {
               const targetChannel = channel.client.channels.cache.get(DEFAULT_RULES.channelId);
               if (!targetChannel) {
                    throw new Error('Target channel not found');
               }

               try {
                    const oldMessage = await targetChannel.messages.fetch(DEFAULT_RULES.messageId);
                    await oldMessage.edit({ embeds: [rulesEmbed] });
                    return oldMessage;
               } catch (error) {
                    console.warn('Could not edit existing message, sending new one');
               }
          }

          return await channel.send({ embeds: [rulesEmbed] });
     } catch (error) {
          console.error('Error in sendRules:', error);
          throw error;
     }
}

module.exports = { sendRules };
