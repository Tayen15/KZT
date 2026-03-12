/**
 * Feature Toggle Middleware
 * Check if a dashboard feature is enabled before allowing access
 */

const prisma = require('../utils/database');

/**
 * Middleware to check if a feature is enabled
 * @param {String} featureKey - Feature key to check
 */
function checkFeature(featureKey) {
    return async (req, res, next) => {
        try {
            // Get feature toggle from database
            const feature = await prisma.featureToggle.findUnique({
                where: { featureKey }
            });

            // If feature not found, assume enabled (backward compatibility)
            if (!feature) {
                return next();
            }

            // If feature disabled, show error page
            if (!feature.enabled) {
                return res.status(503).render('error', {
                    user: req.user,
                    guilds: req.adminGuilds || [],
                    error: {
                        title: 'Feature Unavailable',
                        message: `${feature.name} is currently disabled by administrators.`,
                        code: 503,
                        description: feature.description
                    }
                });
            }

            // Feature enabled, continue
            next();
        } catch (error) {
            console.error(`❌ Error checking feature ${featureKey}:`, error);
            // On error, allow access (fail-safe)
            next();
        }
    };
}

/**
 * Check if feature is enabled (programmatic check)
 * @param {String} featureKey - Feature key to check
 * @returns {Promise<Boolean>} - True if enabled or not found
 */
async function isFeatureEnabled(featureKey) {
    try {
        const feature = await prisma.featureToggle.findUnique({
            where: { featureKey }
        });

        // If not found, assume enabled
        return feature ? feature.enabled : true;
    } catch (error) {
        console.error(`❌ Error checking feature ${featureKey}:`, error);
        return true; // Fail-safe: allow access
    }
}

module.exports = {
    checkFeature,
    isFeatureEnabled
};
