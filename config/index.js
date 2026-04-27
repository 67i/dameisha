/**
 * QX Travel Configuration File
 * Centralized configuration for API endpoints, CDN URLs, and environment settings
 */

function detectEnvironment() {
    var host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.indexOf('192.168.') === 0) {
        return 'development';
    }
    return 'production';
}

var CONFIG = {
    environment: detectEnvironment(),

    cdn: {
        tailwind: 'https://cdn.tailwindcss.com?plugins=forms,container-queries',
        googleFonts: 'https://fonts.googleapis.com/css2',
        materialSymbols: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
    },

    fonts: {
        notoSerif: 'Noto+Serif:ital,wght@0,100..900;1,100..900',
        manrope: 'Manrope:wght@200..800',
        workSans: 'Work+Sans:wght@100..900'
    },

    api: {
        baseUrl: window.__QX_API_BASE_URL__ || '',
        timeout: 30000,
        googleMapsKey: window.__GOOGLE_MAPS_KEY__ || '',
        useEmbedApi: false
    },

    images: {
        basePath: './assets/'
    }
};

function getFontUrl(fontName) {
    return CONFIG.cdn.googleFonts + '?family=' + CONFIG.fonts[fontName] + '&display=swap';
}

function getImagePath(filename) {
    return CONFIG.images.basePath + filename;
}

function setEnvironment(env) {
    CONFIG.environment = env;
}

function getEnvironment() {
    return CONFIG.environment;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG: CONFIG, getFontUrl: getFontUrl, getImagePath: getImagePath, setEnvironment: setEnvironment, getEnvironment: getEnvironment };
}
