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
- **Middleware**: `ensureAuthenticated`, `ensureGuildAdmin`, `ensureBotOwner`, `ensureBotInGuild` in `middleware/auth.js`
- **Views**: EJS templates in `views/` with partials (navbar, footer, guild-sidebar)
- **Static Assets**: TailwindCSS v4 via CDN in `public/css/`, dashboard UI in `public/dashboard/`
- **Design System**: Consistent dark theme with Discord-inspired colors (see Web Design Guidelines below)

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

## Web Design Guidelines

### Color Palette (Discord-Inspired Dark Theme)
**Primary Colors:**
- Background: `#1a1d23` (main bg), `#2b2f38` (card bg), `#3a3f4b` (borders)
- Text: `#ffffff` (primary), `#b9bbbe` (secondary/muted)
- Accent: `#5865F2` (Discord Blurple - primary actions), `#4752c4` (hover state)
- Success: `#57F287` (green), Error: `#ED4245` (red), Warning: `#FEE75C` (yellow)

**Role/Status Colors:**
- Owner: `#f59e0b` (yellow-500), Admin: `#3b82f6` (blue-500)
- Online: `#57F287`, Offline: `#ED4245`

### Typography
- **Headings**: Bold, clear hierarchy (text-4xl → text-2xl → text-xl → text-lg)
- **Body**: Default 16px, line-height 1.6 for readability
- **Monospace**: Use for code, IDs, technical data (`font-mono`)

### Component Patterns

#### Cards
```html
<div class="bg-[#2b2f38] border border-[#3a3f4b] rounded-xl p-6 hover:border-[#5865F2] transition-all duration-300">
    <!-- Card content -->
</div>
```

#### Buttons
- **Primary**: `bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105`
- **Secondary**: `bg-[#747F8D] hover:bg-[#5D6773] text-white ...`
- **Success**: `bg-[#57F287] hover:bg-[#3BA55D] text-white ...`
- **Danger**: `bg-[#ED4245] hover:bg-[#C03537] text-white ...`

#### Status Badges
```html
<!-- Owner Badge -->
<div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-2 py-0.5 flex items-center gap-1.5">
    <svg class="w-3.5 h-3.5 text-yellow-500">...</svg>
    <span class="text-yellow-500 text-xs font-semibold">Owner</span>
</div>

<!-- Admin Badge -->
<div class="bg-blue-500/10 border border-blue-500/30 rounded-lg px-2 py-0.5 flex items-center gap-1.5">
    <svg class="w-3.5 h-3.5 text-blue-500">...</svg>
    <span class="text-blue-500 text-xs font-semibold">Admin</span>
</div>
```

#### Bot Status Indicators
- **Bot in Guild**: Border `border-[#3a3f4b]`, hover `hover:border-[#5865F2]`
- **Bot not in Guild**: Border `border-yellow-500/50`, hover `hover:border-yellow-500`, label "Invite Bot First" with warning icon

### Layout Standards

#### Page Structure
```html
<body class="bg-[#1a1d23] text-white min-h-screen">
    <%- include('../partials/navbar') %>
    
    <main class="container mx-auto px-4 py-12">
        <!-- Page Header -->
        <div class="mb-8">
            <h1 class="text-4xl font-bold mb-2">Page Title</h1>
            <p class="text-[#b9bbbe]">Description</p>
        </div>
        
        <!-- Content Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Cards here -->
        </div>
    </main>
    
    <%- include('../partials/footer') %>
</body>
```

#### Responsive Grid
- Mobile: 1 column
- Tablet (md): 2 columns
- Desktop (lg): 3 columns
- Use `gap-6` for consistent spacing

### Animation & Transitions
- **Duration**: 200-300ms for UI feedback
- **Hover Effects**: `transform hover:scale-105`, `hover:translate-x-1`, `hover:-translate-y-1`
- **Color Transitions**: `transition-colors duration-200`
- **Transform Transitions**: `transition-transform duration-200`
- **All Combined**: `transition-all duration-300`

