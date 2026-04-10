 /**
 * QX Travel Configuration File
 * Centralized configuration for API endpoints, CDN URLs, and environment settings
 */

const CONFIG = {
    environment: 'development',

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
        baseUrl: '',
        timeout: 30000
    },

    images: {
        basePath: './assets/images/'
    }
};

function getFontUrl(fontName) {
    return `${CONFIG.cdn.googleFonts}?family=${CONFIG.fonts[fontName]}&display=swap`;
}

function getImagePath(filename) {
    return `${CONFIG.images.basePath}${filename}`;
}

function setEnvironment(env) {
    CONFIG.environment = env;
}

function getEnvironment() {
    return CONFIG.environment;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, getFontUrl, getImagePath, setEnvironment, getEnvironment };
}
