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
                // Find or create user in database
                let user = await prisma.user.findUnique({
                    where: { discordId: profile.id }
                });

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
                    console.log(`[Auth] New user created: ${profile.username}#${profile.discriminator}`);
                } else {
                    // Update existing user
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

                // Store guilds information
                if (profile.guilds) {
                    for (const guild of profile.guilds) {
                        // Check if user has admin permissions
                        const isAdmin = (guild.permissions & 0x8) === 0x8 || (guild.permissions & 0x20) === 0x20;

                        // Find or create guild
                        let dbGuild = await prisma.guild.findUnique({
                            where: { guildId: guild.id }
                        });

                        if (!dbGuild) {
                            dbGuild = await prisma.guild.create({
                                data: {
                                    guildId: guild.id,
                                    name: guild.name,
                                    icon: guild.icon,
                                    ownerId: guild.owner ? profile.id : ''
                                }
                            });
                        }

                        // Create or update guild member relationship
                        const existingMember = await prisma.guildMember.findUnique({
                            where: {
                                userId_guildId: {
                                    userId: user.id,
                                    guildId: dbGuild.id
                                }
                            }
                        });

                        if (!existingMember) {
                            await prisma.guildMember.create({
                                data: {
                                    userId: user.id,
                                    guildId: dbGuild.id,
                                    isAdmin
                                }
                            });
                        } else if (existingMember.isAdmin !== isAdmin) {
                            await prisma.guildMember.update({
                                where: {
                                    userId_guildId: {
                                        userId: user.id,
                                        guildId: dbGuild.id
                                    }
                                },
                                data: { isAdmin }
                            });
                        }
                    }
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
