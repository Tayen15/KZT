# ByteBot (KZT) - AI Agent Instructions

## Architecture Overview
**Hybrid Discord Bot + Web Dashboard**: Discord.js v14 bot with Express web server, MongoDB (Prisma ORM), OAuth2 authentication.

- **Entry Points**: `bot.js` (combined), `index.js` (bot only), `server.js` (web only)
- **Bot Structure**: Command/event handler pattern (`handlers/slashCommandHandler.js`, `handlers/eventHandler.js`)
- **Commands**: Organized by category in `slashCommands/{category}/` (dev, info, music, moderation, minecraft)
- **Web Routes**: `routes/dashboard.js` (guild management), `routes/auth.js` (Discord OAuth), `routes/api.js`
- **Database**: MongoDB Atlas with Prisma - all models use `@map("_id")` for MongoDB ID field mapping

## Critical Patterns

### Database Schema (Prisma + MongoDB)
- **Provider**: `mongodb` (migrated from MySQL/PostgreSQL - see archived docs)
- **ID Fields**: All models require `@id @default(uuid()) @map("_id")` for MongoDB compatibility
- **Relations**: No `onDelete: Cascade` (unsupported in MongoDB provider)
- **Session Store**: Uses `connect-mongo` (not Prisma session store)
- **Key Models**: `User`, `Guild`, `GuildMember`, `GuildSettings`, `PrayerTime`, `ServerMonitoring`, `Rule`

### Environment Variables (`.env`)
```bash
MONGO_URI=mongodb+srv://user:pass@cluster/dbname?retryWrites=true&w=majority
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_CALLBACK_URL=http://localhost:3000/auth/callback
SESSION_SECRET=...
```
**Important**: Password special characters must be URL-encoded (e.g., `@` → `%40`)

### Database Workflows
```bash
# MongoDB schema push (not migrate)
npx prisma db push

# Generate client after schema changes
npx prisma generate

# View data (opens browser GUI)
npx prisma studio
```

### Development Commands
```bash
npm run dev              # Start bot only
npm run start:web        # Start web server only
npm start                # Start both (bot.js)
npm run watch:css        # TailwindCSS hot reload
npm run build:css        # Build production CSS
```

## Key Integrations

### Discord Features
- **Voice**: `@discordjs/voice` for music (lofi streaming via `play-dl`)
- **Slash Commands**: Auto-registered via `deploy-commands.js` on startup
- **Prayer Times**: `namaz` package for Islamic prayer notifications per guild
- **Server Monitoring**: Minecraft server status checks with auto-updates

### Web Dashboard
- **Auth**: Passport.js with `passport-discord` strategy
- **Middleware**: `ensureAuthenticated`, `ensureGuildAdmin`, `ensureBotOwner` in `middleware/auth.js`
- **Views**: EJS templates in `views/` with partials (navbar, footer, guild-sidebar)
- **Static Assets**: TailwindCSS v4 in `public/css/`, dashboard UI in `public/dashboard/`

## Common Pitfalls
1. **MongoDB IDs**: Always use `@map("_id")` on `@id` fields in Prisma schema
2. **Connection String**: Must include database name after `.mongodb.net/` (e.g., `/bytebot-app`)
3. **Session Store**: Don't use Prisma session store with MongoDB; use `connect-mongo` instead
4. **Heroku Deploy**: Use `npx prisma db push` (not `migrate deploy`) in `heroku-postbuild` script
5. **Voice Connections**: Must call `saveLofiSession()` in `utils/lofiStorage.js` after joining voice

## File References
- **Core Logic**: `handlers/`, `slashCommands/`, `routes/`
- **Utilities**: `utils/database.js` (Prisma client), `utils/lofiStorage.js`, `utils/jsonStorage.js`
- **Middleware**: `middleware/auth.js` (dashboard guards), `middleware/passport.js` (OAuth config)
- **Archived Docs**: `DATABASE_MIGRATION.md`, `HEROKU_DEPLOYMENT.md` (contain PostgreSQL references, now historical)

## Testing & Debugging
- Test routes available in dev mode (see `routes/dashboard.js` `/test/prayer/:guildId`)
- Discord bot logs to console with emoji prefixes (✅, ❌, ⚠️)
- Check Prisma queries with `DEBUG="prisma:*"` env var
- MongoDB Atlas dashboard for direct database inspection

## Deploy to Heroku
1. Set `MONGO_URI` and Discord config vars
2. **Add buildpacks in order:**
   - `heroku/nodejs` (first)
   - `https://github.com/heroku/heroku-buildpack-activestorage-preview` (for FFmpeg, voice support)
3. Push to Heroku Git or connect GitHub repo
4. Automatic build runs `npx prisma db push && npx prisma generate`
5. Scale dyno: `heroku ps:scale web=1`

## Code Style & Development Guidelines

### Naming Conventions
Follow existing codebase patterns consistently: `camelCase` for variables/functions, `PascalCase` for models/classes, kebab-case for file/folder names, descriptive names matching context (e.g., `ensureAuthenticated`, `slashCommandHandler`, `lofiStorage`).

### Modular Code Structure
Keep related functionality in single files to avoid repeated imports - examine existing utility files (`utils/lofiStorage.js`, `utils/jsonStorage.js`) for reference, create new utilities when logic is reused across multiple commands/routes, avoid splitting simple functions into separate modules unless genuinely shared.

### Clean Development Practices
Write self-documenting code with clear variable names and minimal inline comments, handle errors gracefully with console logging using emoji prefixes (✅ success, ❌ error, ⚠️ warning), validate inputs at route/command entry points, use async/await consistently throughout the codebase, maintain separation between bot logic (handlers/commands) and web logic (routes/middleware).

### Commit Message Standards
Use concise single-line descriptions for simple changes, combine multiple related edits into one descriptive sentence (e.g., "Update Prisma schema for MongoDB compatibility, remove unsupported cascade deletes, and add @map annotations for _id fields"), avoid bullet points or multi-paragraph explanations, prefix with action verbs (Add, Update, Fix, Remove, Refactor), keep messages under 100 characters when possible.
