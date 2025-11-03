require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('./middleware/passport');
const MySQLStore = require('express-mysql-session')(session);

console.log('🌐 Starting ByteBot Web Server (Web Only Mode)...');

const app = express();

// MySQL connection for session store
const sessionStoreOptions = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kzt_bot',
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
};

// Try to create MySQL session store, fallback to memory store if fails
let sessionStore;
try {
    sessionStore = new MySQLStore(sessionStoreOptions);
    console.log('✅ Using MySQL session store');
} catch (error) {
    console.warn('⚠️  MySQL session store failed, using memory store');
    console.warn('   Please setup MySQL properly for production. See MYSQL_SETUP.md');
    sessionStore = undefined;
}

// Trust proxy (important for production with Nginx/Cloudflare)
app.set('trust proxy', true);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        domain: process.env.NODE_ENV === 'production' ? '.oktaa.my.id' : undefined
    },
    proxy: true
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Make user available in all views
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.isAuthenticated = req.isAuthenticated();
    next();
});

// Discord client reference (will try to connect to bot process)
let discordClient = null;

// Try to get Discord client from bot process
try {
    console.log('🔄 Attempting to connect to bot client...');
    const client = require('./index');
    
    // Wait a bit for bot to initialize
    setTimeout(() => {
        if (client && client.isReady && client.isReady()) {
            discordClient = client;
            app.set('discordClient', client);
            console.log('✅ Connected to Discord bot client');
        } else {
            console.warn('⚠️  Bot client not ready yet');
            console.warn('   Some features may be limited until bot connects');
            
            // Keep checking until bot is ready
            const checkInterval = setInterval(() => {
                if (client && client.isReady && client.isReady()) {
                    discordClient = client;
                    app.set('discordClient', client);
                    console.log('✅ Connected to Discord bot client');
                    clearInterval(checkInterval);
                }
            }, 5000); // Check every 5 seconds
            
            // Stop checking after 2 minutes
            setTimeout(() => clearInterval(checkInterval), 120000);
        }
    }, 3000);
} catch (error) {
    console.warn('⚠️  Could not connect to bot client:', error.message);
    console.warn('   Running in Web-Only mode with limited functionality');
    console.warn('   Features like announcements and live data will not work');
}

// Middleware to inject Discord client into requests
app.use((req, res, next) => {
    req.discordClient = discordClient || app.get('discordClient');
    req.botAvailable = !!(req.discordClient && req.discordClient.isReady && req.discordClient.isReady());
    next();
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        botConnected: !!(discordClient && discordClient.isReady && discordClient.isReady()),
        timestamp: new Date().toISOString()
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
    console.error('❌ Server Error:', err.stack);
    res.status(500).render('error', {
        title: '500 - Server Error',
        message: 'An unexpected error occurred.',
        isAuthenticated: typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false,
        user: req.user || null
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Web server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('⚠️  SIGINT received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('⚠️  SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

// Global error handlers
process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
});

module.exports = app;
