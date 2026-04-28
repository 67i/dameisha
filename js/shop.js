var ShopApp = (function() {
    var currentStep = 1;
    var isLoggedIn = false;
    var termsAgreed = false;
    var inviteValid = false;
    var purchaseAgreed = false;
    var isPaying = false;
    var profile = {};
    var tokenKey = 'qx_member_token';
    var currentIntentId = null;

    var VALID_INVITE_CODES = ['AGENT123', 'TEAM01', 'RCI2024', 'AGENT_A', 'AGENT_B'];

    var COUNTRY_DATA = {
        'zh': {
            'regions': {
                'asia': '亚太（含中国）',
                'europe': '欧美',
                'america': '拉美',
                'middleEast': '中东 / 非洲'
            },
            'countries': {
                '+86': '中国',
                '+852': '香港',
                '+853': '澳门',
                '+886': '台湾',
                '+81': '日本',
                '+82': '韩国',
                '+65': '新加坡',
                '+60': '马来西亚',
                '+66': '泰国',
                '+62': '印尼',
                '+91': '印度',
                '+61': '澳大利亚',
                '+64': '新西兰',
                '+1': '美国/加拿大',
                '+44': '英国',
                '+33': '法国',
                '+49': '德国',
                '+39': '意大利',
                '+34': '西班牙',
                '+31': '荷兰',
                '+32': '比利时',
                '+41': '瑞士',
                '+43': '奥地利',
                '+52': '墨西哥',
                '+55': '巴西',
                '+54': '阿根廷',
                '+56': '智利',
                '+57': '哥伦比亚',
                '+51': '秘鲁',
                '+971': '阿联酋',
                '+20': '埃及',
                '+972': '以色列',
                '+90': '土耳其',
                '+27': '南非'
            }
        },
        'en': {
            'regions': {
                'asia': 'Asia Pacific (including China)',
                'europe': 'Europe & America',
                'america': 'Latin America',
                'middleEast': 'Middle East / Africa'
            },
            'countries': {
                '+86': 'China',
                '+852': 'Hong Kong',
                '+853': 'Macau',
                '+886': 'Taiwan',
                '+81': 'Japan',
                '+82': 'Korea',
                '+65': 'Singapore',
                '+60': 'Malaysia',
                '+66': 'Thailand',
                '+62': 'Indonesia',
                '+91': 'India',
                '+61': 'Australia',
                '+64': 'New Zealand',
                '+1': 'USA/Canada',
                '+44': 'UK',
                '+33': 'France',
                '+49': 'Germany',
                '+39': 'Italy',
                '+34': 'Spain',
                '+31': 'Netherlands',
                '+32': 'Belgium',
                '+41': 'Switzerland',
                '+43': 'Austria',
                '+52': 'Mexico',
                '+55': 'Brazil',
                '+54': 'Argentina',
                '+56': 'Chile',
                '+57': 'Colombia',
                '+51': 'Peru',
                '+971': 'UAE',
                '+20': 'Egypt',
                '+972': 'Israel',
                '+90': 'Turkey',
                '+27': 'South Africa'
            }
        },
        'ko': {
            'regions': {
                'asia': '아시아 태평양 (중국 포함)',
                'europe': '유럽 및 미국',
                'america': '라틴 아메리카',
                'middleEast': '중동 / 아프리카'
            },
            'countries': {
                '+86': '중국',
                '+852': '홍콩',
                '+853': '마카오',
                '+886': '대만',
                '+81': '일본',
                '+82': '한국',
                '+65': '싱가포르',
                '+60': '말레이시아',
                '+66': '태국',
                '+62': '인도네시아',
                '+91': '인도',
                '+61': '호주',
                '+64': '뉴질랜드',
                '+1': '미국/캐나다',
                '+44': '영국',
                '+33': '프랑스',
                '+49': '독일',
                '+39': '이탈리아',
                '+34': '스페인',
                '+31': '네덜란드',
                '+32': '벨기에',
                '+41': '스위스',
                '+43': '오스트리아',
                '+52': '멕시코',
                '+55': '브라질',
                '+54': '아르헨티나',
                '+56': '칠레',
                '+57': '콜롬비아',
                '+51': '페루',
                '+971': '아랍에미리트',
                '+20': '이집트',
                '+972': '이스라엘',
                '+90': '터키',
                '+27': '남아프리카'
            }
        },
        'ja': {
            'regions': {
                'asia': 'アジア太平洋（中国含む）',
                'europe': '欧米',
                'america': 'ラテンアメリカ',
                'middleEast': '中東 / アフリカ'
            },
            'countries': {
                '+86': '中国',
                '+852': '香港',
                '+853': 'マカオ',
                '+886': '台湾',
                '+81': '日本',
                '+82': '韓国',
                '+65': 'シンガポール',
                '+60': 'マレーシア',
                '+66': 'タイ',
                '+62': 'インドネシア',
                '+91': 'インド',
                '+61': 'オーストラリア',
                '+64': 'ニュージーランド',
                '+1': '米国/カナダ',
                '+44': '英国',
                '+33': 'フランス',
                '+49': 'ドイツ',
                '+39': 'イタリア',
                '+34': 'スペイン',
                '+31': 'オランダ',
                '+32': 'ベルギー',
                '+41': 'スイス',
                '+43': 'オーストリア',
                '+52': 'メキシコ',
                '+55': 'ブラジル',
                '+54': 'アルゼンチン',
                '+56': 'チリ',
                '+57': 'コロンビア',
                '+51': 'ペルー',
                '+971': 'UAE',
                '+20': 'エジプト',
                '+972': 'イスラエル',
                '+90': 'トルコ',
                '+27': '南アフリカ'
            }
        }
    };

    function getCurrentLanguage() {
        if (typeof I18n !== 'undefined' && I18n.getLanguage) {
            return I18n.getLanguage() || 'en';
        }
        return 'en';
    }

    function apiBase() {
        return (typeof CONFIG !== 'undefined' && CONFIG.api && CONFIG.api.baseUrl) ? CONFIG.api.baseUrl : '';
    }

    function memberToken() {
        return String(localStorage.getItem(tokenKey) || '').replace(/\s+/g, '');
    }

    function memberAccessToken() {
        return String(localStorage.getItem('qx_member_access_token') || '').replace(/\s+/g, '');
    }

    function setMemberToken(value) {
        var normalized = String(value || '').replace(/\s+/g, '');
        if (normalized) {
            localStorage.setItem(tokenKey, normalized);
        } else {
            localStorage.removeItem(tokenKey);
        }
    }

    function setMemberAccessToken(value) {
        var normalized = String(value || '').replace(/\s+/g, '');
        if (normalized) {
            localStorage.setItem('qx_member_access_token', normalized);
        } else {
            localStorage.removeItem('qx_member_access_token');
        }
    }

    function authRequest(path, body) {
        if (!apiBase()) {
            return Promise.reject(new Error('API 地址尚未配置。'));
        }
        return fetch(apiBase() + path, {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify(body || {})
        }).then(function(response) {
            return response.json().catch(function() { return {}; }).then(function(payload) {
                if (!response.ok) {
                    throw new Error(payload.message || ('HTTP ' + response.status));
                }
                return payload.data || payload;
            });
        });
    }

    function memberRequest(path, options) {
        if (!apiBase()) {
            return Promise.reject(new Error('API 地址尚未配置。'));
        }
        if (!memberToken()) {
            return Promise.reject(new Error('请先登录会员账号。'));
        }
        var requestOptions = options || {};
        requestOptions.headers = Object.assign({
            Authorization: 'Bearer ' + memberToken()
        }, requestOptions.headers || {});

        return fetch(apiBase() + path, requestOptions).then(function(response) {
            return response.json().catch(function() { return {}; }).then(function(body) {
                if (!response.ok) {
                    throw new Error(body.message || ('HTTP ' + response.status));
                }
                return body.data || body;
            });
        });
    }

    function setLoginError(message) {
        var el = document.getElementById('shopLoginError');
        if (!el) return;
        el.textContent = message || '';
        el.style.display = message ? 'block' : 'none';
    }

    function setAuthSuccess(message) {
        var el = document.getElementById('shopAuthSuccess');
        if (!el) return;
        el.textContent = message || '';
        el.style.display = message ? 'block' : 'none';
    }

    function updateLoginStatus() {
        var status = document.getElementById('shopLoginStatus');
        var form = document.getElementById('shopLoginForm');
        if (!status || !form) return;
        if (memberToken()) {
            status.innerHTML = '<strong>已检测到会员登录状态</strong><span>可直接继续购买，或在会员中心查看订单。</span><button class="shop-btn-outline" type="button" onclick="ShopApp.continueWithSavedLogin()">继续购买</button>';
            status.style.display = 'grid';
            form.style.display = 'none';
        } else {
            status.style.display = 'none';
            form.style.display = 'grid';
        }
    }

    function switchAuthMode(mode) {
        ['login', 'register', 'reset'].forEach(function(key) {
            var form = document.getElementById(key === 'login' ? 'shopLoginForm' : key === 'register' ? 'shopRegisterForm' : 'shopResetForm');
            if (form) form.style.display = key === mode ? 'grid' : 'none';
        });
        document.querySelectorAll('[data-shop-auth-mode]').forEach(function(btn) {
            btn.classList.toggle('active', btn.getAttribute('data-shop-auth-mode') === mode);
        });
        setLoginError('');
        setAuthSuccess('');
        updateLoginStatus();
    }

    function socialLogin(provider) {
        var cognito = (typeof CONFIG !== 'undefined' && CONFIG.cognito) ? CONFIG.cognito : {};
        var domain = String(cognito.hostedUiDomain || '').replace(/\/+$/, '');
        if (!domain) {
            setLoginError('请先在 config/index.js 配置 Cognito Hosted UI 域名。');
            return;
        }

        localStorage.setItem('qx_oauth_next', window.location.hash || '#/shop');
        var params = {
            client_id: cognito.clientId || '',
            response_type: cognito.responseType || 'token',
            scope: cognito.scopes || 'openid email profile',
            redirect_uri: cognito.redirectUri || (window.location.origin + window.location.pathname)
        };
        if (provider) params.identity_provider = provider;

        var query = Object.keys(params).map(function(key) {
            return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
        }).join('&');
        window.location.href = domain + '/oauth2/authorize?' + query;
    }

    function generateCountryOptions() {
        var select = document.getElementById('shopCountryCode');
        if (!select) return;

        var lang = getCurrentLanguage();
        var countryData = COUNTRY_DATA[lang] || COUNTRY_DATA.en;

        select.innerHTML = '';

        var regions = [
            { key: 'asia', codes: ['+86', '+852', '+853', '+886', '+81', '+82', '+65', '+60', '+66', '+62', '+91', '+61', '+64'] },
            { key: 'europe', codes: ['+1', '+44', '+33', '+49', '+39', '+34', '+31', '+32', '+41', '+43'] },
            { key: 'america', codes: ['+52', '+55', '+54', '+56', '+57', '+51'] },
            { key: 'middleEast', codes: ['+971', '+20', '+972', '+90', '+27'] }
        ];

        regions.forEach(function(region) {
            var optgroup = document.createElement('optgroup');
            optgroup.label = countryData.regions[region.key] || region.key;
            
            region.codes.forEach(function(code) {
                var option = document.createElement('option');
                option.value = code;
                option.textContent = code + ' ' + (countryData.countries[code] || code);
                optgroup.appendChild(option);
            });
            
            select.appendChild(optgroup);
        });
    }

    function goToStep(step) {
        currentStep = step;
        for (var i = 1; i <= 4; i++) {
            var el = document.getElementById('shopStep' + i);
            if (el) el.style.display = (i === step) ? 'block' : 'none';
        }
        updateProgress(step);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function prevStep() {
        if (currentStep > 1) {
            goToStep(currentStep - 1);
        }
    }

    function updateProgress(step) {
        var steps = document.querySelectorAll('.shop-progress-step');
        steps.forEach(function(s) {
            var sStep = parseInt(s.getAttribute('data-step'));
            s.classList.remove('active', 'completed');
            if (sStep === step) {
                s.classList.add('active');
            } else if (sStep < step) {
                s.classList.add('completed');
            }
        });
    }

    function login(provider) {
        if (!termsAgreed) {
            var errEl = document.getElementById('shopTermsError');
            if (errEl) errEl.style.display = 'block';
            return;
        }
        isLoggedIn = true;
        var emailMap = {
            google: 'member@gmail.com',
            apple: 'member@icloud.com',
            email: 'member@rci.com'
        };
        profile.email = emailMap[provider] || 'member@rci.com';
        var emailInput = document.getElementById('shopEmail');
        if (emailInput) emailInput.value = profile.email;
        goToStep(2);
    }

    function loginWithPassword(event) {
        event.preventDefault();
        if (!termsAgreed) {
            var termsError = document.getElementById('shopTermsError');
            if (termsError) termsError.style.display = 'block';
            return;
        }
        if (!apiBase()) {
            setLoginError('API 地址尚未配置。');
            return;
        }

        var usernameInput = document.getElementById('shopLoginUsername');
        var passwordInput = document.getElementById('shopLoginPassword');
        var submitBtn = document.getElementById('shopLoginSubmitBtn');
        var username = usernameInput ? usernameInput.value.trim() : '';
        var password = passwordInput ? passwordInput.value : '';
        if (!username || !password) {
            setLoginError('请输入用户名和密码。');
            return;
        }

        setLoginError('');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '登录中...';
        }

        authRequest('/api/v1/login', {
            username: username,
            password: password
        }).then(function(data) {
            setMemberToken(data.idToken || '');
            setMemberAccessToken(data.accessToken || '');
            profile.email = data.user && data.user.email ? data.user.email : '';
            var emailInput = document.getElementById('shopEmail');
            if (emailInput && profile.email) emailInput.value = profile.email;
            if (passwordInput) passwordInput.value = '';
            isLoggedIn = true;
            goToStep(2);
        }).catch(function(error) {
            setMemberToken('');
            setMemberAccessToken('');
            setLoginError(error.message || '登录失败。');
        }).finally(function() {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '登录并继续';
            }
            updateLoginStatus();
        });
    }

    function registerWithEmail(event) {
        event.preventDefault();
        var emailInput = document.getElementById('shopRegisterEmail');
        var nameInput = document.getElementById('shopRegisterName');
        var passwordInput = document.getElementById('shopRegisterPassword');
        var submitBtn = document.getElementById('shopRegisterSubmitBtn');
        var email = emailInput ? emailInput.value.trim() : '';
        var name = nameInput ? nameInput.value.trim() : '';
        var password = passwordInput ? passwordInput.value : '';
        if (!email || !password) {
            setLoginError('请输入邮箱和密码。');
            return;
        }
        setLoginError('');
        setAuthSuccess('');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '发送中...';
        }
        authRequest('/api/v1/register', { email: email, name: name, password: password }).then(function() {
            setAuthSuccess('验证码已发送到邮箱，请输入验证码完成注册。');
        }).catch(function(error) {
            setLoginError(error.message || '注册失败。');
        }).finally(function() {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '发送邮箱验证码';
            }
        });
    }

    function confirmRegister() {
        var emailInput = document.getElementById('shopRegisterEmail');
        var codeInput = document.getElementById('shopRegisterCode');
        var email = emailInput ? emailInput.value.trim() : '';
        var code = codeInput ? codeInput.value.trim() : '';
        if (!email || !code) {
            setLoginError('请输入邮箱和验证码。');
            return;
        }
        setLoginError('');
        authRequest('/api/v1/register/confirm', { email: email, code: code }).then(function() {
            setAuthSuccess('注册完成，请使用 Email 登录。');
            switchAuthMode('login');
            var usernameInput = document.getElementById('shopLoginUsername');
            if (usernameInput) usernameInput.value = email;
        }).catch(function(error) {
            setLoginError(error.message || '邮箱验证失败。');
        });
    }

    function sendResetCode() {
        var emailInput = document.getElementById('shopResetEmail');
        var email = emailInput ? emailInput.value.trim() : '';
        if (!email) {
            setLoginError('请输入邮箱。');
            return;
        }
        setLoginError('');
        authRequest('/api/v1/password/forgot', { email: email }).then(function() {
            setAuthSuccess('重置验证码已发送到邮箱。');
        }).catch(function(error) {
            setLoginError(error.message || '发送重置验证码失败。');
        });
    }

    function resetPassword(event) {
        event.preventDefault();
        var emailInput = document.getElementById('shopResetEmail');
        var codeInput = document.getElementById('shopResetCode');
        var passwordInput = document.getElementById('shopResetPassword');
        var email = emailInput ? emailInput.value.trim() : '';
        var code = codeInput ? codeInput.value.trim() : '';
        var newPassword = passwordInput ? passwordInput.value : '';
        if (!email || !code || !newPassword) {
            setLoginError('请输入邮箱、验证码和新密码。');
            return;
        }
        setLoginError('');
        authRequest('/api/v1/password/reset', {
            email: email,
            code: code,
            newPassword: newPassword
        }).then(function() {
            setAuthSuccess('密码已重置，请重新登录。');
            switchAuthMode('login');
            var usernameInput = document.getElementById('shopLoginUsername');
            if (usernameInput) usernameInput.value = email;
        }).catch(function(error) {
            setLoginError(error.message || '重置密码失败。');
        });
    }

    function continueWithSavedLogin() {
        if (!termsAgreed) {
            var termsError = document.getElementById('shopTermsError');
            if (termsError) termsError.style.display = 'block';
            return;
        }
        if (!memberToken()) {
            updateLoginStatus();
            return;
        }
        isLoggedIn = true;
        goToStep(2);
    }

    function toggleTerms() {
        var cb = document.getElementById('shopTermsAgree');
        termsAgreed = cb ? cb.checked : false;
        var errEl = document.getElementById('shopTermsError');
        if (errEl && termsAgreed) errEl.style.display = 'none';
    }

    function validateInviteCode() {
        var input = document.getElementById('shopInviteCode');
        var code = input ? input.value.trim().toUpperCase() : '';
        var errEl = document.getElementById('shopInviteError');
        var sucEl = document.getElementById('shopInviteSuccess');

        if (VALID_INVITE_CODES.indexOf(code) !== -1) {
            inviteValid = true;
            if (errEl) errEl.style.display = 'none';
            if (sucEl) {
                var parentMap = {
                    'AGENT_B': 'AGENT_A'
                };
                var parent = parentMap[code] || 'MASTER';
                sucEl.textContent = '\u2713 ' + (typeof I18n !== 'undefined' && I18n.t ? I18n.t('shop.inviteValid') : 'Invite code valid · Parent agent: ') + parent;
                sucEl.style.display = 'block';
            }
        } else {
            inviteValid = false;
            if (sucEl) sucEl.style.display = 'none';
            if (errEl) {
                errEl.textContent = typeof I18n !== 'undefined' && I18n.t ? I18n.t('shop.inviteInvalid') : 'Invalid invite code';
                errEl.style.display = 'block';
            }
        }
        updateProfileSubmit();
    }

    function updateProfileSubmit() {
        var btn = document.getElementById('shopProfileSubmit');
        if (btn) btn.disabled = !inviteValid;
    }

    function submitProfile(e) {
        e.preventDefault();
        if (!inviteValid) return;

        var nameInput = document.getElementById('shopName');
        var idInput = document.getElementById('shopIdNumber');
        var phoneInput = document.getElementById('shopPhone');
        var emailInput = document.getElementById('shopEmail');
        var inviteInput = document.getElementById('shopInviteCode');
        var countryCodeInput = document.getElementById('shopCountryCode');

        profile.name = nameInput ? nameInput.value : '';
        profile.idNumber = idInput ? idInput.value : '';
        profile.countryCode = countryCodeInput ? countryCodeInput.value : '+86';
        profile.phone = (profile.countryCode + (phoneInput ? phoneInput.value : ''));
        profile.email = emailInput ? emailInput.value : '';
        profile.inviteCode = inviteInput ? inviteInput.value : '';

        goToStep(3);
    }

    function togglePurchase() {
        var cb = document.getElementById('shopPurchaseAgree');
        purchaseAgreed = cb ? cb.checked : false;
        updatePayBtn();
    }

    function updatePayBtn() {
        var btn = document.getElementById('shopPayBtn');
        if (btn) btn.disabled = !purchaseAgreed || isPaying;
    }

    function initiatePayment() {
        if (!purchaseAgreed || isPaying) return;
        isPaying = true;
        updatePayBtn();

        var btn = document.getElementById('shopPayBtn');
        if (btn) btn.textContent = typeof I18n !== 'undefined' && I18n.t ? I18n.t('shop.connecting') : 'Connecting to bank gateway...';

        setTimeout(function() {
            isPaying = false;
            updatePayBtn();
            if (btn) btn.textContent = typeof I18n !== 'undefined' && I18n.t ? I18n.t('shop.proceedToPay') : 'Proceed to Payment';
            show3ds();
        }, 1500);
    }

    function show3ds() {
        var modal = document.getElementById('shop3dsModal');
        if (modal) modal.style.display = 'flex';
    }

    function close3ds() {
        var modal = document.getElementById('shop3dsModal');
        if (modal) modal.style.display = 'none';
    }

    function sendSmsCode() {
        alert(typeof I18n !== 'undefined' && I18n.t ? I18n.t('shop.smsSent') : 'Verification code: 123456');
    }

    function complete3ds() {
        var verifyBtn = document.querySelector('.shop-3ds-actions .shop-btn-primary');
        if (verifyBtn) {
            verifyBtn.disabled = true;
            verifyBtn.textContent = '正在生成订单...';
        }

        createAndConfirmOrder().then(function() {
            close3ds();
            goToStep(4);
        }).catch(function(error) {
            alert(error.message || '订单生成失败，请联系顾问处理。');
        }).finally(function() {
            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.textContent = typeof I18n !== 'undefined' && I18n.t ? I18n.t('shop.verifyAndPay') : 'Verify and Pay';
            }
        });
    }

    function createAndConfirmOrder() {
        if (currentIntentId) {
            return memberRequest('/purchase/intents/' + encodeURIComponent(currentIntentId) + '/confirm', {
                method: 'POST'
            });
        }

        var note = [
            profile.name ? ('姓名：' + profile.name) : '',
            profile.phone ? ('电话：' + profile.phone) : '',
            profile.inviteCode ? ('邀请码：' + profile.inviteCode) : ''
        ].filter(Boolean).join('；');

        return memberRequest('/purchase/intents', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                productCode: 'DAMEISHA-MEMBERSHIP-5Y',
                quantity: 1,
                currency: 'USD',
                amount: 4980,
                note: note
            })
        }).then(function(intent) {
            currentIntentId = intent.intentId;
            return memberRequest('/purchase/intents/' + encodeURIComponent(currentIntentId) + '/confirm', {
                method: 'POST'
            });
        });
    }

    function reset() {
        currentStep = 1;
        isLoggedIn = false;
        termsAgreed = false;
        inviteValid = false;
        purchaseAgreed = false;
        isPaying = false;
        profile = {};
        currentIntentId = null;
    }

    return {
        reset: reset,
        goToStep: goToStep,
        prevStep: prevStep,
        login: login,
        loginWithPassword: loginWithPassword,
        registerWithEmail: registerWithEmail,
        confirmRegister: confirmRegister,
        sendResetCode: sendResetCode,
        resetPassword: resetPassword,
        continueWithSavedLogin: continueWithSavedLogin,
        switchAuthMode: switchAuthMode,
        socialLogin: socialLogin,
        toggleTerms: toggleTerms,
        validateInviteCode: validateInviteCode,
        submitProfile: submitProfile,
        togglePurchase: togglePurchase,
        initiatePayment: initiatePayment,
        complete3ds: complete3ds,
        sendSmsCode: sendSmsCode,
        close3ds: close3ds,
        generateCountryOptions: generateCountryOptions,
        updateLoginStatus: updateLoginStatus
    };
})();

