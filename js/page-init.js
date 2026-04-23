window.PageInit = {};

function safeHtml(str) {
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

PageInit.initHomePage = function(params) {
    if (typeof loadUSHotels === 'function') loadUSHotels();
    if (typeof tryUpdateRCILink === 'function') tryUpdateRCILink();
    convertLinksToRouter();
    var onLangChange = function() {
        if (typeof loadUSHotels === 'function') loadUSHotels();
        if (typeof updateRCILink === 'function') updateRCILink();
        convertLinksToRouter();
    };
    document.addEventListener('languageChanged', onLangChange);
    return function() { document.removeEventListener('languageChanged', onLangChange); };
};

PageInit.initHotelDetailPage = function(params) {
    var hotelId = params.id || 'hotel1';
    function loadHotelDetail() {
        fetch('./data/hotel-details.json')
            .then(function(response) { return response.json(); })
            .then(function(data) {
                var hotel = data.hotels[hotelId];
                if (!hotel) hotel = data.hotels['hotel1'];
                renderHotelDetail(hotel);
            })
            .catch(function(err) { console.error('Failed to load hotel detail:', err); });
    }
    function renderHotelDetail(hotel) {
        var lang = getCurrentLang();
        var i18n = hotel.i18n && hotel.i18n[lang] ? hotel.i18n[lang] : hotel.i18n && hotel.i18n['zh'] ? hotel.i18n['zh'] : {};
        var heroBanner = document.getElementById('heroBanner');
        var heroLocation = document.getElementById('heroLocation');
        var heroTitle = document.getElementById('heroTitle');
        var heroDesc = document.getElementById('heroDesc');
        var introText = document.getElementById('introText');
        var introImage = document.getElementById('introImage');
        var servicesHotelName = document.getElementById('servicesHotelName');
        var servicesList = document.getElementById('servicesList');
        var servicesGallery = document.getElementById('servicesGallery');
        if (heroBanner) { heroBanner.src = hotel.banner; heroBanner.alt = hotel.name; }
        if (heroLocation) heroLocation.textContent = i18n.location || hotel.location;
        if (heroTitle) heroTitle.textContent = i18n.name || hotel.name;
        if (heroDesc) heroDesc.textContent = i18n.description || '';
        if (introText) {
            var introTextHtml = '';
            (i18n.introText || []).forEach(function(p) { introTextHtml += '<p class="hotel-intro-p">' + safeHtml(p) + '</p>'; });
            introText.innerHTML = introTextHtml;
        }
        if (hotel.introImage && introImage) introImage.src = hotel.introImage;
        if (hotel.address) {
            var mapLang = lang === 'zh' ? 'zh-CN' : lang === 'ko' ? 'ko' : lang === 'ja' ? 'ja' : 'en';
            var hotelMap = document.getElementById('hotelMap');
            if (hotelMap) {
                var mapKey = (typeof CONFIG !== 'undefined' && CONFIG.api && CONFIG.api.googleMapsKey) ? CONFIG.api.googleMapsKey : '';
                if (mapKey && CONFIG.api.useEmbedApi) {
                    hotelMap.innerHTML = '<iframe src="https://www.google.com/maps/embed/v1/place?key=' + mapKey + '&q=' + encodeURIComponent(hotel.address) + '&zoom=14&maptype=roadmap&language=' + mapLang + '" width="100%" height="300" style="border:0; border-radius: 12px;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Hotel location map"></iframe>';
                } else {
                    hotelMap.innerHTML = '<iframe src="https://maps.google.com/maps?q=' + encodeURIComponent(hotel.address) + '&t=&z=14&ie=UTF8&iwloc=&output=embed" width="100%" height="300" style="border:0; border-radius: 12px;" allowfullscreen="" loading="lazy" title="Hotel location map"></iframe>';
                }
            }
        }
        if (servicesHotelName) servicesHotelName.textContent = i18n.name || hotel.name;
        if (servicesList) {
            var servicesHtml = '';
            (i18n.services || []).forEach(function(service) {
                servicesHtml += '<div class="service-item"><div class="service-icon-wrapper"><span class="material-symbols-outlined service-icon">' + safeHtml(service.icon) + '</span></div><span class="service-name">' + safeHtml(service.name) + '</span></div>';
            });
            servicesList.innerHTML = servicesHtml;
        }
        if (servicesGallery) {
            var galleryImages = hotel.servicesGallery || [];
            var galleryHtml = '';
            galleryImages.forEach(function(img, index) {
                galleryHtml += '<img src="' + safeHtml(img) + '" alt="Gallery image" class="gallery-img" data-index="' + index + '">';
            });
            servicesGallery.innerHTML = galleryHtml;
            if (typeof Lightbox !== 'undefined') Lightbox.init(galleryImages, '.gallery-img');
        }
        var siteName = I18n.get('footer.brandName');
        document.title = (i18n.name || hotel.name) + ' - ' + siteName;
    }
    waitForI18n(loadHotelDetail);
    var onLangChange = function() { loadHotelDetail(); };
    document.addEventListener('languageChanged', onLangChange);
    convertLinksToRouter();
    return function() { document.removeEventListener('languageChanged', onLangChange); };
};

PageInit.initHotelListPage = function(params) {
    var allHotels = [];
    var dest = params.dest || '';
    var destTitleKeys = {
        newyork: 'hotelList.destNewYork', phuket: 'hotelList.destPhuket',
        finland: 'hotelList.destFinland', maldives: 'hotelList.destMaldives',
        bali: 'hotelList.destBali', cancun: 'hotelList.destCancun',
        dubai: 'hotelList.destDubai', tenerife: 'hotelList.destTenerife'
    };
    var destHeroImages = {
        newyork: './assets/destinations/new-york.jpg', phuket: './assets/destinations/phuket.png',
        finland: './assets/destinations/finland.png', maldives: './assets/destinations/maldives.png',
        bali: './assets/destinations/bali.png', cancun: './assets/destinations/cancun.png',
        dubai: './assets/destinations/dubai.png', tenerife: './assets/destinations/tenerife.png'
    };
    function renderHotels() {
        var grid = document.getElementById('hotelListGrid');
        if (!grid) return;
        var hotels = dest ? allHotels.filter(function(h) { return h.dest.indexOf(dest) !== -1; }) : allHotels;
        if (dest && destTitleKeys[dest]) {
            var heroTitle = document.querySelector('.hotel-list-hero-title');
            if (heroTitle) heroTitle.setAttribute('data-i18n', destTitleKeys[dest]);
            var heroBg = document.querySelector('.hotel-list-hero-bg');
            if (heroBg && destHeroImages[dest]) heroBg.style.backgroundImage = 'url(' + destHeroImages[dest] + ')';
        }
        var html = '';
        hotels.forEach(function(hotel) {
            var badgeHtml = hotel.badge ? '<span class="hotel-list-card-badge" data-i18n="hotelList.badgePartner">RCI Partner</span>' : '';
            var isExternal = hotel.detail && (hotel.detail.indexOf('http://') === 0 || hotel.detail.indexOf('https://') === 0);
            var targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
            var linkHref = isExternal ? hotel.detail : Router.href('hotel-detail', { id: hotel.detail.replace('./hotel-detail.html?id=', '') });
            html += '<a href="' + safeHtml(linkHref) + '" class="hotel-list-card"' + targetAttr + '>' +
                '<div class="hotel-list-card-image"><img src="' + safeHtml(hotel.image) + '" alt="">' + badgeHtml + '</div>' +
                '<div class="hotel-list-card-body"><div class="hotel-list-card-header"><div>' +
                '<h3 class="hotel-list-card-name" data-i18n="' + safeHtml(hotel.nameKey) + '"></h3>' +
                '<p class="hotel-list-card-location" data-i18n="' + safeHtml(hotel.locKey) + '"></p>' +
                '</div></div><div class="hotel-list-card-footer">' +
                '<span class="hotel-list-card-detail" data-i18n="hotelList.viewDetails">View Details</span>' +
                '</div></div></a>';
        });
        grid.innerHTML = html;
        if (typeof I18n !== 'undefined' && I18n.applyTranslations) I18n.applyTranslations();
    }
    function loadAndRender() {
        fetch('./data/hotel-list.json').then(function(r) { return r.json(); }).then(function(data) {
            allHotels = data.hotels || [];
            waitForI18n(renderHotels);
        }).catch(function(err) { console.error('Failed to load hotel list:', err); });
    }
    loadAndRender();
    var onLangChange = function() { renderHotels(); };
    document.addEventListener('languageChanged', onLangChange);
    convertLinksToRouter();
    return function() { document.removeEventListener('languageChanged', onLangChange); };
};

PageInit.initVacationDetailPage = function(params) {
    var vacationType = params.type || 'family-vacation';
    function loadVacationDetail() {
        fetch('./data/vacation-details.json?t=' + Date.now())
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var vacation = data[vacationType] || data['family-trip'];
                renderVacationDetail(vacation);
            })
            .catch(function(err) { console.error('Failed to load vacation detail:', err); });
    }
    function renderVacationDetail(vacation) {
        var lang = getCurrentLang();
        var i18n = vacation.i18n && vacation.i18n[lang] ? vacation.i18n[lang] : vacation.i18n && vacation.i18n['zh'] ? vacation.i18n['zh'] : {};
        var heroBanner = document.getElementById('heroBanner');
        var heroTitle = document.getElementById('heroTitle');
        var heroDesc = document.getElementById('heroDesc');
        var introText = document.getElementById('introText');
        var introImage = document.getElementById('introImage');
        var galleryTitle = document.getElementById('galleryTitle');
        var vacationGallery = document.getElementById('vacationGallery');
        if (heroBanner) { heroBanner.src = vacation.cover; heroBanner.alt = i18n.title || ''; }
        if (heroTitle) heroTitle.textContent = i18n.title || '';
        if (heroDesc) heroDesc.textContent = i18n.description || '';
        if (introText) {
            var introTextHtml = '';
            if (i18n.introP1) introTextHtml += '<p class="hotel-intro-p">' + safeHtml(i18n.introP1) + '</p>';
            if (i18n.introP2) introTextHtml += '<p class="hotel-intro-p">' + safeHtml(i18n.introP2) + '</p>';
            introText.innerHTML = introTextHtml;
        }
        if (vacation.gallery && vacation.gallery.length > 0 && introImage) introImage.src = vacation.gallery[0];
        if (galleryTitle) galleryTitle.textContent = i18n.title || '';
        if (vacationGallery) {
            var galleryHtml = '';
            (vacation.gallery || []).forEach(function(img, index) {
                if (index === 0) return;
                galleryHtml += '<div class="vacation-gallery-item"><img src="' + safeHtml(img) + '" alt="Gallery image" class="vacation-gallery-img" data-index="' + index + '"></div>';
            });
            vacationGallery.innerHTML = galleryHtml;
        }
        if (typeof Lightbox !== 'undefined') Lightbox.init(vacation.gallery || [], '.vacation-gallery-img');
        var siteName = I18n.get('footer.brandName');
        document.title = (i18n.title || '') + ' - ' + siteName;
    }
    waitForI18n(loadVacationDetail);
    var onLangChange = function() { loadVacationDetail(); };
    document.addEventListener('languageChanged', onLangChange);
    convertLinksToRouter();
    return function() { document.removeEventListener('languageChanged', onLangChange); };
};

