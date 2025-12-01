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

Use concise single-line descriptions for simple changes, combine multiple related edits into one descriptive sentence (e.g., "Update Prisma schema for MongoDB compatibility, remove unsupported cascade deletes, and add @map annotations for \_id fields"), avoid bullet points or multi-paragraph explanations, prefix with action verbs (Add, Update, Fix, Remove, Refactor), keep messages under 100 characters when possible.

### Version Management & Changelog

**Semantic Versioning** (`package.json` version field follows `MAJOR.MINOR.PATCH` format):
- **MAJOR** (x.0.0): Breaking changes, major architecture changes, API incompatibilities
- **MINOR** (0.x.0): New features, enhancements, non-breaking additions
- **PATCH** (0.0.x): Bug fixes, small improvements, documentation updates

**When to Bump Version:**
- **Major Update (1.0.0 → 2.0.0)**: 
  - Database schema breaking changes (require data migration)
  - Discord.js version upgrade (v13 → v14)
  - Complete UI/UX redesign
  - Removal of deprecated features
  - Change authentication flow (OAuth changes)
  
- **Minor Update (1.0.0 → 1.1.0)**:
  - New dashboard features (welcome message, prayer times, etc.)
  - New bot commands or handlers
  - New integrations (music, monitoring)
  - UI enhancements (new components, galleries)
  - Database model additions (no breaking changes)
  
- **Patch Update (1.0.0 → 1.0.1)**:
  - Bug fixes (canvas rendering, EJS syntax)
  - Performance improvements
  - Security patches
  - Documentation updates
  - Dependency minor updates
  - CSS/styling tweaks

**Changelog Format** (document in commit messages or CHANGELOG.md):
```markdown
## [1.2.0] - 2025-11-28
### Added
- Welcome message feature with canvas image generator
- Real-time preview using logged-in user data
- Nature anime background gallery (landscape, sakura, forest)
- Placeholder system for dynamic content ([user.mention], [server.name])

### Fixed
- Canvas text rendering with async avatar loading
- EJS syntax errors causing page unresponsiveness
- Overlay opacity slider real-time updates

### Changed
- Simplified [user.mention] placeholder to @username styling
- Updated TailwindCSS color picker patterns
```

**Version Update Workflow:**
1. Determine change type (major/minor/patch)
2. Update `package.json` version field
3. Document changes in commit message or CHANGELOG.md
4. Tag git commit: `git tag v1.2.0`
5. Push with tags: `git push --tags`
6. Deploy to Heroku (triggers auto-build)

**Example Version History:**
- `v1.0.0` - Initial release with bot commands + basic dashboard
- `v1.1.0` - Added prayer times feature + guild settings
- `v1.2.0` - Welcome message feature with canvas generator
- `v1.2.1` - Fixed canvas rendering bugs
- `v2.0.0` - Migrated PostgreSQL → MongoDB (breaking)

**Deprecation Notice:**
When removing features, mark as deprecated for 1 minor version before removal in next major version. Document in commit message and console warnings.

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
<div
  class="bg-[#2b2f38] border border-[#3a3f4b] rounded-xl p-6 hover:border-[#5865F2] transition-all duration-300"
>
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
<div
  class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-2 py-0.5 flex items-center gap-1.5"
>
  <svg class="w-3.5 h-3.5 text-yellow-500">...</svg>
  <span class="text-yellow-500 text-xs font-semibold">Owner</span>
</div>

<!-- Admin Badge -->
<div
  class="bg-blue-500/10 border border-blue-500/30 rounded-lg px-2 py-0.5 flex items-center gap-1.5"
>
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
<a
  href="/dashboard/guild/<%= guild.guildId %>"
  class="group bg-[#2b2f38] border-2 border-[#3a3f4b] rounded-xl p-6 hover:border-[#5865F2] transition-all duration-300 relative overflow-hidden"