PageInit.initShopPage = function(params) {
    ShopApp.reset();
    ShopApp.goToStep(1);
    ShopApp.generateCountryOptions();
    ShopApp.updateLoginStatus();

    var loginForm = document.getElementById('shopLoginForm');
    var registerForm = document.getElementById('shopRegisterForm');
    var resetForm = document.getElementById('shopResetForm');
    var confirmRegisterBtn = document.getElementById('shopConfirmRegisterBtn');
    var sendResetBtn = document.getElementById('shopSendResetBtn');
    if (loginForm) loginForm.addEventListener('submit', ShopApp.loginWithPassword);
    if (registerForm) registerForm.addEventListener('submit', ShopApp.registerWithEmail);
    if (resetForm) resetForm.addEventListener('submit', ShopApp.resetPassword);
    if (confirmRegisterBtn) confirmRegisterBtn.addEventListener('click', ShopApp.confirmRegister);
    if (sendResetBtn) sendResetBtn.addEventListener('click', ShopApp.sendResetCode);
    document.querySelectorAll('[data-shop-auth-mode]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            ShopApp.switchAuthMode(btn.getAttribute('data-shop-auth-mode') || 'login');
        });
    });

    var onLangChange = function() {
        if (typeof I18n !== 'undefined' && I18n.applyTranslations) {
            I18n.applyTranslations();
            ShopApp.generateCountryOptions();
            ShopApp.updateLoginStatus();
        }
    };
    document.addEventListener('languageChanged', onLangChange);
    return function() {
        document.removeEventListener('languageChanged', onLangChange);
        if (loginForm) loginForm.removeEventListener('submit', ShopApp.loginWithPassword);
        if (registerForm) registerForm.removeEventListener('submit', ShopApp.registerWithEmail);
        if (resetForm) resetForm.removeEventListener('submit', ShopApp.resetPassword);
        if (confirmRegisterBtn) confirmRegisterBtn.removeEventListener('click', ShopApp.confirmRegister);
        if (sendResetBtn) sendResetBtn.removeEventListener('click', ShopApp.sendResetCode);
    };
};