PageInit.initExchangeDetailPage = function(params) {
    var exchangeType = params.type || 'manhattan-club';
    function loadExchangeDetail() {
        fetch('./data/exchange-details.json?t=' + Date.now())
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var exchange = data[exchangeType] || data['manhattan-club'];
                renderExchangeDetail(exchange);
            })
            .catch(function(err) { console.error('Failed to load exchange detail:', err); });
    }
    function renderExchangeDetail(exchange) {
        var lang = getCurrentLang();
        var i18n = exchange.i18n && exchange.i18n[lang] ? exchange.i18n[lang] : exchange.i18n && exchange.i18n['zh'] ? exchange.i18n['zh'] : {};
        var introText = document.getElementById('introText');
        var introImage = document.getElementById('introImage');
        var galleryTitle = document.getElementById('galleryTitle');
        var exchangeGallery = document.getElementById('exchangeGallery');
        if (introText) {
            var introTextHtml = '';
            if (i18n.introP1) introTextHtml += '<p class="hotel-intro-p">' + safeHtml(i18n.introP1) + '</p>';
            if (i18n.introP2) introTextHtml += '<p class="hotel-intro-p">' + safeHtml(i18n.introP2) + '</p>';
            introText.innerHTML = introTextHtml;
        }
        if (exchange.gallery && exchange.gallery.length > 0 && introImage) introImage.src = exchange.gallery[0];
        if (galleryTitle) galleryTitle.textContent = i18n.title || '';
        if (exchangeGallery) {
            var galleryHtml = '';
            (exchange.gallery || []).forEach(function(img, index) {
                if (index === 0) return;
                galleryHtml += '<div class="exchange-gallery-item"><img src="' + safeHtml(img) + '" alt="Gallery image" class="exchange-gallery-img" data-index="' + index + '"></div>';
            });
            exchangeGallery.innerHTML = galleryHtml;
        }
        var gallerySection = document.querySelector('.vacation-gallery-section');
        if (gallerySection) {
            if (exchange.hideGallery || (exchange.gallery || []).length === 0) {
                gallerySection.style.display = 'none';
            } else {
                gallerySection.style.display = '';
            }
        }
        if (typeof Lightbox !== 'undefined') Lightbox.init(exchange.gallery || [], '.exchange-gallery-img', { introImageId: 'introImage' });
        var siteName = I18n.get('footer.brandName');
        document.title = (i18n.title || '') + ' - ' + siteName;
    }
    waitForI18n(loadExchangeDetail);
    var onLangChange = function() { loadExchangeDetail(); };
    document.addEventListener('languageChanged', onLangChange);
    convertLinksToRouter();
    return function() { document.removeEventListener('languageChanged', onLangChange); };
};