>
  <!-- Server Icon & Info -->
  <div class="flex items-start space-x-4 mb-4">
    <img
      src="..."
      class="w-16 h-16 rounded-xl border-2 border-[#3a3f4b] group-hover:border-[#5865F2] transition-all duration-300"
    />
    <div class="flex-1 min-w-0">
      <h3
        class="text-lg font-bold mb-1 truncate group-hover:text-[#5865F2] transition-colors duration-200"
      >
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
  <div
    class="pt-4 border-t border-[#3a3f4b] flex items-center justify-between text-sm"
  >
    <span
      class="text-[#b9bbbe] group-hover:text-[#5865F2] transition-colors duration-200 font-medium"
    >
      Configure Settings
    </span>
    <svg
      class="w-5 h-5 text-[#5865F2] transform group-hover:translate-x-1 transition-transform duration-200"
    >
      ...
    </svg>
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
<input
  type="text"
  class="w-full bg-[#2b2f38] border border-[#3a3f4b] rounded-lg px-4 py-2 text-white focus:border-[#5865F2] focus:outline-none transition-colors duration-200"
  placeholder="Enter value..."
/>
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

## Welcome Message Feature Guidelines

### Database Schema (WelcomeMessage Model)

Located in `prisma/schema.prisma`, the WelcomeMessage model handles all welcome message configurations:

