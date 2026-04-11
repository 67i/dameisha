// 公共头部和脚部加载脚本
// 动态加载header.html和footer.html到所有页面

(function() {
    'use strict';

    var CONFIG = {
        timeout: 10000,
        maxRetries: 2,
        retryDelay: 1000
    };

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
                            console.warn('Load failed, retrying (' + attempts + '/' + maxRetries + '):', url);
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
        showLoadingIndicator(headerPlaceholder);

        loadWithRetry('./header.html', CONFIG.maxRetries, CONFIG.retryDelay)
            .then(function(html) {
                if (headerPlaceholder) {
                    headerPlaceholder.innerHTML = html;
                    initMobileMenu();
                    initLangSwitcher();
                    tryApplyTranslations();
                }
            })
            .catch(function(error) {
                console.error('Failed to load header after retries:', error);
                if (headerPlaceholder) {
                    headerPlaceholder.innerHTML = getHeaderFallback();
                }
            });
    }

    function loadFooter() {
        var footerPlaceholder = document.getElementById('footer-placeholder');
        showLoadingIndicator(footerPlaceholder);

        loadWithRetry('./footer.html', CONFIG.maxRetries, CONFIG.retryDelay)
            .then(function(html) {
                if (footerPlaceholder) {
                    footerPlaceholder.innerHTML = html;
                    tryApplyTranslations();
                }
            })
            .catch(function(error) {
                console.error('Failed to load footer after retries:', error);
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
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', function() {
                mobileMenu.classList.toggle('active');
                mobileMenuBtn.classList.toggle('active');
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

    // 页面加载完成后加载头部和脚部
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            loadHeader();
            loadFooter();
        });
    } else {
        loadHeader();
        loadFooter();
    }
})();