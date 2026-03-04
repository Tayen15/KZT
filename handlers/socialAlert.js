/**
 * Social Alert Handler
 * Monitors social media platforms and sends Discord notifications
 */

const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const Parser = require('rss-parser');
const rssParser = new Parser();
const prisma = require('../utils/database');

// Active monitoring intervals
const monitoringIntervals = new Map();

/**
 * Initialize social alert monitoring for all enabled alerts
 * @param {Client} client - Discord.js client
 */
async function setupSocialAlerts(client) {
    try {
        console.log('🔔 Setting up Social Alert monitoring...');

        // Get all enabled alerts
        const alerts = await prisma.socialAlert.findMany({
            where: { enabled: true }
        });

        if (alerts.length === 0) {
            console.log('⚠️ No enabled social alerts found');
            return;
        }

        console.log(`✅ Found ${alerts.length} enabled social alert(s)`);

        // Start monitoring for each alert
        for (const alert of alerts) {
            startMonitoring(client, alert);
        }

        console.log('✅ Social Alert monitoring initialized');
    } catch (error) {
        console.error('❌ Error setting up social alerts:', error);
    }
}

/**
 * Start monitoring for a specific alert
 * @param {Client} client - Discord.js client
 * @param {Object} alert - Social alert configuration
 */
function startMonitoring(client, alert) {
    // Clear existing interval if any
    if (monitoringIntervals.has(alert.id)) {
        clearInterval(monitoringIntervals.get(alert.id));
    }

    // Check immediately
    checkForUpdates(client, alert);

    // Set up recurring checks
    const intervalMs = alert.checkInterval * 60 * 1000; // Convert minutes to ms
    const interval = setInterval(() => {
        checkForUpdates(client, alert);
    }, intervalMs);

    monitoringIntervals.set(alert.id, interval);
    console.log(`🔔 Started monitoring ${alert.platform} alert for ${alert.username} (every ${alert.checkInterval}m)`);
}

/**
 * Stop monitoring for a specific alert
 * @param {String} alertId - Alert ID
 */
function stopMonitoring(alertId) {
    if (monitoringIntervals.has(alertId)) {
        clearInterval(monitoringIntervals.get(alertId));
        monitoringIntervals.delete(alertId);
        console.log(`🔕 Stopped monitoring alert ${alertId}`);
    }
}

/**
 * Check for new content from social media platform
 * @param {Client} client - Discord.js client
 * @param {Object} alert - Social alert configuration
 */
async function checkForUpdates(client, alert) {
    try {
        // Get guild and channel
        const guild = await prisma.guild.findUnique({
            where: { id: alert.guildId }
        });

        if (!guild) {
            console.error(`❌ Guild not found for alert ${alert.id}`);
            return;
        }

        const discordGuild = client.guilds.cache.get(guild.guildId);
        if (!discordGuild) {
            console.error(`❌ Discord guild not found: ${guild.guildId}`);
            return;
        }

        const channel = discordGuild.channels.cache.get(alert.channelId);
        if (!channel) {
            console.error(`❌ Channel not found for alert ${alert.id}`);
            return;
        }

        // TODO: Implement platform-specific API checks
        switch (alert.platform) {
            case 'youtube':
                await checkYouTube(client, alert, channel);
                break;
            case 'twitch':
                await checkTwitch(client, alert, channel);
                break;
            case 'twitter':
                await checkTwitter(client, alert, channel);
                break;
            case 'instagram':
                await checkInstagram(client, alert, channel);
                break;
            default:
                console.error(`❌ Unknown platform: ${alert.platform}`);
        }

        // Update last checked timestamp
        await prisma.socialAlert.update({
            where: { id: alert.id },
            data: { lastChecked: new Date() }
        });

    } catch (error) {
        console.error(`❌ Error checking updates for alert ${alert.id}:`, error);
    }
}

/**
 * Check YouTube for new videos/live streams
 * Uses YouTube Data API v3
 */
