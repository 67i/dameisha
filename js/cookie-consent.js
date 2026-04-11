// Cookie Consent Banner
// 管理Cookie同意横幅的显示和隐藏

(function() {
    'use strict';

    // 检查是否已经同意了Cookie
    function checkCookieConsent() {
        var consent = localStorage.getItem('cookieConsent');
        return consent === 'true' || consent === 'basic';
    }

    // 保存Cookie同意状态（全部接受）
    function saveCookieConsent() {
        localStorage.setItem('cookieConsent', 'true');
    }

    // 保存基本同意状态（拒绝非必要Cookie）
    function saveBasicConsent() {
        localStorage.setItem('cookieConsent', 'basic');
        disableAnalyticsCookies();
    }

    // 禁用非必要Cookie（分析类Cookie）
    function disableAnalyticsCookies() {
        var cookies = document.cookie.split(';');
        cookies.forEach(function(cookie) {
            var name = cookie.split('=')[0].trim();
            if (name.indexOf('_ga') === 0 || name.indexOf('_gid') === 0 || name.indexOf('_utm') === 0) {
                document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            }
        });
    }

    // 创建Cookie同意横幅
    function createCookieBanner() {
        // 检查是否已经同意
        if (checkCookieConsent()) {
            return;
        }

        // 创建横幅元素
        const banner = document.createElement('div');
        banner.id = 'cookie-banner';
        banner.className = 'cookie-banner';

        // 横幅内容
        banner.innerHTML = `
            <div class="cookie-banner-content">
                <p class="cookie-banner-text">
                    We use cookies to enhance your browsing experience and analyze our traffic. By clicking "Accept All", you consent to our use of cookies in accordance with our <a href="./privacy.html" class="cookie-banner-link">Privacy Policy</a>.
                </p>
                <div class="cookie-banner-buttons">
                    <button id="accept-cookies" class="cookie-banner-button cookie-banner-button-accept">Accept All</button>
                    <button id="reject-cookies" class="cookie-banner-button cookie-banner-button-reject">Reject Non-Essential</button>
                </div>
            </div>
        `;

        // 添加到页面
        document.body.appendChild(banner);

        // 添加样式
        addCookieBannerStyles();

        // 添加事件监听器
        document.getElementById('accept-cookies').addEventListener('click', function() {
            saveCookieConsent();
            banner.style.display = 'none';
        });

        document.getElementById('reject-cookies').addEventListener('click', function() {
            saveBasicConsent();
            banner.style.display = 'none';
        });
    }

    // 添加Cookie横幅样式
    function addCookieBannerStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .cookie-banner {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background-color: #2c3e50;
                color: #ffffff;
                padding: 1rem;
                z-index: 10000;
                box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
            }

            .cookie-banner-content {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            @media (min-width: 768px) {
                .cookie-banner-content {
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;
                }
            }

            .cookie-banner-text {
                margin: 0;
                font-size: 0.875rem;
                line-height: 1.5;
            }

            .cookie-banner-link {
                color: #3498db;
                text-decoration: underline;
            }

            .cookie-banner-link:hover {
                color: #2980b9;
            }

            .cookie-banner-buttons {
                display: flex;
                gap: 0.75rem;
                flex-wrap: wrap;
            }

            .cookie-banner-button {
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 4px;
                font-size: 0.875rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .cookie-banner-button-accept {
                background-color: #27ae60;
                color: #ffffff;
            }

            .cookie-banner-button-accept:hover {
                background-color: #229954;
            }

            .cookie-banner-button-reject {
                background-color: #95a5a6;
                color: #ffffff;
            }

            .cookie-banner-button-reject:hover {
                background-color: #7f8c8d;
            }

            @media (max-width: 767px) {
                .cookie-banner-text {
                    font-size: 0.75rem;
                }

                .cookie-banner-button {
                    padding: 0.4rem 0.8rem;
                    font-size: 0.75rem;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // 页面加载完成后创建Cookie横幅
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createCookieBanner);
    } else {
        createCookieBanner();
    }
})();