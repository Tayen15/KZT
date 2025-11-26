const { AttachmentBuilder } = require('discord.js');
const { generateWelcomeImage } = require('../utils/welcomeImageGenerator');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client, prisma) {
    try {
      // Fetch guild record by guildId string
      const guildRecord = await prisma.guild.findUnique({ where: { guildId: member.guild.id } });
      if (!guildRecord) return;

      const cfg = await prisma.welcomeConfig.findFirst({ where: { guildId: guildRecord.id } });
      if (!cfg || !cfg.enabled) return;

      // Prepare placeholders
      const placeholders = {
        '{{user}}': `${member.user.username}#${member.user.discriminator}`,
        '{{mention}}': `<@${member.id}>`,
        '{{server}}': member.guild.name,
        '{{memberCount}}': String(member.guild.memberCount ?? member.guild.members.cache.size)
      };

      const render = (tpl) => tpl ? Object.keys(placeholders).reduce((s,k)=> s.replaceAll(k, placeholders[k]), tpl) : null;

      // Generate custom image if enabled
      let customImageAttachment = null;
      if (cfg.useCustomImage) {
        try {
          const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
          const imageBuffer = await generateWelcomeImage({
            username: member.user.username,
            avatarUrl,
            layout: cfg.layout || 'classic',
            bgImageUrl: cfg.bgImageUrl,
            bgColor: cfg.bgColor || '#23272A',
            circleColor: cfg.circleColor || '#FFFFFF',
            titleColor: cfg.titleColor || '#FFFFFF',
            usernameColor: cfg.usernameColor || '#FFFFFF',
            messageColor: cfg.messageColor || '#B9BBBE',
            overlayColor: cfg.overlayColor || '#000000',
            overlayOpacity: cfg.overlayOpacity || 50,
            avatarShape: cfg.avatarShape || 'circle',
            font: cfg.font || 'Discord'
          });
          customImageAttachment = new AttachmentBuilder(imageBuffer, { name: 'welcome.png' });
        } catch (err) {
          console.error('❌ Failed to generate welcome image:', err);
        }
      }

      // Send DM if enabled
      if (cfg.dmEnabled) {
        try {
          const dmMsg = render(cfg.message) || `Welcome ${member.user.username}!`;
          const dmPayload = { content: dmMsg };
          if (customImageAttachment) dmPayload.files = [customImageAttachment];
          await member.send(dmPayload).catch(()=>{});
        } catch {}
      }

      // Send to channel if set
      if (cfg.channelId) {
        const channel = member.guild.channels.cache.get(cfg.channelId);
        if (channel && channel.isTextBased()) {
          // Build message
          const content = render(cfg.message);
          const embed = (cfg.embedTitle || cfg.embedDescription || cfg.imageUrl) ? {
            title: render(cfg.embedTitle) || undefined,
            description: render(cfg.embedDescription) || undefined,
            color: cfg.embedColor ? parseInt(cfg.embedColor.replace('#',''), 16) : undefined,
            image: cfg.imageUrl ? { url: cfg.imageUrl } : undefined
          } : null;

          const payload = { 
            content: content || undefined, 
            embeds: embed ? [embed] : []
          };

          // Attach custom image if generated
          if (customImageAttachment) {
            payload.files = [customImageAttachment];
          }

          await channel.send(payload).catch(()=>{});
        }
      }

      // Auto role
      if (cfg.autoRoleId) {
        const role = member.guild.roles.cache.get(cfg.autoRoleId);
        if (role) {
          await member.roles.add(role).catch(()=>{});
        }
      }
    } catch (err) {
      console.error('❌ Welcome handler error:', err);
    }
  }
};