```prisma
model WelcomeMessage {
  id                String   @id @default(uuid()) @map("_id")
  guildId           String   @unique
  enabled           Boolean  @default(false)
  channelId         String?
  dmEnabled         Boolean  @default(false)
  message           String?
  embedTitle        String?
  embedDescription  String?
  embedColor        String?
  imageUrl          String?
  useCustomImage    Boolean  @default(false)
  // Custom image generator settings
  layout            String?  // 'simple', 'left', 'right', 'text'
  avatarShape       String?  // 'circle', 'square'
  font              String?  // 'gg sans', 'Arial', etc.
  bgColor           String?
  bgImageUrl        String?
  circleColor       String?
  titleColor        String?
  usernameColor     String?
  messageColor      String?
  overlayColor      String?
  overlayOpacity    Int?     @default(50)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### Route Structure

**Dashboard Route**: `/dashboard/guild/:guildId/welcome` (GET)

- Renders `views/dashboard/welcome.ejs`
- Passes data: `guild`, `welcome`, `channels`, `roles`, `user` (from session)
- Middleware: `ensureAuthenticated`, `ensureBotInGuild`, `ensureGuildAdmin`

**API Route**: `/api/guild/:guildId/welcome` (POST)

- Handles form submission with all welcome settings
- Validates channelId exists in guild
- Updates/creates WelcomeMessage record via Prisma
- Returns JSON success/error response

### Placeholder System

**Available Placeholders** (case-sensitive):

- `[user]` → Username only (e.g., "JohnDoe")
- `[user.mention]` → @username styled with Discord blue (#5865F2)
- `[user.tag]` → Username#discriminator or username (Discord new format)
- `[user.id]` → Discord user ID (18-digit snowflake)
- `[server.name]` → Guild name
- `[server.id]` → Guild ID
- `[server.memberCount]` → Total member count
- `[channel:<channelId>]` → #channel-name mention
- `[role:<roleId>]` → @role-name mention

**Parsing Implementation**:

```javascript
// In views/dashboard/welcome.ejs
function parseDiscordMarkdown(text) {
  // User placeholders
  text = text.replace(/\[user\]/g, userData.username);
  text = text.replace(/\[user\.mention\]/g, `@${userData.username}`);
  text = text.replace(
    /\[user\.tag\]/g,
    userData.discriminator !== "0"
      ? `${userData.username}#${userData.discriminator}`
      : userData.username
  );
  text = text.replace(/\[user\.id\]/g, userData.discordId);

  // Server placeholders
  text = text.replace(/\[server\.name\]/g, guildData.name || "Server");
  text = text.replace(
    /\[server\.memberCount\]/g,
    (guildData.memberCount || 0).toLocaleString()
  );

  // Style @mentions with Discord blue
  text = text.replace(
    /@(\w+)/g,
    '<span style="color: #5865F2; font-weight: 600;">@$1</span>'
  );

  return text;
}
```

### Canvas Preview System

**Canvas Specifications**:

- Dimensions: `1024x500` pixels (Discord recommended size)
- Context: 2D with `crossOrigin: 'anonymous'` for avatar images
- Real-time preview using logged-in user data from session

**User Data Source**:

```javascript
const userData = {
  username: "<%= user.username %>",
  discriminator: "<%= user.discriminator %>",
  avatar: "<%= user.avatar %>",
  discordId: "<%= user.id %>",
};
```

**Async Image Loading Pattern**:

```javascript
function drawOverlayAndContent() {
  // ... setup code ...

  const avatarImg = new Image();
  avatarImg.crossOrigin = "anonymous";
  avatarImg.onload = () => {
    ctx.drawImage(avatarImg, x, y, size, size);
    ctx.restore();
    // CRITICAL: Draw text AFTER avatar loads
    drawText();
  };
  avatarImg.onerror = () => {
    ctx.restore();
    // CRITICAL: Still draw text even if avatar fails
    drawText();
  };
  avatarImg.src = userData.avatar;
}
```

**Layout Types**:

1. **Simple (Center)**: Avatar centered top, text below centered

   - Avatar: `x: width/2, y: 130`, radius: 90px
   - Text: `y: 300` (title), `y: 355` (username), `y: 405` (message)

2. **Left**: Avatar left side, text to the right

   - Avatar: `x: 100, y: height/2`, radius: 100px
   - Text: `x: 200, y: height/2 - 30/+10/+45`

3. **Right**: Avatar right side, text to the left

   - Avatar: `x: width-100, y: height/2`, radius: 100px
   - Text: `x: width-200, y: height/2 - 30/+10/+45`

4. **Text Only**: No avatar, text centered
   - Text: `x: width/2, y: height/2 - 30/+10/+45`

**Avatar Shapes**:

- **Circle**: `ctx.arc(x, y, radius, 0, Math.PI * 2)`
- **Square**: `ctx.rect(x - radius, y - radius, radius * 2, radius * 2)`

**Font Mapping**:

```javascript
const fontMap = {
  "gg sans":
    "'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  Arial: "Arial, sans-serif",
  Helvetica: "Helvetica, sans-serif",
  Impact: "Impact, sans-serif",
  Georgia: "Georgia, serif",
  "Courier New": "'Courier New', monospace",
  "Comic Sans MS": "'Comic Sans MS', cursive",
  Verdana: "Verdana, sans-serif",
  "Times New Roman": "'Times New Roman', serif",
};
```

### Background Gallery System

**Flyout Pattern**: Click button → show gallery → select background → update preview

```javascript
document.querySelectorAll(".bg-gallery-item").forEach((item) => {
  item.addEventListener("click", function () {
    const bgType = this.dataset.bgType; // 'color', 'image', 'custom'
    const bgValue = this.dataset.bgValue; // hex color or image URL
    const bgLabel = this.dataset.bgLabel;

    if (bgType === "color") {
      bgColorInput.value = bgValue;
      bgImageUrlHidden.value = "";
    } else if (bgType === "image") {
      bgImageUrlHidden.value = bgValue;
      bgColorInput.value = "#23272A";
    } else if (bgType === "custom") {
      customBgUrlSection.classList.remove("hidden");
    }

    updateCanvasPreview();
  });
});
```

**Preset Backgrounds**:

- **ByteBot Theme**: Code editor, programming, digital tech (Unsplash)
- **Solid Colors**: Dark (#23272A), Blurple (#5865F2), Green (#57F287)
- **Nature & Space**: Gradient, abstract, space, earth (Unsplash)
- **Custom URL**: User-provided image URL with validation

### Color Preset System

**Preset Implementation**:

```html
<div class="flex gap-2 flex-wrap">
  <div
    class="color-preset"
    style="background: #FFFFFF"
    data-color="#FFFFFF"
    data-target="circleColor"
  ></div>
  <!-- More presets -->