var AccountApp = (function() {
    var tokenKey = 'qx_member_token';
    var accessTokenKey = 'qx_member_access_token';
    var pageSize = 20;

    function apiBase() {
        return (typeof CONFIG !== 'undefined' && CONFIG.api && CONFIG.api.baseUrl) ? CONFIG.api.baseUrl : '';
    }

    function escape(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function token() {
        return String(localStorage.getItem(tokenKey) || '').replace(/\s+/g, '');
    }

    function accessToken() {
        return String(localStorage.getItem(accessTokenKey) || '').replace(/\s+/g, '');
    }

    function setToken(value) {
        var normalized = String(value || '').replace(/\s+/g, '');
        if (normalized) {
            localStorage.setItem(tokenKey, normalized);
        } else {
            localStorage.removeItem(tokenKey);
        }
    }

    function setAccessToken(value) {
        var normalized = String(value || '').replace(/\s+/g, '');
        if (normalized) {
            localStorage.setItem(accessTokenKey, normalized);
        } else {
            localStorage.removeItem(accessTokenKey);
        }
    }

    function showAlert(message) {
        var el = document.getElementById('accountAlert');
        if (!el) return;
        el.textContent = message;
        el.style.display = message ? 'block' : 'none';
    }

    function setStatus(message) {
        var el = document.getElementById('accountStatusText');
        if (el) el.textContent = message;
    }

    function setLoggedIn(loggedIn) {
        var loginPanel = document.getElementById('accountLoginPanel');
        var ordersPanel = document.getElementById('accountOrdersPanel');
        var logoutBtn = document.getElementById('accountLogoutBtn');
        if (loginPanel) loginPanel.style.display = loggedIn ? 'none' : 'block';
        if (ordersPanel) ordersPanel.style.display = loggedIn ? 'block' : 'none';
        if (logoutBtn) logoutBtn.style.display = loggedIn ? 'inline-flex' : 'none';
    }

    function renderProfile(data) {
        var el = document.getElementById('accountProfileList');
        if (!el) return;
        el.innerHTML = [
            '<div><span>用户 ID</span><strong>' + escape(data.userId || '-') + '</strong></div>',
            '<div><span>Email</span><strong>' + escape(data.email || '-') + '</strong></div>',
            '<div><span>登录方式</span><strong>' + escape((data.loginProviders || []).join(', ') || 'COGNITO') + '</strong></div>',
            '<div><span>最近登录</span><strong>' + escape(shortDate(data.lastLoginAt) || '-') + '</strong></div>'
        ].join('');
    }

    function request(path, options) {
        if (!apiBase()) {
            return Promise.reject(new Error('API 地址尚未配置。'));
        }
        var requestOptions = options || {};
        requestOptions.headers = Object.assign({
            Authorization: 'Bearer ' + token()
        }, requestOptions.headers || {});

        return fetch(apiBase() + path, requestOptions).then(function(response) {
            return response.json().catch(function() { return {}; }).then(function(body) {
                if (!response.ok) {
                    throw new Error(body.message || ('HTTP ' + response.status));
                }
                return body.data || body;
            });
        }).catch(function(error) {
            if (error && error.message === 'Failed to fetch') {
                throw new Error('请求失败：请检查网络连接或稍后重试。');
            }
            throw error;
        });
    }

    function login(username, password) {
        if (!apiBase()) {
            return Promise.reject(new Error('API 地址尚未配置。'));
        }
        return fetch(apiBase() + '/api/v1/login', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        }).then(function(response) {
            return response.json().catch(function() { return {}; }).then(function(body) {
                if (!response.ok) {
                    throw new Error(body.message || ('HTTP ' + response.status));
                }
                return body.data || body;
            });
        });
    }

    function statusLabel(value) {
        return {
            cooling_period: '冷静期',
            active: '激活中',
            completed: '已完成',
            refund_pending: '退款审核中',
            refunded: '已退款'
        }[value] || value || '';
    }

    function money(value, currency) {
        var n = Number(value || 0);
        return (currency || 'USD') + ' ' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function shortDate(value) {
        if (!value) return '';
        var d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleString();
    }

    function renderOrders(data) {
        var wrap = document.getElementById('accountOrders');
        if (!wrap) return;
        var orders = data.items || data.list || [];
        if (!orders.length) {
            wrap.innerHTML = '<p class="account-empty">暂无订单。</p>';
            setStatus('共 0 笔订单');
            return;
        }

        wrap.innerHTML = orders.map(function(order) {
            var refundForm = '';
            if (order.status === 'cooling_period') {
                refundForm =
                    '<div class="account-refund-box" style="display:none;" data-refund-panel="' + escape(order.orderId) + '">' +
                    '<textarea data-refund-reason="' + escape(order.orderId) + '" rows="2" placeholder="退款原因（选填）"></textarea>' +
                    '<button class="account-danger-btn" type="button" data-refund-order-id="' + escape(order.orderId) + '">申请退款</button>' +
                    '</div>';
            } else if (order.status === 'refund_pending') {
                refundForm = '<p class="account-muted">退款申请已提交，等待管理员审核。</p>';
            }

            return '<article class="account-order-card">' +
                '<div class="account-order-main">' +
                '<div><span>订单 ID</span><strong>' + escape(order.orderId) + '</strong></div>' +
                '<div><span>状态</span><strong>' + escape(statusLabel(order.status)) + '</strong></div>' +
                '<div><span>金额</span><strong>' + escape(money(order.amount, order.currency)) + '</strong></div>' +
                '<div><span>创建时间</span><strong>' + escape(shortDate(order.createdAt)) + '</strong></div>' +
                '</div>' +
                '<button class="account-order-toggle" type="button" data-order-toggle="' + escape(order.orderId) + '">查看详情</button>' +
                '<div class="account-order-detail" style="display:none;" data-order-detail="' + escape(order.orderId) + '">' +
                '<div><span>购买意向 ID</span><strong>' + escape(order.sourceIntentId || '-') + '</strong></div>' +
                '<div><span>更新时间</span><strong>' + escape(shortDate(order.updatedAt)) + '</strong></div>' +
                '</div>' +
                refundForm +
                '</article>';
        }).join('');

        setStatus('共 ' + (data.total || orders.length) + ' 笔订单');
        bindOrderToggles();
        bindRefundButtons();
    }

    function bindOrderToggles() {
        document.querySelectorAll('[data-order-toggle]').forEach(function(btn) {
            if (btn.getAttribute('data-bound') === 'true') return;
            btn.setAttribute('data-bound', 'true');
            btn.addEventListener('click', function() {
                var orderId = btn.getAttribute('data-order-toggle');
                var detail = document.querySelector('[data-order-detail="' + orderId + '"]');
                var refund = document.querySelector('[data-refund-panel="' + orderId + '"]');
                var isOpen = detail && detail.style.display !== 'none';
                if (detail) detail.style.display = isOpen ? 'none' : 'grid';
                if (refund) refund.style.display = isOpen ? 'none' : 'grid';
                btn.textContent = isOpen ? '查看详情' : '收起详情';
            });
        });
    }

    function loadOrders() {
        showAlert('');
        setLoggedIn(true);
        setStatus('正在加载订单...');
        return Promise.all([
            request('/me'),
            request('/orders?page=1&pageSize=' + pageSize)
        ]).then(function(results) {
            renderProfile(results[0]);
            renderOrders(results[1]);
        }).catch(function(error) {
            if ((error.message || '').indexOf('Unauthorized') !== -1) {
                setToken('');
                setAccessToken('');
                setLoggedIn(false);
                showAlert('登录已失效，请重新登录。');
                return;
            }
            showAlert(error.message || '订单加载失败。');
            setStatus('订单加载失败');
        });
    }

    function requestRefund(orderId) {
        var reason = document.querySelector('[data-refund-reason="' + orderId + '"]');
        showAlert('');
        setStatus('正在提交退款申请...');
        return request('/orders/' + encodeURIComponent(orderId) + '/refunds', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                reason: reason ? reason.value.trim() : ''
            })
        }).then(function() {
            setStatus('退款申请已提交，等待管理员审核。');
            return loadOrders();
        }).catch(function(error) {
            showAlert(error.message || '退款申请提交失败。');
            setStatus('退款申请提交失败');
        });
    }

    function changePassword(event) {
        event.preventDefault();
        var oldInput = document.getElementById('accountOldPasswordInput');
        var newInput = document.getElementById('accountNewPasswordInput');
        var btn = document.getElementById('accountPasswordBtn');
        var previousPassword = oldInput ? oldInput.value : '';
        var newPassword = newInput ? newInput.value : '';
        if (!previousPassword || !newPassword) {
            showAlert('请输入原密码和新密码。');
            return;
        }
        if (!accessToken()) {
            showAlert('请重新登录后再修改密码。');
            return;
        }
        showAlert('');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '修改中...';
        }
        request('/api/v1/password/change', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                previousPassword: previousPassword,
                newPassword: newPassword,
                accessToken: accessToken()
            })
        }).then(function() {
            if (oldInput) oldInput.value = '';
            if (newInput) newInput.value = '';
            setStatus('密码已修改。');
        }).catch(function(error) {
            showAlert(error.message || '修改密码失败。');
        }).finally(function() {
            if (btn) {
                btn.disabled = false;
                btn.textContent = '修改密码';
            }
        });
    }

    function bindRefundButtons() {
        document.querySelectorAll('[data-refund-order-id]').forEach(function(btn) {
            if (btn.getAttribute('data-bound') === 'true') return;
            btn.setAttribute('data-bound', 'true');
            btn.addEventListener('click', function() {
                var orderId = btn.getAttribute('data-refund-order-id');
                if (!orderId) return;
                btn.disabled = true;
                requestRefund(orderId).finally(function() {
                    btn.disabled = false;
                });
            });
        });
    }

    function init() {
        var form = document.getElementById('accountLoginForm');
        var usernameInput = document.getElementById('accountUsernameInput');
        var passwordInput = document.getElementById('accountPasswordInput');
        var loginBtn = document.getElementById('accountLoginBtn');
        var refreshBtn = document.getElementById('accountRefreshBtn');
        var logoutBtn = document.getElementById('accountLogoutBtn');
        var passwordForm = document.getElementById('accountPasswordForm');

        if (form) {
            form.addEventListener('submit', function(event) {
                event.preventDefault();
                var username = usernameInput ? usernameInput.value.trim() : '';
                var password = passwordInput ? passwordInput.value : '';
                if (!username || !password) {
                    showAlert('请输入用户名和密码。');
                    return;
                }
                showAlert('');
                if (loginBtn) {
                    loginBtn.disabled = true;
                    loginBtn.textContent = '登录中...';
                }
                login(username, password).then(function(data) {
                    setToken(data.idToken || '');
                    setAccessToken(data.accessToken || '');
                    if (passwordInput) passwordInput.value = '';
                    return loadOrders();
                }).catch(function(error) {
                    setToken('');
                    setAccessToken('');
                    setLoggedIn(false);
                    showAlert(error.message || '登录失败。');
                }).finally(function() {
                    if (loginBtn) {
                        loginBtn.disabled = false;
                        loginBtn.textContent = '登录';
                    }
                });
            });
        }

        if (refreshBtn) refreshBtn.addEventListener('click', loadOrders);
        if (passwordForm) passwordForm.addEventListener('submit', changePassword);
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                setToken('');
                setAccessToken('');
                setLoggedIn(false);
                showAlert('');
            });
        }

        if (token()) {
            loadOrders();
        } else {
            setLoggedIn(false);
        }
    }

    return {
        init: init
    };
})();

PageInit.initAccountPage = function() {
    AccountApp.init();
};
