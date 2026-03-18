// North Crescent Facility Solutions - Main JavaScript

/**
 * Loads an HTML template from a same-origin file and injects it into a target element.
 * Templates are fetched from the same server (same-origin), so only trusted content
 * is inserted. Do not point templatePath at untrusted or user-controlled URLs.
 * @param {string} templatePath - Same-origin path to the HTML template file
 * @param {string} targetSelector - CSS selector for the target element
 */
async function loadTemplate(templatePath, targetSelector) {
    try {
        const url = new URL(templatePath, window.location.href);
        if (url.origin !== window.location.origin) {
            throw new Error(`Refusing to load template from cross-origin URL: ${templatePath}`);
        }
        const response = await fetch(url.href);
        if (!response.ok) {
            throw new Error(`Failed to load template: ${templatePath}`);
        }
        const html = await response.text();
        const target = document.querySelector(targetSelector);
        if (target) {
            target.innerHTML = html;
        }
    } catch (error) {
        console.error(error);
    }
}

/**
 * Initializes the page by loading all reusable template components.
 */
async function init() {
    await Promise.all([
        loadTemplate('../templates/header.html', '#header-placeholder'),
        loadTemplate('../templates/navigation.html', '#nav-placeholder'),
        loadTemplate('../templates/form.html', '#form-placeholder'),
        loadTemplate('../templates/footer.html', '#footer-placeholder'),
    ]);
}

document.addEventListener('DOMContentLoaded', init);