</div>
```

**JavaScript Handler**:

```javascript
document.querySelectorAll(".color-preset").forEach((preset) => {
  preset.addEventListener("click", function () {
    const color = this.dataset.color;
    const target = this.dataset.target; // 'circleColor', 'titleColor', etc.
    const picker = document.getElementById(`${target}Picker`);
    if (picker) {
      picker.value = color;
      updateCanvasPreview();
    }
  });
});
```

**Predefined Palette**:

- White: `#FFFFFF`
- Discord Blurple: `#5865F2`
- Success Green: `#57F287`
- Warning Yellow: `#FEE75C`
- Error Red: `#ED4245`
- Pink: `#EB459E`
- Orange: `#F26522`
- Purple: `#9B59B6`
- Blue: `#3498DB`
- Teal: `#1ABC9C`
- Muted Gray: `#B9BBBE` (default message color)

### Overlay Opacity System

**HTML Structure**:

```html
<input
  type="range"
  name="overlayOpacity"
  id="overlayOpacityInput"
  value="<%= welcome.overlayOpacity || 50 %>"
  min="0"
  max="100"
  class="w-full h-2 bg-[#23272f] rounded-lg appearance-none cursor-pointer"
  style="accent-color: #5865F2;"
/>
<span class="text-[#5865F2] font-bold" id="overlayOpacityValue">50%</span>
```

**Real-time Update**:

```javascript
const overlayOpacityInput = document.getElementById("overlayOpacityInput");
const overlayOpacityValue = document.getElementById("overlayOpacityValue");

function updateOverlayDisplayValues() {
  if (overlayOpacityValue && overlayOpacityInput) {
    overlayOpacityValue.textContent = overlayOpacityInput.value + "%";
  }
}

overlayOpacityInput.addEventListener("input", updateOverlayDisplayValues);
```

### Toggle Switch Pattern

**Standard Toggle HTML**:

```html
<label class="switch-toggle relative inline-block w-14 h-7">
  <input type="checkbox" name="enabled" value="true" <%= welcome.enabled ?
  'checked' : '' %> class="opacity-0 w-0 h-0">
  <span class="switch-slider"></span>
</label>
```

**Toggle with Content Show/Hide**:

```javascript
const toggle = document.getElementById("useCustomImageToggle");
const content = document.getElementById("customImageConfig");

toggle.addEventListener("change", (e) => {
  if (e.target.checked) {
    content.classList.remove("hidden");
  } else {
    content.classList.add("hidden");
  }
});
```

### Preview Update System

**Multi-input Listener Setup**:

```javascript
function setupCanvasUpdates() {
  const colorInputs = [
    "circleColorPicker",
    "titleColorPicker",
    "usernameColorPicker",
    "messageColorPicker",
    "overlayColorPicker",
    "overlayOpacityInput",
  ];

  colorInputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateCanvasPreview);
  });

  // Layout, shape, font changes
  const layoutSelect = document.getElementById("layoutSelect");
  const avatarShapeSelect = document.getElementById("avatarShapeSelect");
  const fontSelect = document.getElementById("fontSelect");

  if (layoutSelect)
    layoutSelect.addEventListener("change", updateCanvasPreview);
  if (avatarShapeSelect)
    avatarShapeSelect.addEventListener("change", updateCanvasPreview);
  if (fontSelect) fontSelect.addEventListener("change", updateCanvasPreview);
}
```

### Text Preview with Markdown

**HTML Preview Container**:

```html
<div
  id="messagePreview"
  class="bg-[#2b2f38] border border-[#3a3f4b] rounded-lg p-4"
>
  <div class="prose prose-invert max-w-none"></div>
</div>
```

**Preview Update Function**:

```javascript
function updatePreview() {
  const messageInput = document.getElementById("messageInput");
  const embedTitleInput = document.getElementById("embedTitleInput");
  const embedDescInput = document.getElementById("embedDescInput");

  let messageText = messageInput.value || "";
  let embedTitle = embedTitleInput?.value || "";
  let embedDesc = embedDescInput?.value || "";

  // Parse placeholders
  messageText = parseDiscordMarkdown(messageText);
  embedTitle = parseDiscordMarkdown(embedTitle);
  embedDesc = parseDiscordMarkdown(embedDesc);

  // Update preview DOM
  messagePreview.innerHTML = messageText;
  // ... update embed preview ...
}

// Attach to input events
messageInput.addEventListener("input", updatePreview);
embedTitleInput.addEventListener("input", updatePreview);
embedDescInput.addEventListener("input", updatePreview);
```

### Save CTA Alert (Unsaved Changes)

**Floating Alert Pattern**:

```html
<div
  id="saveCtaAlert"
  class="fixed bottom-6 right-6 z-50 bg-[#5865F2] text-white px-3 py-2 rounded-lg shadow-lg opacity-0 pointer-events-none"
>
  <span>Unsaved changes detected</span>
  <button type="button" id="resetBtn">Reset</button>
  <button type="submit" id="saveBtn">Save Settings</button>
</div>
```

**Change Detection**:

```javascript
let originalFormData = new FormData(form);

form.addEventListener("input", () => {
  const currentFormData = new FormData(form);
  const hasChanges = !areFormDataEqual(originalFormData, currentFormData);

  if (hasChanges) {
    saveCtaAlert.classList.remove("opacity-0", "pointer-events-none");
  } else {
    saveCtaAlert.classList.add("opacity-0", "pointer-events-none");
  }
});

resetBtn.addEventListener("click", () => {
  form.reset();
  updatePreview();
});
```

### Common Debugging Patterns

**Canvas Not Showing Text**: Ensure `drawText()` is called inside `avatarImg.onload` AND `avatarImg.onerror` callbacks, not before async image loading completes.

**Placeholder Not Parsing**: Check exact string match (case-sensitive), ensure `parseDiscordMarkdown()` is called before rendering, verify userData object has correct properties from session.

**Preview Not Updating**: Verify event listeners attached after DOM ready, check `updateCanvasPreview()` function called on ALL input changes (colors, layout, fonts, etc.).

**Overlay Opacity Not Displaying**: Ensure `overlayOpacityValue` element exists, event listener on `overlayOpacityInput` calls update function, value formatted with `%` suffix.

**Form Data Not Saving**: Check hidden inputs have correct values (`bgColorInput`, `bgImageUrlHidden`), verify POST route accepts all field names, ensure Prisma schema matches form field names.

### Performance Optimization

- **Canvas Redraws**: Debounce `updateCanvasPreview()` for rapid input changes (50-100ms delay)
- **Image Loading**: Use Discord CDN URLs with `?size=128` parameter for avatar thumbnails
- **Color Picker Updates**: Throttle canvas updates during color picker drag
- **Preview Rendering**: Only update visible preview sections (hide canvas when useCustomImage is false)
- **Form Submission**: Disable save button during API request to prevent duplicate submissions

## Dashboard Feature Development Pattern (Full-Stack Workflow)

### When Adding New Dashboard Features

**CRITICAL**: Every dashboard feature must follow this complete flow - Web → Database → API → Discord Bot. Never implement only web UI without backend integration.

### 1. Database Layer (Prisma Schema)