async function checkYouTube(client, alert, channel) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
        console.error('❌ YOUTUBE_API_KEY not configured');
        return;
    }

    try {
        // Get channel ID from channelUrl or resolve from username
        let channelId = null;
        
        if (alert.channelUrl && alert.channelUrl.includes('/channel/')) {
            channelId = alert.channelUrl.split('/channel/')[1].split('/')[0].split('?')[0];
        } else if (alert.channelUrl && alert.channelUrl.includes('/@')) {
            const handle = alert.channelUrl.split('/@')[1].split('/')[0].split('?')[0];
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=@${handle}&type=channel&maxResults=1&key=${apiKey}`;
            const searchRes = await axios.get(searchUrl);
            
            if (searchRes.data.items && searchRes.data.items.length > 0) {
                channelId = searchRes.data.items[0].id.channelId;
            }
        } else {
            // Search by username
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(alert.username)}&type=channel&maxResults=1&key=${apiKey}`;
            const searchRes = await axios.get(searchUrl);
            
            if (searchRes.data.items && searchRes.data.items.length > 0) {
                channelId = searchRes.data.items[0].id.channelId;
            }
        }

        if (!channelId) {
            console.error(`❌ Could not resolve YouTube channel ID for ${alert.username}`);
            return;
        }

        // Get channel details (for profile picture)
        let channelThumbnail = null;
        try {
            const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`;
            const channelRes = await axios.get(channelUrl);
            if (channelRes.data.items && channelRes.data.items.length > 0) {
                channelThumbnail = channelRes.data.items[0].snippet.thumbnails.high?.url || channelRes.data.items[0].snippet.thumbnails.default?.url;
            }
        } catch (err) {
            console.warn('⚠️ Failed to fetch channel thumbnail:', err.message);
        }

        // Check for live streams if enabled
        if (alert.notifyLive) {
            const liveUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`;
            const liveRes = await axios.get(liveUrl);
            
            if (liveRes.data.items && liveRes.data.items.length > 0) {
                const liveStream = liveRes.data.items[0];
                const videoId = liveStream.id.videoId;
                
                if (videoId !== alert.lastContentId) {
                    await sendNotification(channel, alert, {
                        id: videoId,
                        title: liveStream.snippet.title,
                        description: liveStream.snippet.description.substring(0, 200) + '...',
                        url: `https://www.youtube.com/watch?v=${videoId}`,
                        videoThumbnail: liveStream.snippet.thumbnails.high?.url || liveStream.snippet.thumbnails.default?.url,
                        channelThumbnail: channelThumbnail,
                        author: {
                            name: liveStream.snippet.channelTitle,
                            icon: null,
                            url: `https://www.youtube.com/channel/${channelId}`
                        },
                        isLive: true
                    });
                    return;
                }
            }
        }

        // Check for latest videos if enabled
        if (alert.notifyVideo) {
            const videosUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=1&key=${apiKey}`;
            const videosRes = await axios.get(videosUrl);
            
            if (videosRes.data.items && videosRes.data.items.length > 0) {
                const latestVideo = videosRes.data.items[0];
                const videoId = latestVideo.id.videoId;
                
                if (videoId !== alert.lastContentId) {
                    await sendNotification(channel, alert, {
                        id: videoId,
                        title: latestVideo.snippet.title,
                        description: latestVideo.snippet.description.substring(0, 200) + '...',
                        url: `https://www.youtube.com/watch?v=${videoId}`,
                        videoThumbnail: latestVideo.snippet.thumbnails.high?.url || latestVideo.snippet.thumbnails.default?.url,
                        channelThumbnail: channelThumbnail,
                        author: {
                            name: latestVideo.snippet.channelTitle,
                            icon: null,
                            url: `https://www.youtube.com/channel/${channelId}`
                        },
                        isVideo: true
                    });
                }
            }
        }
    } catch (error) {
        console.error(`❌ Error checking YouTube for ${alert.username}:`, error.response?.data || error.message);
    }
}

/**
 * TODO: Check Twitch for live streams
 * Requires: Twitch API credentials in .env (TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET)
 * 
 * Implementation steps:
 * 1. Get OAuth token from Twitch
 * 2. Get user ID from username
 * 3. Check stream status
 * 4. Send notification if live
 * 
 * API Reference: https://dev.twitch.tv/docs/api/
 */
async function checkTwitch(client, alert, channel) {
    console.log(`🔍 Checking Twitch for ${alert.username}...`);
    
    // TODO: Implement Twitch API integration
    // const clientId = process.env.TWITCH_CLIENT_ID;
    // const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    
    // Example implementation:
    // 1. Get OAuth token: POST https://id.twitch.tv/oauth2/token
    // 2. Get user: GET https://api.twitch.tv/helix/users?login={username}
    // 3. Get stream: GET https://api.twitch.tv/helix/streams?user_id={userId}
    
    console.log('⚠️ Twitch monitoring not yet implemented - requires API credentials');
}

