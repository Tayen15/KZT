const prisma = require('../utils/database');

/**
 * Check if a command is enabled globally
 * @param {string} commandName - Name of the command
 * @returns {Promise<{enabled: boolean, reason: string|null}>}
 */
async function isCommandEnabled(commandName) {
    try {
        const toggle = await prisma.commandToggle.findUnique({
            where: { commandName }
        });

        if (!toggle) {
            // If no toggle exists, command is enabled by default
            return { enabled: true, reason: null };
        }

        return {
            enabled: toggle.enabled,
            reason: toggle.reason
        };
    } catch (error) {
        console.error('[CommandToggle] Error checking command status:', error);
        // On error, allow command to execute
        return { enabled: true, reason: null };
    }
}

/**
 * Middleware to check if command is enabled before execution
 * Use this in interactionCreate event
 */
async function checkCommandEnabled(interaction) {
    if (!interaction.isChatInputCommand()) return true;

    const commandName = interaction.commandName;
    const status = await isCommandEnabled(commandName);

    if (!status.enabled) {
        const reason = status.reason || 'This command is currently disabled.';
        await interaction.reply({
            content: `⛔ **Command Disabled**\n${reason}`,
            ephemeral: true
        });
        return false;
    }

    return true;
}

/**
 * Toggle a command on/off
 * @param {string} commandName - Command name
 * @param {boolean} enabled - Enable or disable
 * @param {string} category - Command category
 * @param {string} reason - Reason for disabling (optional)
 */
async function toggleCommand(commandName, enabled, category, reason = null) {
    try {
        await prisma.commandToggle.upsert({
            where: { commandName },
            update: {
                enabled,
                reason: enabled ? null : reason
            },
            create: {
                commandName,
                enabled,
                category,
                reason: enabled ? null : reason
            }
        });

        console.log(`[CommandToggle] ${commandName} ${enabled ? 'enabled' : 'disabled'}`);
        return true;
    } catch (error) {
        console.error('[CommandToggle] Error toggling command:', error);
        return false;
    }
}

/**
 * Get all command toggles
 */
async function getAllCommandToggles() {
    try {
        return await prisma.commandToggle.findMany({
            orderBy: { category: 'asc' }
        });
    } catch (error) {
        console.error('[CommandToggle] Error getting toggles:', error);
        return [];
    }
}

/**
 * Initialize command toggles for all commands
 * @param {Collection} commands - Discord.js commands collection
 */
async function initializeCommandToggles(commands) {
    try {
        for (const [name, command] of commands) {
            const existing = await prisma.commandToggle.findUnique({
                where: { commandName: name }
            });

            if (!existing) {
                await prisma.commandToggle.create({
                    data: {
                        commandName: name,
                        enabled: true,
                        category: command.category || 'other'
                    }
                });
            }
        }

        console.log(`[CommandToggle] Initialized toggles for ${commands.size} commands`);
    } catch (error) {
        console.error('[CommandToggle] Error initializing toggles:', error);
    }
}

module.exports = {
    isCommandEnabled,
    checkCommandEnabled,
    toggleCommand,
    getAllCommandToggles,
    initializeCommandToggles
};
