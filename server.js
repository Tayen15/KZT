require('dotenv').config();
const express = require('express');
const compression = require('compression');

const app = express();
app.use(compression());

const isDev = process.env.NODE_ENV === 'development';
if (isDev) {
    console.log('🔧 API server running in DEVELOPMENT mode');
} else {
    console.log('🚀 API server running in PRODUCTION mode');
}

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Store Discord client reference
let discordClient = null;

app.setDiscordClient = (client) => {
    discordClient = client;
    app.set('discordClient', client);
    console.log('✅ Discord client connected to API server');
};

app.getDiscordClient = () => discordClient;

// Middleware to inject Discord client into requests
app.use((req, res, next) => {
    req.discordClient = discordClient;
    next();
});

// Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Error handling
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'An unexpected error occurred.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Bot API server running on port ${PORT}`));

module.exports = app;
