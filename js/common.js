(function() {
    'use strict';

    var CONFIG = {
        timeout: 5000,
        maxRetries: 2,
        retryDelay: 500
    };

    var headerCache = null;
    var footerCache = null;

    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function fetchWithTimeout(url, timeout) {
        return new Promise(function(resolve, reject) {
            var controller = new AbortController();
            var signal = controller.signal;
            var timeoutId = setTimeout(function() {
                controller.abort();
                reject(new Error('Request timeout'));
            }, timeout);

            fetch(url, { signal: signal })
                .then(function(response) {
                    clearTimeout(timeoutId);
                    if (!response.ok) {
                        throw new Error('HTTP ' + response.status);
                    }
                    return response.text();
                })
                .then(resolve)
                .catch(function(error) {
                    clearTimeout(timeoutId);
                    reject(error);
                });
        });
    }

    function loadWithRetry(url, maxRetries, retryDelay) {
        return new Promise(function(resolve, reject) {
            var attempts = 0;

            function attempt() {
                attempts++;
                fetchWithTimeout(url, CONFIG.timeout)
                    .then(resolve)
                    .catch(function(error) {
                        if (attempts < maxRetries) {
                            setTimeout(attempt, retryDelay);
                        } else {
                            reject(error);
                        }
                    });
            }

            attempt();
        });
    }

    function showLoadingIndicator(placeholder) {
        if (placeholder) {
            placeholder.innerHTML = '<div class="loading-placeholder" style="padding: 20px; text-align: center; color: #666;">Loading...</div>';
        }
    }

    function getHeaderFallback() {
        return '<nav class="nav-container" role="navigation" aria-label="Main navigation"><div class="nav-content"><a href="./index.html" class="nav-logo">Home</a></div></nav>';
    }

    function getFooterFallback() {
        return '<footer class="footer" role="contentinfo"><div class="footer-copyright"><p>&copy; 2026 Dameisha Bay Yacht Club Resort. All Rights Reserved.</p></div></footer>';
    }

    function loadHeader() {
        var headerPlaceholder = document.getElementById('header-placeholder');

        if (headerCache) {
            if (headerPlaceholder) {
                headerPlaceholder.innerHTML = headerCache;
                initMobileMenu();
                initLangSwitcher();
                tryApplyTranslations();
            }
            return;
        }

        showLoadingIndicator(headerPlaceholder);

        loadWithRetry('./header.html', CONFIG.maxRetries, CONFIG.retryDelay)
            .then(function(html) {
                headerCache = html;
                if (headerPlaceholder) {
                    headerPlaceholder.innerHTML = html;
                    initMobileMenu();
                    initLangSwitcher();
                    tryApplyTranslations();
                    if (typeof convertLinksToRouter === 'function') convertLinksToRouter();
                }
            })
            .catch(function() {
                if (headerPlaceholder) {
                    headerPlaceholder.innerHTML = getHeaderFallback();
                }
            });
    }

    function loadFooter() {
        var footerPlaceholder = document.getElementById('footer-placeholder');

        if (footerCache) {
            if (footerPlaceholder) {
                footerPlaceholder.innerHTML = footerCache;
                tryApplyTranslations();
            }
            return;
        }

        showLoadingIndicator(footerPlaceholder);

        loadWithRetry('./footer.html', CONFIG.maxRetries, CONFIG.retryDelay)
            .then(function(html) {
                footerCache = html;
                if (footerPlaceholder) {
                    footerPlaceholder.innerHTML = html;
                    tryApplyTranslations();
                    if (typeof convertLinksToRouter === 'function') convertLinksToRouter();
                }
            })
            .catch(function() {
                if (footerPlaceholder) {
                    footerPlaceholder.innerHTML = getFooterFallback();
                }
            });
    }

    function tryApplyTranslations() {
        if (typeof I18n !== 'undefined' && I18n.translations && Object.keys(I18n.translations).length > 0) {
            I18n.applyTranslations();
        }
    }

    document.addEventListener('i18nReady', function() {
        tryApplyTranslations();
    });

    function initMobileMenu() {
        var mobileMenuBtn = document.getElementById('mobileMenuBtn');
        var mobileMenu = document.getElementById('mobileMenu');

        if (mobileMenuBtn && mobileMenu && !mobileMenuBtn._menuListenersAdded) {
            mobileMenuBtn._menuListenersAdded = true;

            function toggleMenu(e) {
                e.preventDefault();
                e.stopPropagation();
                var isActive = mobileMenu.classList.toggle('active');
                mobileMenuBtn.classList.toggle('active');
                mobileMenuBtn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
            }

            mobileMenuBtn.addEventListener('click', toggleMenu, { passive: false });
            mobileMenuBtn.addEventListener('touchend', toggleMenu, { passive: false });

            document.addEventListener('click', function(e) {
                if (!mobileMenuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                    mobileMenu.classList.remove('active');
                    mobileMenuBtn.classList.remove('active');
                    mobileMenuBtn.setAttribute('aria-expanded', 'false');
                }
            });

            mobileMenu.querySelectorAll('.mobile-menu-link').forEach(function(link) {
                link.addEventListener('click', function() {
                    mobileMenu.classList.remove('active');
                    mobileMenuBtn.classList.remove('active');
                    mobileMenuBtn.setAttribute('aria-expanded', 'false');
                });
            });
        }
    }

    function initLangSwitcher() {
        var langBtns = document.querySelectorAll('.lang-btn, .mobile-lang-btn');

        langBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var lang = this.getAttribute('data-lang');
                if (typeof I18n !== 'undefined' && I18n.switchLanguage) {
                    I18n.switchLanguage(lang);
                }

                document.querySelectorAll('.lang-btn, .mobile-lang-btn').forEach(function(b) {
                    b.classList.remove('active');
                });
                this.classList.add('active');
            });
        });

        if (typeof I18n !== 'undefined' && I18n.updateLangButtons) {
            I18n.updateLangButtons();
        }
    }

    function initInlineHeader() {
        var mobileMenuBtn = document.getElementById('mobileMenuBtn');
        var langBtns = document.querySelectorAll('.lang-btn, .mobile-lang-btn');

        if (mobileMenuBtn && !mobileMenuBtn._initialized) {
            mobileMenuBtn._initialized = true;
            initMobileMenu();
        }

        if (langBtns.length > 0 && !langBtns[0]._langInitialized) {
            langBtns.forEach(function(btn) { btn._langInitialized = true; });
            initLangSwitcher();
        }

        if (typeof I18n !== 'undefined' && I18n.translations && Object.keys(I18n.translations).length > 0) {
            initTableScrollHint();
        } else {
            document.addEventListener('i18nReady', initTableScrollHint);
        }
    }

    function initTableScrollHint() {
        var isMobile = window.matchMedia('(max-width: 767px)').matches;
        if (!isMobile) return;

        var scrollContainers = document.querySelectorAll('.pricing-table-scroll');
        if (scrollContainers.length === 0) return;

        var svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v6"/><path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8"/></svg>';

        function getScrollHintText() {
            if (typeof I18n !== 'undefined' && I18n.get) {
                var text = I18n.get('benefitsDetail.scrollHint');
                return (text && text !== 'benefitsDetail.scrollHint') ? text : 'Swipe';
            }
            return 'Swipe';
        }

        function updateScrollHintText() {
            scrollContainers.forEach(function(container) {
                var indicator = container.querySelector('.scroll-indicator');
                if (indicator) {
                    var span = indicator.querySelector('span');
                    if (span) {
                        span.textContent = getScrollHintText();
                    }
                }
            });
        }

        scrollContainers.forEach(function(container) {
            if (container._scrollHintInitialized) return;
            container._scrollHintInitialized = true;

            var indicator = document.createElement('div');
            indicator.className = 'scroll-indicator';
            indicator.innerHTML = svgIcon + '<span>' + escapeHtml(getScrollHintText()) + '</span>';
            container.appendChild(indicator);

            function checkScrollable() {
                var canScroll = container.scrollWidth > container.clientWidth;
                if (canScroll) {
                    container.classList.add('scroll-hint');
                } else {
                    container.classList.remove('scroll-hint');
                }
            }

            checkScrollable();
            window.addEventListener('resize', checkScrollable);

            container.addEventListener('scroll', function() {
                var maxScroll = container.scrollWidth - container.clientWidth;
                var currentScroll = container.scrollLeft;

                if (maxScroll <= 0) {
                    indicator.style.opacity = '0';
                    return;
                }

                var scrollRatio = Math.min(currentScroll / maxScroll, 1);

                if (scrollRatio <= 0.01) {
                    indicator.style.opacity = '0.7';
                } else {
                    var hintOpacity = 0.7 * (1 - scrollRatio / 0.3);
                    hintOpacity = Math.max(0, Math.min(0.7, hintOpacity));
                    indicator.style.opacity = hintOpacity;
                }

                if (currentScroll >= maxScroll - 5) {
                    container.classList.remove('scroll-hint');
                    indicator.style.opacity = '0';
                } else if (currentScroll > 0) {
                    container.classList.add('scroll-hint');
                }
            });

            container.addEventListener('touchstart', function(e) {
            }, { passive: true });

            container.addEventListener('touchmove', function(e) {
            }, { passive: true });
        });

        if (typeof I18n !== 'undefined') {
            document.addEventListener('i18nReady', updateScrollHintText);
            document.addEventListener('languageChanged', updateScrollHintText);
            if (I18n.switchLanguage) {
                var originalSwitch = I18n.switchLanguage;
                I18n.switchLanguage = function() {
                    var result = originalSwitch.apply(this, arguments);
                    setTimeout(updateScrollHintText, 100);
                    return result;
                };
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            loadHeader();
            loadFooter();
            initInlineHeader();
        });
    } else {
        loadHeader();
        loadFooter();
        initInlineHeader();
    }

    setTimeout(function() {
        var mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (mobileMenuBtn && !mobileMenuBtn._initialized) {
            mobileMenuBtn._initialized = true;
            initMobileMenu();
        }
    }, 3000);

    window.reinitTableScrollHint = initTableScrollHint;
    window.escapeHtml = escapeHtml;
})();

function getCurrentLang() {
    if (typeof I18n !== 'undefined' && I18n.currentLang) {
        return I18n.currentLang;
    }
    return 'en';
}

function waitForI18n(callback) {
    var maxAttempts = 100;
    var attempts = 0;
    function check() {
        attempts++;
        if (typeof I18n !== 'undefined' && I18n.translations && Object.keys(I18n.translations).length > 0) {
            callback();
        } else if (attempts < maxAttempts) {
            setTimeout(check, 50);
        }
    }
    check();
}
