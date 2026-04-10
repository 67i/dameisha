/**
 * QX Travel - Main JavaScript
 * Core functionality for the QX Travel website
 */

document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initScrollEffects();
    initImageLazyLoading();
    loadUSHotels();
});

/**
 * Initialize navigation functionality
 */
function initNavigation() {
    const nav = document.querySelector('nav');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', function() {
        const currentScrollY = window.scrollY;

        if (currentScrollY > 100) {
            nav.classList.add('shadow-lg');
        } else {
            nav.classList.remove('shadow-lg');
        }

        lastScrollY = currentScrollY;
    });
}

/**
 * Initialize scroll-based animations and effects
 */
function initScrollEffects() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(function(el) {
        observer.observe(el);
    });
}

/**
 * Initialize lazy loading for images
 */
function initImageLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(function(img) {
        imageObserver.observe(img);
    });
}

/**
 * Smooth scroll to element
 * @param {string} elementId - Target element ID
 */
function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

/**
 * Toggle dark mode
 */
function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('darkMode', isDark);
}



/**
 * Load US Hotels from JSON
 */
function loadUSHotels() {
    function tryLoad() {
        if (typeof I18n !== 'undefined' && I18n.translations && Object.keys(I18n.translations).length > 0) {
            fetch('./data/us-hotels.json?t=' + Date.now())
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    renderHotels(data.hotels);
                })
                .catch(function(error) {
                    console.error('Failed to load hotels data:', error);
                });
        } else {
            setTimeout(tryLoad, 50);
        }
    }
    tryLoad();
}

function renderHotels(hotels) {
    var grid = document.getElementById('hotelsGrid');
    if (!grid) return;

    var html = '';
    hotels.forEach(function(hotel) {
        html += '<a href="' + hotel.detailUrl + '" class="hotel-card" style="text-decoration: none; color: inherit;">' +
            '<img src="' + hotel.image + '" alt="" class="hotel-image">' +
            '<div class="hotel-info">' +
            '<div class="hotel-details">' +
            '<h3 class="hotel-name" data-i18n="' + hotel.nameKey + '">' + hotel.name + '</h3>' +
            '<p class="hotel-location" data-i18n="' + hotel.locationKey + '">' + hotel.location + '</p>' +
            '</div></div></a>';
    });

    grid.innerHTML = html;

    if (typeof I18n !== 'undefined' && I18n.applyTranslations) {
        I18n.applyTranslations();
    }
}

document.addEventListener('languageChanged', function() {
    fetch('./data/us-hotels.json?t=' + Date.now())
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            renderHotels(data.hotels);
        });
    updateRCILink();
});

function updateRCILink() {
    var btn = document.getElementById('rciLinkBtn');
    if (!btn) return;
    var lang = (typeof I18n !== 'undefined' && I18n.currentLang) ? I18n.currentLang : 'en';
    var rciLinks = {
        'en': 'https://www.rci.com/pre-rci/us/en/resort-directory/landing',
        'zh': 'https://www.rci.com/pre-rci/cn/zh/resort-directory/landing',
        'ja': 'https://www.rci.com/pre-rci/jp/ja/resort-directory/landing',
        'ko': 'https://www.rci.com/pre-rci/us/en/resort-directory/landing'
    };
    btn.href = rciLinks[lang] || rciLinks['en'];
}

function tryUpdateRCILink() {
    if (typeof I18n !== 'undefined' && I18n.translations && Object.keys(I18n.translations).length > 0) {
        updateRCILink();
    } else {
        setTimeout(tryUpdateRCILink, 50);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryUpdateRCILink);
} else {
    tryUpdateRCILink();
}

/**
 * Check and apply saved dark mode preference
 */
function checkDarkModePreference() {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
        document.documentElement.classList.add('dark');
    }
}
