// 公共头部和脚部加载脚本
// 动态加载header.html和footer.html到所有页面

(function() {
    'use strict';

    var CONFIG = {
        timeout: 5000,
        maxRetries: 2,
        retryDelay: 500
    };

    var headerCache = null;
    var footerCache = null;

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
        return '<nav class="nav-container"><div class="nav-content"><a href="./index.html" class="nav-logo">Home</a></div></nav>';
    }

    function getFooterFallback() {
        return '<footer class="footer"><div class="footer-copyright"><p>© 2026 Dameisha Bay Yacht Club Resort. All Rights Reserved.</p></div></footer>';
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

    // 初始化移动端菜单
    function initMobileMenu() {
        var mobileMenuBtn = document.getElementById('mobileMenuBtn');
        var mobileMenu = document.getElementById('mobileMenu');
        
        if (mobileMenuBtn && mobileMenu) {
            function toggleMenu(e) {
                e.preventDefault();
                e.stopPropagation();
                mobileMenu.classList.toggle('active');
                mobileMenuBtn.classList.toggle('active');
            }
            
            mobileMenuBtn.addEventListener('click', toggleMenu, { passive: false });
            mobileMenuBtn.addEventListener('touchend', toggleMenu, { passive: false });

            document.addEventListener('click', function(e) {
                if (!mobileMenuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                    mobileMenu.classList.remove('active');
                    mobileMenuBtn.classList.remove('active');
                }
            });

            mobileMenu.querySelectorAll('.mobile-menu-link').forEach(function(link) {
                link.addEventListener('click', function() {
                    mobileMenu.classList.remove('active');
                    mobileMenuBtn.classList.remove('active');
                });
            });
        }
    }

    // 初始化语言切换器
    function initLangSwitcher() {
        const langBtns = document.querySelectorAll('.lang-btn, .mobile-lang-btn');

        langBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const lang = this.getAttribute('data-lang');
                if (typeof I18n !== 'undefined' && I18n.switchLanguage) {
                    I18n.switchLanguage(lang);
                }

                // 更新按钮状态
                document.querySelectorAll('.lang-btn, .mobile-lang-btn').forEach(b => {
                    b.classList.remove('active');
                });
                this.classList.add('active');
            });
        });

        // Update button states to match current language after header loads
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

    var scrollHintInitialized = false;
    function initTableScrollHint() {
        if (scrollHintInitialized) return;
        
        var isMobile = window.matchMedia('(max-width: 767px)').matches;
        if (!isMobile) return;

        var scrollContainers = document.querySelectorAll('.pricing-table-scroll');
        if (scrollContainers.length === 0) return;

        scrollHintInitialized = true;

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
            var indicator = document.createElement('div');
            indicator.className = 'scroll-indicator';
            indicator.innerHTML = svgIcon + '<span>' + getScrollHintText() + '</span>';
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

            var startX = 0;
            var startScrollLeft = 0;
            var isDragging = false;

            container.addEventListener('touchstart', function(e) {
                startX = e.touches[0].clientX;
                startScrollLeft = container.scrollLeft;
                isDragging = true;
            }, { passive: true });

            container.addEventListener('touchmove', function(e) {
                if (!isDragging) return;
                var currentX = e.touches[0].clientX;
                var diffX = startX - currentX;
                var maxScroll = container.scrollWidth - container.clientWidth;

                if (diffX > 0) {
                    var scrollRatio = Math.min((startScrollLeft + diffX) / maxScroll, 1);
                    if (scrollRatio <= 0.01) {
                        indicator.style.opacity = '0.7';
                    } else {
                        var hintOpacity = 0.7 * (1 - scrollRatio / 0.3);
                        hintOpacity = Math.max(0, Math.min(0.7, hintOpacity));
                        indicator.style.opacity = hintOpacity;
                    }
                } else {
                    indicator.style.opacity = '0.7';
                }
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
})();