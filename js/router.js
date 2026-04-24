/**
 * SPA Router - Hash-based routing with partial page refresh
 * Loads page HTML fragments into #app-content without full page reload
 */
(function() {
    'use strict';

    var Router = {
        currentRoute: null,
        currentCleanup: null,
        pageCache: {},
        routes: {
            'home':              { fragment: 'pages/home.html',           init: 'initHomePage',           title: 'Dameisha Bay Yacht Club Resort' },
            'hotel-detail':      { fragment: 'pages/hotel-detail.html',  init: 'initHotelDetailPage',    title: 'Hotel Details' },
            'hotel-list':        { fragment: 'pages/hotel-list.html',    init: 'initHotelListPage',      title: 'Hotel List' },
            'vacation-detail':   { fragment: 'pages/vacation-detail.html', init: 'initVacationDetailPage', title: 'Vacation Details' },
            'exchange-detail':   { fragment: 'pages/exchange-detail.html', init: 'initExchangeDetailPage', title: 'Exchange Details' },
            'authorized-dealer': { fragment: 'pages/authorized-dealer.html', init: 'initAuthorizedDealerPage', title: 'Authorized Dealer' },
            'benefits-detail':   { fragment: 'pages/benefits-detail.html', init: 'initBenefitsDetailPage', title: 'Benefits Details' },
            'faq':               { fragment: 'pages/faq.html',           init: 'initFaqPage',            title: 'FAQ' },
            'contact':           { fragment: 'pages/contact.html',       init: 'initContactPage',        title: 'Contact Us' },
            'privacy':           { fragment: 'pages/privacy.html',       init: 'initPrivacyPage',        title: 'Privacy Policy' },
            'terms':             { fragment: 'pages/terms.html',         init: 'initTermsPage',          title: 'Terms of Service' },
            'shop':              { fragment: 'pages/shop.html',          init: 'initShopPage',           title: 'Shop Now' }
        },

        init: function() {
            var self = this;
            window.addEventListener('hashchange', function() {
                self.handleRoute();
            });

            // Wait for i18n to be ready before initial route
            function startRouting() {
                if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#') {
                    window.location.hash = '#/home';
                } else {
                    self.handleRoute();
                }
            }

            if (typeof I18n !== 'undefined' && I18n.translations && Object.keys(I18n.translations).length > 0) {
                startRouting();
            } else {
                document.addEventListener('i18nReady', startRouting);
            }
        },

        handleRoute: function() {
            var hash = window.location.hash.replace('#', '') || '/home';
            // Handle hash fragment for scroll position (e.g., #/home#benefits)
            var scrollTarget = '';
            var hashFragmentIndex = hash.indexOf('#', 1); // skip the leading /
            if (hashFragmentIndex !== -1) {
                scrollTarget = hash.substring(hashFragmentIndex + 1);
                hash = hash.substring(0, hashFragmentIndex);
            }
            var parts = hash.replace(/^\//, '').split('?');
            var routeName = parts[0];
            var queryString = parts[1] || '';

            // Map legacy page names to routes
            var routeMap = {
                'index.html': 'home',
                'hotel-detail.html': 'hotel-detail',
                'hotel-list.html': 'hotel-list',
                'vacation-detail.html': 'vacation-detail',
                'exchange-detail.html': 'exchange-detail',
                'authorized-dealer.html': 'authorized-dealer',
                'benefits-detail.html': 'benefits-detail',
                'faq.html': 'faq',
                'contact.html': 'contact',
                'privacy.html': 'privacy',
                'terms.html': 'terms',
                'shop.html': 'shop'
            };

            if (routeMap[routeName]) {
                routeName = routeMap[routeName];
                window.location.hash = '#/' + routeName + (queryString ? '?' + queryString : '');
                return;
            }

            var route = this.routes[routeName];
            if (!route) {
                routeName = 'home';
                route = this.routes['home'];
            }

            var params = this.parseQueryString(queryString);
            this.navigate(routeName, params, scrollTarget);
        },

        parseQueryString: function(qs) {
            var params = {};
            if (!qs) return params;
            qs.split('&').forEach(function(pair) {
                var kv = pair.split('=');
                params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
            });
            return params;
        },

        navigate: function(routeName, params, scrollTarget) {
            var self = this;
            var route = this.routes[routeName];
            if (!route) return;

            // Cleanup previous page
            if (typeof this.currentCleanup === 'function') {
                this.currentCleanup();
                this.currentCleanup = null;
            }

            // Cleanup scroll animation observer
            if (typeof destroyScrollAnimations === 'function') {
                destroyScrollAnimations();
            }

            // Same route, just re-init (e.g., different hotel id)
            if (this.currentRoute === routeName && this.pageCache[route.fragment]) {
                var appContent = document.getElementById('app-content');
                appContent.innerHTML = this.pageCache[route.fragment];
                this.initPage(route.init, params, scrollTarget);
                return;
            }

            this.currentRoute = routeName;

            // Update page title
            if (route.title) {
                document.title = route.title;
            }

            // Load page fragment
            this.loadFragment(route.fragment).then(function(html) {
                var appContent = document.getElementById('app-content');
                appContent.innerHTML = html;
                self.initPage(route.init, params, scrollTarget);
            }).catch(function(err) {
                console.error('Failed to load page:', routeName, err);
            });
        },

        loadFragment: function(url) {
            if (this.pageCache[url]) {
                return Promise.resolve(this.pageCache[url]);
            }

            return fetch(url).then(function(response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.text();
            }).then(function(html) {
                // Cache for future use
                Router.pageCache[url] = html;
                return html;
            });
        },

        initPage: function(initFnName, params, scrollTarget) {
            var self = this;

            // Scroll to top
            window.scrollTo(0, 0);

            // Apply i18n translations to new content
            if (typeof I18n !== 'undefined' && I18n.applyTranslations) {
                I18n.applyTranslations();
            }

            // Init scroll animations for new content
            if (typeof initScrollAnimations === 'function') {
                initScrollAnimations();
            }

            // Call page-specific init function
            if (typeof window.PageInit !== 'undefined' && typeof window.PageInit[initFnName] === 'function') {
                var result = window.PageInit[initFnName](params);
                if (typeof result === 'function') {
                    self.currentCleanup = result;
                }
            }

            // Handle scroll target from hash fragment (e.g., #/home#benefits)
            if (scrollTarget) {
                setTimeout(function() {
                    var el = document.getElementById(scrollTarget);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 300);
            }
        },

        /**
         * Generate a router link href from page name and params
         */
        href: function(page, params) {
            var href = '#/' + page;
            var qs = [];
            if (params) {
                Object.keys(params).forEach(function(key) {
                    qs.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
                });
            }
            if (qs.length > 0) href += '?' + qs.join('&');
            return href;
        },

        /**
         * Clear page cache (useful after language change to re-render)
         */
        clearCache: function() {
            this.pageCache = {};
        }
    };

    window.Router = Router;

    // Auto-init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            Router.init();
        });
    } else {
        Router.init();
    }
})();

