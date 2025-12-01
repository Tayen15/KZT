/**
 * Save CTA Component - Change Detection and Form Submission
 * 
 * Usage: Include after form with id="saveCtaAlert"
 * <script src="/js/components/save-cta.js"></script>
 */

(function() {
    const form = document.querySelector('form');
    const saveCta = document.getElementById('saveCtaAlert');
    const resetBtn = document.getElementById('resetBtn');
    const saveBtn = document.getElementById('saveBtn');

    if (!form || !saveCta) {
        console.warn('Save CTA: Form or saveCta element not found');
        return;
    }

    // Store initial form state
    let initialFormState = new FormData(form);

    /**
     * Check if form has unsaved changes
     */
    function formChanged() {
        const currentFormData = new FormData(form);
        
        // Compare all form fields
        for (let [key, value] of initialFormState.entries()) {
            if (currentFormData.get(key) !== value) {
                return true;
            }
        }

        // Check if new fields added
        for (let [key] of currentFormData.entries()) {
            if (!initialFormState.has(key)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Show/hide Save CTA based on form changes
     */
    function updateSaveCta() {
        if (formChanged()) {
            saveCta.classList.remove('opacity-0', 'pointer-events-none');
        } else {
            saveCta.classList.add('opacity-0', 'pointer-events-none');
        }
    }

    // Attach change detection to form
    form.addEventListener('input', updateSaveCta);
    form.addEventListener('change', updateSaveCta);

    // Reset button - restore initial form state
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            form.reset();
            
            // Re-populate form with initial values
            for (let [key, value] of initialFormState.entries()) {
                const input = form.elements[key];
                if (input) {
                    if (input.type === 'checkbox') {
                        input.checked = value === 'true';
                    } else {
                        input.value = value;
                    }
                }
            }

            updateSaveCta();

            // Trigger custom event for preview updates
            form.dispatchEvent(new Event('formReset'));
        });
    }

    // Save button - submit form via AJAX
    if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const urlParams = new URLSearchParams();

            // Convert FormData to URLSearchParams
            for (let [key, value] of formData.entries()) {
                urlParams.append(key, value);
            }

            // Disable button during save
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            fetch(form.action, {
                method: 'POST',
                body: urlParams,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Success feedback
                    saveCta.classList.remove('bg-[#2b2f38]');
                    saveCta.classList.add('bg-[#57F287]');
                    saveBtn.textContent = '✓ Saved!';

                    // Update initial form state
                    initialFormState = new FormData(form);

                    // Reset after 2 seconds
                    setTimeout(() => {
                        saveCta.classList.remove('bg-[#57F287]');
                        saveCta.classList.add('bg-[#2b2f38]');
                        saveCta.classList.add('opacity-0', 'pointer-events-none');
                        saveBtn.textContent = 'Save Settings';
                        saveBtn.disabled = false;
                    }, 2000);
                } else {
                    // Error feedback
                    saveCta.classList.remove('bg-[#2b2f38]');
                    saveCta.classList.add('bg-[#ED4245]');
                    saveBtn.textContent = '✗ Error';

                    // Show error message
                    const errorMsg = data.message || 'Failed to save settings';
                    alert(errorMsg);

                    // Reset after 2 seconds
                    setTimeout(() => {
                        saveCta.classList.remove('bg-[#ED4245]');
                        saveCta.classList.add('bg-[#2b2f38]');
                        saveBtn.textContent = 'Save Settings';
                        saveBtn.disabled = false;
                    }, 2000);
                }
            })
            .catch(error => {
                console.error('Save CTA: Submit error', error);
                saveCta.classList.remove('bg-[#2b2f38]');
                saveCta.classList.add('bg-[#ED4245]');
                saveBtn.textContent = '✗ Error';

                setTimeout(() => {
                    saveCta.classList.remove('bg-[#ED4245]');
                    saveCta.classList.add('bg-[#2b2f38]');
                    saveBtn.textContent = 'Save Settings';
                    saveBtn.disabled = false;
                }, 2000);
            });
        });
    }

    // Warn before leaving with unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (formChanged()) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    });
})();