PageInit.initAuthorizedDealerPage = function(params) {
    var dealerType = params.type || 'affiliate-resort';
    function loadDealerDetail() {
        fetch('./data/authorized-dealer.json?t=' + Date.now())
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var dealer = data[dealerType] || data['affiliate-resort'];
                renderDealerDetail(dealer);
            })
            .catch(function(err) { console.error('Failed to load dealer detail:', err); });
    }
    function renderDealerDetail(dealer) {
        var lang = getCurrentLang();
        var i18n = dealer.i18n && dealer.i18n[lang] ? dealer.i18n[lang] : dealer.i18n && dealer.i18n['zh'] ? dealer.i18n['zh'] : {};
        var introImage = document.getElementById('introImage');
        var introText = document.getElementById('introText');
        if (dealer.cover && introImage) introImage.src = dealer.cover;
        if (introImage) introImage.alt = i18n.title || '';
        if (introText) introText.innerHTML = '<p>' + safeHtml(i18n.description || '') + '</p>';
        var siteName = I18n.get('footer.brandName');
        document.title = (i18n.title || '') + ' - ' + siteName;
    }
    waitForI18n(loadDealerDetail);
    var onLangChange = function() { loadDealerDetail(); };
    document.addEventListener('languageChanged', onLangChange);
    convertLinksToRouter();
    return function() { document.removeEventListener('languageChanged', onLangChange); };
};