/**
 * TODO: Check Twitter/X for new posts
 * Requires: Twitter API credentials in .env (TWITTER_BEARER_TOKEN)
 * 
 * Implementation steps:
 * 1. Get user ID from username
 * 2. Fetch latest tweets
 * 3. Check if tweet is new (compare with lastContentId)
 * 4. Send notification if new tweet found
 * 
 * API Reference: https://developer.twitter.com/en/docs/twitter-api
 * Note: Twitter API v2 requires elevated access for some endpoints
 */
async function checkTwitter(client, alert, channel) {
    console.log(`🔍 Checking Twitter for ${alert.username}...`);
    
    // TODO: Implement Twitter API integration
    // const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    
    // Example implementation:
    // 1. Get user: GET https://api.twitter.com/2/users/by/username/{username}
    // 2. Get tweets: GET https://api.twitter.com/2/users/{userId}/tweets?max_results=5
    
    console.log('⚠️ Twitter monitoring not yet implemented - requires API credentials');
}

/**
 * Check Instagram for new posts
 * Uses RSSHub as fallback for public accounts (Graph API only works for owned accounts)
 * 
 * Method 1 (Primary): RSSHub - Works for ANY public Instagram account
 * Method 2 (Fallback): Graph API - Only for Business accounts you own/manage
 */
