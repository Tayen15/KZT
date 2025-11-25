require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('./middleware/passport');
const { PrismaClient } = require('@prisma/client');
const MongoStore = require('connect-mongo');

const app = express();
const prisma = new PrismaClient();

// NOTE: Do not force HTTPS here to avoid redirect loops behind Cloudflare/Flexible SSL.
// TLS termination is handled by the proxy/CDN; cookies use `secure` in production.

// MongoDB session store (connect-mongo)
let sessionStore;
try {
    if (process.env.MONGO_URI) {
        // Use a distinct collection name to avoid conflicts with old Prisma session schema
        sessionStore = MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            collectionName: 'web_sessions',
            ttl: 30 * 24 * 60 * 60, // 30 days in seconds
            touchAfter: 24 * 3600 // reduce write frequency
        });
        console.log('✅ Using MongoDB session store');
    } else {
        console.warn('⚠️  MONGO_URI not set, falling back to memory session store');
    }
} catch (error) {
    console.warn('⚠️  Mongo session store init failed, using memory store');
    console.warn('   Error:', error.message);
    sessionStore = undefined; // fallback
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    store: sessionStore, // Undefined => memory store (dev only)
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        domain: process.env.NODE_ENV === 'production' ? undefined : undefined // Let Heroku handle domain
    },
    proxy: process.env.NODE_ENV === 'production' // Trust proxy in production
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// View engine setup
app.set('view engine', 'ejs');
app.set('trust proxy', true);
app.set('views', path.join(__dirname, 'views'));

// Make user available in all views
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.isAuthenticated = req.isAuthenticated();
    next();
});

// Store Discord client reference (will be set after bot is ready)
let discordClient = null;

app.setDiscordClient = (client) => {
    discordClient = client;
    app.set('discordClient', client); // Store in app settings
    console.log('✅ Discord client connected to web server');
};

app.getDiscordClient = () => discordClient;

// Middleware to inject Discord client into requests
app.use((req, res, next) => {
    req.discordClient = discordClient;
    next();
});

// OAuth environment debug (remove after resolution)
app.get('/auth/debug-env', (req, res) => {
    res.json({
        host: req.headers.host,
        forwardedProto: req.headers['x-forwarded-proto'] || null,
        nodeEnv: process.env.NODE_ENV,
        callbackEnv: process.env.DISCORD_CALLBACK_URL,
        clientId: process.env.DISCORD_CLIENT_ID,
        cookieSecure: process.env.NODE_ENV === 'production',
        timestamp: new Date().toISOString()
    });
});

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const apiRoutes = require('./routes/api');

app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/api', apiRoutes);

// Home page
app.get('/', (req, res) => {
    res.render('index', {
        title: 'Home'
    });
});

// Commands page
app.get('/commands', (req, res) => {
    res.render('commands', {
        title: 'Commands'
    });
});

// Error handling
app.use((req, res) => {
    res.status(404).render('error', {
        title: '404 - Not Found',
        message: 'The page you are looking for does not exist.',
        isAuthenticated: typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false,
        user: req.user || null
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        title: '500 - Server Error',
        message: 'An unexpected error occurred.',
        isAuthenticated: typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false,
        user: req.user || null
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

module.exports = app;