**Pattern**: Create/update model in `prisma/schema.prisma`
```prisma
model FeatureName {
  id        String   @id @default(uuid()) @map("_id")
  guildId   String   @unique
  enabled   Boolean  @default(false)
  // ... feature-specific fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**After schema changes**:
```bash
npx prisma db push      # Push to MongoDB
npx prisma generate     # Regenerate Prisma client
```

### 2. Dashboard Route (GET - Display Form)

**Pattern**: `routes/dashboard.js` - fetch Discord data + database settings

```javascript
router.get('/guild/:guildId/feature', ensureAuthenticated, ensureBotInGuild, ensureGuildAdmin, async (req, res) => {
    const guild = req.currentGuild;
    const client = req.discordClient;
    
    // Get or create database record
    let settings = await prisma.featureName.findFirst({ where: { guildId: guild.id } });
    if (!settings) {
        settings = await prisma.featureName.create({ data: { guildId: guild.id } });
    }
    
    // Fetch Discord data (channels, roles, etc)
    const discordGuild = client?.guilds?.cache.get(guild.guildId);
    let channels = [];
    if (discordGuild) {
        channels = discordGuild.channels.cache
            .filter(ch => ch.type === 0) // Text channels only
            .map(ch => ({ id: ch.id, name: ch.name, position: ch.position }))
            .sort((a, b) => a.position - b.position);
    }
    
    res.render('dashboard/feature', { guild, settings, channels, guilds: adminGuilds, user: req.user });
});
```

### 3. API Route (POST - Save Settings)

**Pattern**: `routes/api.js` - validate, save to DB, return JSON

```javascript
router.post('/guild/:guildId/feature', ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
    const { guildId } = req.params;
    const { enabled, channelId, ...otherFields } = req.body;
    
    try {
        // Validate Discord resources exist
        const client = req.discordClient;
        const discordGuild = client?.guilds?.cache.get(guildId);
        if (channelId && !discordGuild?.channels?.cache.has(channelId)) {
            return res.status(400).json({ success: false, message: 'Channel not found' });
        }
        
        // Update database
        await prisma.featureName.upsert({
            where: { guildId },
            update: { enabled: enabled === 'true', channelId, ...otherFields },
            create: { guildId, enabled: enabled === 'true', channelId, ...otherFields }
        });
        
        res.json({ success: true, message: 'Settings saved successfully' });
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
```

### 4. Discord Bot Integration (Handler)

**Pattern**: Create handler in `handlers/featureName.js` - listen to DB, execute Discord actions

```javascript
const { prisma } = require('../utils/database');

async function setupFeature(client) {
    const allSettings = await prisma.featureName.findMany({ where: { enabled: true } });
    
    allSettings.forEach(settings => {
        const guild = client.guilds.cache.get(settings.guildId);
        if (!guild) return;
        
        const channel = guild.channels.cache.get(settings.channelId);
        if (!channel) return;
        
        // Execute Discord bot logic
        // e.g., send message, create event listener, etc.
    });
}

module.exports = { setupFeature };
```

**Load handler in `bot.js` or `index.js`**:
```javascript
const { setupFeature } = require('./handlers/featureName');
client.once('ready', () => {
    setupFeature(client);
});
```

### 5. EJS View (Consistent UI Pattern)

**Layout Structure** (3-column grid):
```html
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Left: Form (col-span-2) -->
    <div class="lg:col-span-2">
        <form action="/api/guild/<%= guild.guildId %>/feature" method="POST">
            <!-- Form cards here -->
        </form>
    </div>
    
    <!-- Right: Info Panel (col-span-1) -->
    <div class="lg:col-span-1">
        <div class="sticky top-24">
            <!-- Status, preview, or info -->
        </div>
    </div>
</div>
```

**Form Card Pattern**:
```html
<div class="bg-[#2b2f38] border border-[#3a3f4b] rounded-xl p-6 hover:border-[#5865F2]/50 transition-all duration-300">
    <div class="flex items-center gap-3 mb-4">
        <div class="p-2 bg-[#5865F2]/10 rounded-lg">
            <svg class="w-5 h-5 text-[#5865F2]">...</svg>
        </div>
        <div>
            <h2 class="text-lg font-semibold">Section Title</h2>
            <p class="text-[#b9bbbe] text-sm">Description</p>
        </div>
    </div>
    <!-- Form inputs -->
</div>
```

**Channel Dropdown Pattern** (ALWAYS use dropdown, NEVER manual input):
```html
<select id="channelSelect" name="channelId" required class="w-full bg-[#23272f] border border-[#3a3f4b] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#5865F2] focus:ring-2 focus:ring-[#5865F2]/20 transition-all">
    <option value="">Loading channels...</option>
</select>

<script>
const channelsData = JSON.parse('<%- JSON.stringify(channels) %>');
function loadChannels() {
    const select = document.getElementById('channelSelect');
    select.innerHTML = '<option value="">Select a text channel...</option>';
    channelsData.forEach(ch => {
        const opt = document.createElement('option');
        opt.value = ch.id;
        opt.textContent = `# ${ch.name}`;
        if ('<%= settings.channelId || "" %>' === ch.id) opt.selected = true;
        select.appendChild(opt);
    });
}
document.addEventListener('DOMContentLoaded', loadChannels);
</script>
```

**Save CTA Pattern** (Floating, NEVER static button):
```html
<!-- Inside form, after all cards -->
<div id="saveCtaAlert" class="fixed bottom-6 right-6 z-50 bg-[#2b2f38] text-white px-3 py-2 rounded-lg shadow-lg border border-[#3a3f4b] flex items-center gap-3 text-sm font-semibold transition-all duration-300 opacity-0 pointer-events-none">
    <span>Unsaved changes detected</span>
    <div class="flex gap-2">
        <button type="button" id="resetBtn" class="px-2 py-1 hover:underline">Reset</button>
        <button type="submit" id="saveBtn" class="bg-[#23272f] text-[#5865F2] px-3 py-1 rounded-md hover:bg-[#5865F2] hover:text-white transition-colors">Save Settings</button>
    </div>
</div>

<script>
const form = document.querySelector('form');
const saveCta = document.getElementById('saveCtaAlert');
let initialFormState = new FormData(form);

function formChanged() {
    const current = new FormData(form);
    for (let [key, value] of initialFormState.entries()) {
        if (current.get(key) !== value) return true;
    }
    return false;
}

form.addEventListener('input', () => {
    if (formChanged()) {
        saveCta.classList.remove('opacity-0', 'pointer-events-none');
    } else {
        saveCta.classList.add('opacity-0', 'pointer-events-none');
    }
});

saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const urlParams = new URLSearchParams();
    for (let [key, value] of formData.entries()) urlParams.append(key, value);
    
    fetch(form.action, {
        method: 'POST',
        body: urlParams,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).then(res => res.json()).then(data => {
        if (data.success) {
            saveCta.classList.add('bg-[#57F287]');
            saveBtn.textContent = '✓ Saved!';
            setTimeout(() => {
                saveCta.classList.remove('bg-[#57F287]');
                saveCta.classList.add('bg-[#2b2f38]');
                saveBtn.textContent = 'Save Settings';
            }, 2000);
        }
    });
});
</script>
```

### Design Consistency Checklist

✅ **Database**: Model created with `@map("_id")`, proper field types
✅ **GET Route**: Fetches Discord data (channels/roles) + database settings
✅ **POST Route**: Validates Discord resources, saves to DB, returns JSON
✅ **Bot Handler**: Reads DB settings, executes Discord actions
✅ **UI Layout**: 3-column grid (form left, info right)
✅ **Form Cards**: Icon + title + description pattern
✅ **Channel Input**: Dropdown with `JSON.parse()`, never manual input
✅ **Save CTA**: Floating bottom-right, change detection, success/error feedback
✅ **EJS Data**: Pass `channels`, `roles`, `guilds`, `user`, `settings`

### Common Mistakes to Avoid

❌ **Don't**: Create web UI without API endpoint
❌ **Don't**: Create API endpoint without bot handler
❌ **Don't**: Use manual text input for Discord IDs (channels, roles, users)
❌ **Don't**: Use static submit buttons instead of floating Save CTA
❌ **Don't**: Forget to validate Discord resources exist before saving
❌ **Don't**: Forget `JSON.parse()` wrapper for EJS arrays in JavaScript
❌ **Don't**: Create new inconsistent card/button styles

✅ **Do**: Follow complete flow (DB → Route → API → Handler)
✅ **Do**: Use dropdowns for all Discord resource selectors
✅ **Do**: Validate on both frontend and backend
✅ **Do**: Reuse existing card/button patterns
✅ **Do**: Test full flow from web form to Discord bot action


