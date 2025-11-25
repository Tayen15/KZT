const passport = require('passport');
const { Strategy } = require('passport-discord');
const prisma = require('../utils/database');
require('dotenv').config();

const scopes = ['identify', 'email', 'guilds'];

passport.use(
    new Strategy(
        {
            clientID: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            callbackURL: process.env.DISCORD_CALLBACK_URL,
            scope: scopes,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                console.log(`✅ [Auth] OAuth successful for ${profile.username}#${profile.discriminator}`);

                // Minimal upsert for user (fast path to avoid Heroku H12 timeout)
                let user = await prisma.user.findUnique({ where: { discordId: profile.id } });
                if (!user) {
                    user = await prisma.user.create({
                        data: {
                            discordId: profile.id,
                            username: profile.username,
                            discriminator: profile.discriminator,
                            avatar: profile.avatar,
                            email: profile.email,
                            accessToken,
                            refreshToken
                        }
                    });
                } else {
                    user = await prisma.user.update({
                        where: { discordId: profile.id },
                        data: {
                            username: profile.username,
                            discriminator: profile.discriminator,
                            avatar: profile.avatar,
                            email: profile.email,
                            accessToken,
                            refreshToken
                        }
                    });
                }

                // Defer heavy guild sync to background to avoid blocking callback
                try {
                    const { syncUserGuilds } = require('../utils/discordSync');
                    setImmediate(() => {
                        syncUserGuilds(prisma, profile, user.id)
                            .then(() => console.log(`[Auth] Guild sync completed for ${profile.username}`))
                            .catch(err => console.error('[Auth] Guild sync error:', err.message));
                    });
                } catch (bgErr) {
                    console.warn('[Auth] Background guild sync not scheduled:', bgErr.message);
                }

                return done(null, user);
            } catch (error) {
                console.error('[Auth] Error in authentication:', error);
                return done(error, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                guilds: {
                    include: {
                        guild: true
                    }
                }
            }
        });
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