async function checkInstagram(client, alert, channel) {
    try {
        console.log(`🔍 Checking Instagram for @${alert.username}...`);

        // Extract username from URL if provided
        let username = alert.username;
        if (alert.channelUrl && alert.channelUrl.includes('instagram.com')) {
            const urlUsername = alert.channelUrl.split('instagram.com/')[1]?.split('/')[0]?.split('?')[0];
            if (urlUsername) {
                username = urlUsername;
            }
        }

        // Method 1: Try RSSHub (supports any public account)
        try {
            const rsshubUrl = process.env.RSSHUB_URL || 'https://rsshub.app';
            const feedUrl = `${rsshubUrl}/instagram/user/${username}`;
            
            console.log(`📡 Fetching RSS feed from RSSHub...`);
            const feed = await rssParser.parseURL(feedUrl);
            
            if (!feed || !feed.items || feed.items.length === 0) {
                console.log('⚠️ No posts found in RSS feed');
                return;
            }

            // Get most recent post
            const latestPost = feed.items[0];
            
            // Generate unique ID from post URL
            const postId = latestPost.link.split('/p/')[1]?.split('/')[0] || latestPost.guid;
            
            // Check if this is a new post
            if (postId === alert.lastContentId) {
                console.log('ℹ️ No new Instagram posts');
                return;
            }

            // Extract image from content (RSS feed includes HTML content)
            let imageUrl = null;
            if (latestPost.content) {
                const imgMatch = latestPost.content.match(/<img[^>]+src="([^">]+)"/);
                if (imgMatch) {
                    imageUrl = imgMatch[1];
                }
            }
            
            // Build notification data
            const content = {
                id: postId,
                title: `New post from @${username}`,
                description: latestPost.contentSnippet || latestPost.title || '',
                url: latestPost.link,
                channelThumbnail: null, // RSS doesn't include profile pic
                videoThumbnail: imageUrl,
                author: {
                    name: `@${username}`,
                    icon: null,
                    url: `https://www.instagram.com/${username}/`
                },
                isVideo: latestPost.title?.toLowerCase().includes('video') || false,
                isLive: false
            };

            // Send notification
            await sendNotification(channel, alert, content);
            console.log(`✅ Instagram check completed for @${username} (via RSSHub)`);
            return;

        } catch (rssError) {
            // Check if it's Instagram blocking (404 error)
            if (rssError.message.includes('404') || rssError.message.includes('Not Found')) {
                console.warn('⚠️ RSSHub Instagram scraper is currently blocked by Instagram (404 error)');
                console.log('ℹ️ Instagram frequently blocks scraping methods - this is NOT a bot bug');
                console.log('ℹ️ Trying Graph API method (only works for owned Business accounts)...');
            } else if (rssError.message.includes('522') || rssError.message.includes('timeout')) {
                console.warn('⚠️ RSSHub server timeout - public instance may be overloaded');
                console.log('ℹ️ Trying Graph API method as fallback...');
            } else {
                console.warn('⚠️ RSSHub method failed:', rssError.message);
                console.log('ℹ️ Trying Graph API method for Business accounts...');
            }
        }

        // Method 2: Try Graph API (only for owned Business/Creator accounts)
        const accessToken = process.env.IG_ACCESS_TOKEN;
        
        if (!accessToken) {
            console.error('❌ Instagram monitoring FAILED: Both methods unavailable');
            console.log('');
            console.log('📌 CURRENT SITUATION:');
            console.log('   ⚠️ RSSHub Instagram is BLOCKED by Instagram (scraping methods detected)');
            console.log('   ⚠️ Graph API requires IG_ACCESS_TOKEN (only for owned Business accounts)');
            console.log('');
            console.log('💡 SOLUTIONS:');
            console.log('   1. ONLY OPTION: Use Graph API for accounts YOU OWN');
            console.log('      - Run: node scripts/get-instagram-token.js');
            console.log('      - Convert YOUR Instagram to Business account');
            console.log('      - Link to YOUR Facebook Page');
            console.log('');
            console.log('   2. CANNOT monitor accounts you don\'t own (like @' + username + ')');
            console.log('      - Wait for RSSHub team to fix Instagram scraper');
            console.log('      - Or use alternative monitoring service');
            console.log('');
            return;
        }

        // Get Facebook Pages
        const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`;
        const pagesRes = await axios.get(pagesUrl);
        
        if (!pagesRes.data.data || pagesRes.data.data.length === 0) {
            console.error('❌ No Facebook Pages found');
            console.log('⚠️ Graph API only works for Instagram Business accounts YOU OWN');
            console.log('💡 You CANNOT monitor @' + username + ' unless it\'s YOUR account');
            console.log('');
            console.log('📌 To use Graph API:');
            console.log('   1. You must OWN the Instagram account');
            console.log('   2. Convert it to Business/Creator account');
            console.log('   3. Link to YOUR Facebook Page');
            console.log('   4. Run: node scripts/get-instagram-token.js');
            console.log('');
            console.log('⏳ For monitoring others: Wait for RSSHub Instagram scraper fix');
            return;
        }

        // Find matching Instagram Business Account
        let igUserId = null;
        for (const page of pagesRes.data.data) {
            try {
                const pageUrl = `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`;
                const pageRes = await axios.get(pageUrl);
                
                if (pageRes.data.instagram_business_account) {
                    igUserId = pageRes.data.instagram_business_account.id;
                    
                    const igUserUrl = `https://graph.facebook.com/v18.0/${igUserId}?fields=username,profile_picture_url&access_token=${accessToken}`;
                    const igUserRes = await axios.get(igUserUrl);
                    
                    if (igUserRes.data.username.toLowerCase() === username.toLowerCase()) {
                        console.log(`✅ Found owned Instagram Business account: @${igUserRes.data.username}`);
                        break;
                    }
                }
            } catch (err) {
                // Skip page
            }
        }

        if (!igUserId) {
            console.error(`❌ @${username} is NOT linked to your Facebook Pages`);
            console.log('');
            console.log('⚠️ Graph API REQUIRES OWNERSHIP - you CANNOT monitor accounts you don\'t own');
            console.log('');
            console.log('📌 Current alert for @' + username + ' cannot work because:');
            console.log('   1. RSSHub Instagram scraper is blocked by Instagram');
            console.log('   2. Graph API only works for YOUR owned Business accounts');
            console.log('   3. You cannot link or convert someone else\'s Instagram account');
            console.log('');
            console.log('💡 OPTIONS:');
            console.log('   - Wait for RSSHub team to update Instagram scraper');
            console.log('   - Disable this alert temporarily');
            console.log('   - Only create alerts for Instagram accounts YOU OWN');
            console.log('');
            return;
        }

        // Get recent media
        const mediaUrl = `https://graph.facebook.com/v18.0/${igUserId}/media`;
        const mediaRes = await axios.get(mediaUrl, {
            params: {
                fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username',
                limit: 5,
                access_token: accessToken
            }
        });

        if (!mediaRes.data.data || mediaRes.data.data.length === 0) {
            console.log('ℹ️ No recent media found');
            return;
        }

        const latestPost = mediaRes.data.data[0];

        if (latestPost.id === alert.lastContentId) {
            console.log('ℹ️ No new Instagram posts');
            return;
        }

        // Get profile picture
        let profilePicture = null;
        try {
            const userUrl = `https://graph.facebook.com/v18.0/${igUserId}?fields=profile_picture_url&access_token=${accessToken}`;
            const userRes = await axios.get(userUrl);
            profilePicture = userRes.data.profile_picture_url;
        } catch (err) {
            console.warn('⚠️ Failed to fetch profile picture:', err.message);
        }

        const content = {
            id: latestPost.id,
            title: `New ${latestPost.media_type.toLowerCase()} from @${latestPost.username}`,
            description: latestPost.caption ? latestPost.caption.substring(0, 400) + (latestPost.caption.length > 400 ? '...' : '') : '',
            url: latestPost.permalink,
            channelThumbnail: profilePicture,
            videoThumbnail: latestPost.media_type === 'VIDEO' ? (latestPost.thumbnail_url || latestPost.media_url) : latestPost.media_url,
            author: {
                name: `@${latestPost.username}`,
                icon: profilePicture,
                url: `https://www.instagram.com/${latestPost.username}/`
            },
            isVideo: latestPost.media_type === 'VIDEO' || latestPost.media_type === 'REELS',
            isLive: false
        };

        await sendNotification(channel, alert, content);
        console.log(`✅ Instagram check completed for @${username} (via Graph API)`);

    } catch (error) {
        console.error('❌ Error checking Instagram:', error.message);
        if (error.response) {
            console.error('API Error:', error.response.data);
            
            if (error.response.data.error?.code === 190) {
                console.error('❌ Access token expired or invalid!');
                console.log('ℹ️ Run: node scripts/get-instagram-token.js to generate new token');
            }
        }
    }
}