PageInit.initBenefitsDetailPage = function(params) {
    function openImageModal(imgOrUrl) {
        var overlay = document.createElement('div');
        overlay.className = 'image-modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Image preview');
        overlay.onclick = function() { overlay.remove(); };
        var modalImg = document.createElement('img');
        modalImg.src = typeof imgOrUrl === 'string' ? imgOrUrl : imgOrUrl.src;
        modalImg.alt = typeof imgOrUrl === 'string' ? 'Enlarged image' : (imgOrUrl.alt || 'Enlarged image');
        overlay.appendChild(modalImg);
        document.body.appendChild(overlay);
    }
    window.openImageModal = openImageModal;
    if (typeof window.reinitTableScrollHint === 'function') window.reinitTableScrollHint();
    convertLinksToRouter();
    return function() { delete window.openImageModal; };
};

PageInit.initFaqPage = function(params) {
    function initFAQ() {
        var faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach(function(item) {
            var questionWrapper = item.querySelector('.faq-question-wrapper');
            var answer = item.querySelector('.faq-answer');
            if (questionWrapper && answer) {
                questionWrapper.addEventListener('click', function() {
                    var isActive = item.classList.toggle('faq-active');
                    questionWrapper.setAttribute('aria-expanded', isActive ? 'true' : 'false');
                    if (isActive) {
                        answer.style.maxHeight = answer.scrollHeight + 'px';
                        answer.style.opacity = '1';
                        var icon = item.querySelector('.material-symbols-outlined');
                        if (icon) icon.textContent = 'remove';
                    } else {
                        answer.style.maxHeight = '0';
                        answer.style.opacity = '0';
                        var icon = item.querySelector('.material-symbols-outlined');
                        if (icon) icon.textContent = 'add';
                    }
                });
            }
        });
    }
    initFAQ();
    convertLinksToRouter();
};

PageInit.initContactPage = function(params) {
    convertLinksToRouter();
};

PageInit.initPrivacyPage = function(params) {
    function updatePrivacySections() {
        var section8 = document.getElementById('privacy-section8');
        if (section8) {
            var currentLang = getCurrentLang();
            section8.style.display = currentLang === 'ja' ? 'block' : 'none';
        }
    }
    setTimeout(updatePrivacySections, 100);
    var onLangChange = function() { updatePrivacySections(); };
    document.addEventListener('languageChanged', onLangChange);
    convertLinksToRouter();
    return function() { document.removeEventListener('languageChanged', onLangChange); };
};

PageInit.initTermsPage = function(params) {
    convertLinksToRouter();
};
