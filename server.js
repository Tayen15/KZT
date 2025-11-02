require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('./middleware/passport');
const MySQLStore = require('express-mysql-session')(session);
const mysql = require('mysql2/promise');

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
    console.warn('⚠️  MySQL session store failed, using memory store for development');
    console.warn('   Please setup MySQL properly for production. See MYSQL_SETUP.md');
    sessionStore = undefined; // Use default memory store
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    store: sessionStore, // Will be undefined (memory store) if MySQL fails
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax', // Penting untuk OAuth
        domain: process.env.NODE_ENV === 'production' ? '.oktaa.my.id' : undefined
    },
    proxy: true
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
