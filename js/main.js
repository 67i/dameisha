document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
});

function initNavigation() {
    var nav = document.querySelector('nav');
    if (!nav) return;
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            nav.classList.add('shadow-lg');
        } else {
            nav.classList.remove('shadow-lg');
        }
    });
}

function loadUSHotels() {
    var maxAttempts = 100;
    var attempts = 0;
    function tryLoad() {
        attempts++;
        if (typeof I18n !== 'undefined' && I18n.translations && Object.keys(I18n.translations).length > 0) {
            fetch('./data/us-hotels.json?t=' + Date.now())
                .then(function(response) { return response.json(); })
                .then(function(data) { renderHotels(data.hotels); })
                .catch(function(err) { console.error('Failed to load US hotels:', err); });
        } else if (attempts < maxAttempts) {
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
        var detailHref = hotel.detailUrl;
        if (detailHref && detailHref.indexOf('./hotel-detail.html') === 0) {
            detailHref = detailHref.replace('./hotel-detail.html?id=', '#/hotel-detail?id=');
        }
        html += '<a href="' + safeHtml(detailHref) + '" class="hotel-card" style="text-decoration: none; color: inherit;">' +
            '<img src="' + safeHtml(hotel.image) + '" alt="" class="hotel-image">' +
            '<div class="hotel-info"><div class="hotel-details">' +
            '<h3 class="hotel-name" data-i18n="' + safeHtml(hotel.nameKey) + '">' + safeHtml(hotel.name) + '</h3>' +
            '<p class="hotel-location" data-i18n="' + safeHtml(hotel.locationKey) + '">' + safeHtml(hotel.location) + '</p>' +
            '</div></div></a>';
    });
    grid.innerHTML = html;
    if (typeof I18n !== 'undefined' && I18n.applyTranslations) I18n.applyTranslations();
}

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
    var maxAttempts = 100;
    var attempts = 0;
    function tryUpdate() {
        attempts++;
        if (typeof I18n !== 'undefined' && I18n.translations && Object.keys(I18n.translations).length > 0) {
            updateRCILink();
        } else if (attempts < maxAttempts) {
            setTimeout(tryUpdate, 50);
        }
    }
    tryUpdate();
}
