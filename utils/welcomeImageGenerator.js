const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

/**
 * Generate custom welcome image with user avatar and configurable design
 * @param {Object} options - Configuration options
 * @param {string} options.username - User's display name
 * @param {string} options.avatarUrl - URL to user's avatar
 * @param {string} options.layout - Layout style (classic, modern, minimal)
 * @param {string} options.bgImageUrl - Background image URL
 * @param {string} options.bgColor - Background color fallback
 * @param {string} options.circleColor - Avatar border color
 * @param {string} options.titleColor - "WELCOME" title color
 * @param {string} options.usernameColor - Username text color
 * @param {string} options.messageColor - Message text color
 * @param {string} options.overlayColor - Overlay color
 * @param {number} options.overlayOpacity - Overlay opacity (0-100)
 * @param {string} options.avatarShape - Avatar shape (circle or square)
 * @param {string} options.font - Font name
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateWelcomeImage(options) {
  const {
    username = 'User',
    avatarUrl,
    layout = 'classic',
    bgImageUrl,
    bgColor = '#23272A',
    circleColor = '#FFFFFF',
    titleColor = '#FFFFFF',
    usernameColor = '#FFFFFF',
    messageColor = '#B9BBBE',
    overlayColor = '#000000',
    overlayOpacity = 50,
    avatarShape = 'circle',
    font = 'Discord'
  } = options;

  const width = 1024;
  const height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Draw background
  if (bgImageUrl) {
    try {
      const bgImage = await loadImage(bgImageUrl);
      ctx.drawImage(bgImage, 0, 0, width, height);
    } catch (err) {
      console.warn('⚠️ Failed to load background image, using color fallback');
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Draw overlay
  if (overlayOpacity > 0) {
    ctx.fillStyle = hexToRGBA(overlayColor, overlayOpacity / 100);
    ctx.fillRect(0, 0, width, height);
  }

  // Layout-specific rendering
  if (layout === 'classic') {
    await drawClassicLayout(ctx, { username, avatarUrl, circleColor, titleColor, usernameColor, messageColor, avatarShape, width, height });
  } else if (layout === 'modern') {
    await drawModernLayout(ctx, { username, avatarUrl, circleColor, titleColor, usernameColor, messageColor, avatarShape, width, height });
  } else {
    await drawMinimalLayout(ctx, { username, avatarUrl, circleColor, titleColor, usernameColor, messageColor, avatarShape, width, height });
  }

  return canvas.toBuffer('image/png');
}

async function drawClassicLayout(ctx, options) {
  const { username, avatarUrl, circleColor, titleColor, usernameColor, avatarShape, width, height } = options;
  const centerX = width / 2;
  const centerY = height / 2;

  // Avatar (top center)
  const avatarSize = 180;
  const avatarY = 100;
  
  if (avatarUrl) {
    try {
      const avatar = await loadImage(avatarUrl);
      ctx.save();
      
      if (avatarShape === 'circle') {
        // Circle clipping
        ctx.beginPath();
        ctx.arc(centerX, avatarY, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, centerX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
        ctx.restore();
        
        // Circle border
        ctx.strokeStyle = circleColor;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(centerX, avatarY, avatarSize / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Square with rounded corners
        const radius = 20;
        ctx.beginPath();
        roundRect(ctx, centerX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize, radius);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, centerX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
        ctx.restore();
        
        // Square border
        ctx.strokeStyle = circleColor;
        ctx.lineWidth = 8;
        ctx.beginPath();
        roundRect(ctx, centerX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize, radius);
        ctx.stroke();
      }
    } catch (err) {
      console.warn('⚠️ Failed to load avatar, using placeholder');
      drawPlaceholderAvatar(ctx, centerX, avatarY, avatarSize, circleColor, avatarShape);
    }
  } else {
    drawPlaceholderAvatar(ctx, centerX, avatarY, avatarSize, circleColor, avatarShape);
  }

  // "WELCOME" title
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 80px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('WELCOME', centerX, avatarY + avatarSize / 2 + 100);

  // Username
  ctx.fillStyle = usernameColor;
  ctx.font = 'bold 50px Arial';
  ctx.fillText(username.toUpperCase(), centerX, avatarY + avatarSize / 2 + 170);
}

async function drawModernLayout(ctx, options) {
  const { username, avatarUrl, circleColor, titleColor, usernameColor, avatarShape, width, height } = options;
  
  // Left-aligned avatar
  const avatarSize = 200;
  const avatarX = 150;
  const avatarY = height / 2;

  if (avatarUrl) {
    try {
      const avatar = await loadImage(avatarUrl);
      ctx.save();
      
      if (avatarShape === 'circle') {
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
        ctx.restore();
        
        ctx.strokeStyle = circleColor;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const radius = 25;
        ctx.beginPath();
        roundRect(ctx, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize, radius);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
        ctx.restore();
        
        ctx.strokeStyle = circleColor;
        ctx.lineWidth = 8;
        ctx.beginPath();
        roundRect(ctx, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize, radius);
        ctx.stroke();
      }
    } catch (err) {
      drawPlaceholderAvatar(ctx, avatarX, avatarY, avatarSize, circleColor, avatarShape);
    }
  } else {
    drawPlaceholderAvatar(ctx, avatarX, avatarY, avatarSize, circleColor, avatarShape);
  }

  // Right-aligned text
  const textX = avatarX + avatarSize / 2 + 80;
  
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 70px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('WELCOME', textX, avatarY - 30);

  ctx.fillStyle = usernameColor;
  ctx.font = 'bold 55px Arial';
  ctx.fillText(username, textX, avatarY + 50);
}

async function drawMinimalLayout(ctx, options) {
  const { username, avatarUrl, circleColor, titleColor, usernameColor, avatarShape, width, height } = options;
  const centerX = width / 2;
  const centerY = height / 2;

  // Small centered avatar
  const avatarSize = 120;

  if (avatarUrl) {
    try {
      const avatar = await loadImage(avatarUrl);
      ctx.save();
      
      if (avatarShape === 'circle') {
        ctx.beginPath();
        ctx.arc(centerX, centerY - 50, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, centerX - avatarSize / 2, centerY - 50 - avatarSize / 2, avatarSize, avatarSize);
        ctx.restore();
        
        ctx.strokeStyle = circleColor;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(centerX, centerY - 50, avatarSize / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const radius = 15;
        ctx.beginPath();
        roundRect(ctx, centerX - avatarSize / 2, centerY - 50 - avatarSize / 2, avatarSize, avatarSize, radius);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, centerX - avatarSize / 2, centerY - 50 - avatarSize / 2, avatarSize, avatarSize);
        ctx.restore();
        
        ctx.strokeStyle = circleColor;
        ctx.lineWidth = 5;
        ctx.beginPath();
        roundRect(ctx, centerX - avatarSize / 2, centerY - 50 - avatarSize / 2, avatarSize, avatarSize, radius);
        ctx.stroke();
      }
    } catch (err) {
      drawPlaceholderAvatar(ctx, centerX, centerY - 50, avatarSize, circleColor, avatarShape);
    }
  } else {
    drawPlaceholderAvatar(ctx, centerX, centerY - 50, avatarSize, circleColor, avatarShape);
  }

  // Text below
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 50px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('WELCOME', centerX, centerY + 80);

  ctx.fillStyle = usernameColor;
  ctx.font = '40px Arial';
  ctx.fillText(username, centerX, centerY + 140);
}

function drawPlaceholderAvatar(ctx, x, y, size, color, shape) {
  if (shape === 'circle') {
    ctx.fillStyle = '#36393F';
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.stroke();
    
    // Draw user icon
    ctx.fillStyle = color;
    ctx.font = `${size / 2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👤', x, y);
  } else {
    const radius = 20;
    ctx.fillStyle = '#36393F';
    ctx.beginPath();
    roundRect(ctx, x - size / 2, y - size / 2, size, size, radius);
    ctx.fill();
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.stroke();
    
    ctx.fillStyle = color;
    ctx.font = `${size / 2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👤', x, y);
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function hexToRGBA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

module.exports = { generateWelcomeImage };