/**
 * Helper to convert old-style links to router links
 * Call this after any dynamic content is inserted
 */
function convertLinksToRouter() {
    // Convert all internal <a href="./xxx.html"> links to hash routes
    var links = document.querySelectorAll('a[href^="./"]');
    var routeMap = {
        'index.html': 'home',
        'hotel-detail.html': 'hotel-detail',
        'hotel-list.html': 'hotel-list',
        'vacation-detail.html': 'vacation-detail',
        'exchange-detail.html': 'exchange-detail',
        'authorized-dealer.html': 'authorized-dealer',
        'benefits-detail.html': 'benefits-detail',
        'faq.html': 'faq',
        'contact.html': 'contact',
        'privacy.html': 'privacy',
        'terms.html': 'terms'
    };

    links.forEach(function(link) {
        var href = link.getAttribute('href');
        if (!href || href.startsWith('./assets/') || href.startsWith('./data/')) return;

        // Parse page name and query string
        var match = href.match(/^\.\/([^?]+)(?:\?(.*))?$/);
        if (!match) return;

        var pageName = match[1];
        var qs = match[2] || '';
        var routeName = routeMap[pageName];

        if (routeName) {
            var newHref = '#/' + routeName;
            if (qs) newHref += '?' + qs;

            // Handle hash fragment (e.g., ./index.html#benefits)
            var hashPart = link.getAttribute('href').split('#')[2];
            if (hashPart) {
                newHref += '#' + hashPart;
            }

            link.setAttribute('href', newHref);
            link.removeAttribute('target'); // No need for target in SPA
        }
    });
}