### Icons
- **Source**: Heroicons (inline SVG, outline style preferred)
- **Size**: `w-4 h-4` (small), `w-5 h-5` (default), `w-6 h-6` (large)
- **Color**: Inherit from parent or use contextual color classes

### Spacing
- **Container Padding**: `px-4 py-12` (mobile), `px-6` (tablet+)
- **Card Padding**: `p-6` (default), `p-4` (compact)
- **Section Margins**: `mb-8` (major sections), `mb-4` (subsections)
- **Element Gaps**: `gap-2` (tight), `gap-4` (default), `gap-6` (loose)

### Accessibility
- Use semantic HTML (`<main>`, `<nav>`, `<section>`)
- Provide `alt` text for images
- Ensure sufficient color contrast (WCAG AA minimum)
- Use `aria-label` for icon-only buttons
- Maintain focus states for keyboard navigation

### Consistency Rules
1. **Always use TailwindCSS via CDN** (version 3.x via `<script src="https://cdn.tailwindcss.com"></script>`)
2. **Stick to the defined color palette** - no custom hex colors outside the palette
3. **Reuse component patterns** - copy existing card/button/badge structures
4. **Maintain spacing rhythm** - use the defined spacing scale
5. **Keep transitions uniform** - use standard durations and easing
6. **Test responsive behavior** - verify mobile, tablet, desktop layouts
7. **Follow naming conventions** - descriptive class names, semantic markup

### Example: Server Card (Reference Implementation)
```html
<a href="/dashboard/guild/<%= guild.guildId %>"
   class="group bg-[#2b2f38] border-2 border-[#3a3f4b] rounded-xl p-6 hover:border-[#5865F2] transition-all duration-300 relative overflow-hidden">
    <!-- Server Icon & Info -->
    <div class="flex items-start space-x-4 mb-4">
        <img src="..." class="w-16 h-16 rounded-xl border-2 border-[#3a3f4b] group-hover:border-[#5865F2] transition-all duration-300">
        <div class="flex-1 min-w-0">
            <h3 class="text-lg font-bold mb-1 truncate group-hover:text-[#5865F2] transition-colors duration-200">
                Server Name
            </h3>
            <div class="flex items-center gap-2 text-[#b9bbbe] text-sm">
                <svg class="w-4 h-4">...</svg>
                <span>100 members</span>
                <!-- Status Badge -->
            </div>
        </div>
    </div>
    
    <!-- Action Footer -->
    <div class="pt-4 border-t border-[#3a3f4b] flex items-center justify-between text-sm">
        <span class="text-[#b9bbbe] group-hover:text-[#5865F2] transition-colors duration-200 font-medium">
            Configure Settings
        </span>
        <svg class="w-5 h-5 text-[#5865F2] transform group-hover:translate-x-1 transition-transform duration-200">...</svg>
    </div>
</a>
```

### Dashboard-Specific Patterns

#### Guild Sidebar Navigation
- Active state: `bg-[#5865F2]` with white text
- Inactive: `hover:bg-[#3a3f4b]` with muted text
- Icons: Always present, aligned left with text

#### Form Inputs
```html
<input type="text" 
       class="w-full bg-[#2b2f38] border border-[#3a3f4b] rounded-lg px-4 py-2 text-white focus:border-[#5865F2] focus:outline-none transition-colors duration-200"
       placeholder="Enter value...">
```

#### Settings Sections
- Group related settings in cards
- Use toggle switches for boolean options
- Provide clear labels and helper text in `text-[#b9bbbe]`

### Bot Invite Flow
When bot is not in a guild:
1. **Dashboard Index**: Show server card with yellow border + "Invite Bot First" label
2. **Direct URL Access**: Middleware redirects to Discord OAuth with `guild_id` pre-filled
3. **API Requests**: Return `503` JSON error for graceful client-side handling

### Performance Considerations
- Use TailwindCSS JIT mode (via CDN)
- Minimize custom CSS - prefer utility classes
- Lazy load images with `loading="lazy"`
- Use CSS transforms over position changes for animations
- Keep DOM nesting shallow for better render performance
