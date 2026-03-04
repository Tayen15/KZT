/**
 * Feature Toggle Client-Side Handler
 * Shows disabled badge and prevents navigation for disabled features
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check if featureStates is available
    if (typeof featureStates === 'undefined') {
        console.log('⚠️ Feature states not loaded, all features assumed enabled');
        return;
    }

    // Feature card mappings (feature_key => selector)
    const featureCards = {
        prayer_times: 'a[href*="/prayer"]',
        welcome_message: 'a[href*="/welcome"]',
        rules_management: 'a[href*="/rules"]',
        social_alerts: 'a[href*="/social-alert"]',
        server_monitoring: 'a[href*="/monitoring"]'
    };

    // Apply disabled state to each feature card
    Object.entries(featureCards).forEach(([featureKey, selector]) => {
        const card = document.querySelector(selector);
        if (!card) return;

        // Check if feature is disabled (undefined = enabled by default)
        const isEnabled = featureStates[featureKey] !== false;
        
        if (!isEnabled) {
            // Add disabled styling
            card.classList.add('opacity-60', 'cursor-not-allowed');
            card.classList.remove('hover:border-[#5865F2]', 'hover:border-[#FEE75C]', 'hover:border-[#57F287]', 'hover:border-purple-500');
            
            // Prevent navigation
            card.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });

            // Add disabled badge
            const badge = document.createElement('div');
            badge.className = 'absolute top-4 right-4';
            badge.innerHTML = `
                <span class="bg-[#ED4245]/20 text-[#ED4245] text-xs font-semibold px-2.5 py-1 rounded-full border border-[#ED4245]/30">
                    Disabled
                </span>
            `;
            card.style.position = 'relative';
            card.insertBefore(badge, card.firstChild);

            // Remove hover effect from title
            const title = card.querySelector('h3');
            if (title) {
                title.classList.remove('group-hover:text-[#5865F2]', 'group-hover:text-[#FEE75C]', 'group-hover:text-[#57F287]', 'group-hover:text-purple-500');
            }
        }
    });

    console.log('✅ Feature toggle client-side handler initialized');
});