/**
 * Send notification to Discord channel
 * @param {Object} channel - Discord channel
 * @param {Object} alert - Social alert configuration
 * @param {Object} content - Content data (title, description, url, thumbnail, etc)
 */
async function sendNotification(channel, alert, content) {
    try {
        // Build embed
        const embed = new EmbedBuilder()
            .setColor(alert.embedColor || '#5865F2')
            .setTitle(content.title || 'New Content!')
            .setURL(content.url)
            .setDescription(content.description || '')
            .setTimestamp();

        // Thumbnail = Channel profile picture
        if (alert.showThumbnail && content.channelThumbnail) {
            embed.setThumbnail(content.channelThumbnail);
        }

        // Image = Video/content thumbnail
        if (content.videoThumbnail) {
            embed.setImage(content.videoThumbnail);
        }

        if (alert.showAuthor && content.author) {
            embed.setAuthor({
                name: content.author.name,
                iconURL: content.author.icon,
                url: content.author.url
            });
        }

        // Build message content
        let messageContent = '';
        
        // Add role mention if configured
        if (alert.customRole) {
            if (alert.customRole === '@everyone') {
                messageContent = '@everyone';
            } else {
                messageContent = `<@&${alert.customRole}>`;
            }
        }

        // Add custom message template
        const template = content.isLive ? alert.liveMessage : (content.isVideo ? alert.videoMessage : alert.postMessage);
        if (template) {
            const message = template
                .replace(/\{username\}/g, alert.username)
                .replace(/\{title\}/g, content.title)
                .replace(/\{url\}/g, content.url);
            messageContent += (messageContent ? '\n' : '') + message;
        }

        // Send message
        await channel.send({
            content: messageContent || undefined,
            embeds: alert.customEmbed ? [embed] : []
        });

        // Update statistics
        await prisma.socialAlert.update({
            where: { id: alert.id },
            data: {
                totalAlerts: { increment: 1 },
                lastAlertDate: new Date(),
                lastContentId: content.id
            }
        });

        console.log(`✅ Sent ${alert.platform} notification for ${alert.username}`);
    } catch (error) {
        console.error('❌ Error sending notification:', error);
    }
}

/**
 * Reload alerts for a specific guild
 * @param {Client} client - Discord.js client
 * @param {String} guildId - Guild database ID
 */
async function reloadGuildAlerts(client, guildId) {
    try {
        // Stop all existing alerts for this guild
        const existingAlerts = await prisma.socialAlert.findMany({
            where: { guildId }
        });

        for (const alert of existingAlerts) {
            stopMonitoring(alert.id);
        }

        // Restart enabled alerts
        const enabledAlerts = await prisma.socialAlert.findMany({
            where: { guildId, enabled: true }
        });

        for (const alert of enabledAlerts) {
            startMonitoring(client, alert);
        }

        console.log(`✅ Reloaded ${enabledAlerts.length} alert(s) for guild ${guildId}`);
    } catch (error) {
        console.error('❌ Error reloading guild alerts:', error);
    }
}

module.exports = {
    setupSocialAlerts,
    startMonitoring,
    stopMonitoring,
    reloadGuildAlerts
};
