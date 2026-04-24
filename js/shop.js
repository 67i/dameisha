var ShopApp = (function() {
    var currentStep = 1;
    var isLoggedIn = false;
    var termsAgreed = false;
    var inviteValid = false;
    var purchaseAgreed = false;
    var isPaying = false;
    var profile = {};

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
        close3ds();
        goToStep(4);
    }

    function reset() {
        currentStep = 1;
        isLoggedIn = false;
        termsAgreed = false;
        inviteValid = false;
        purchaseAgreed = false;
        isPaying = false;
        profile = {};
    }

    return {
        reset: reset,
        goToStep: goToStep,
        prevStep: prevStep,
        login: login,
        toggleTerms: toggleTerms,
        validateInviteCode: validateInviteCode,
        submitProfile: submitProfile,
        togglePurchase: togglePurchase,
        initiatePayment: initiatePayment,
        complete3ds: complete3ds,
        sendSmsCode: sendSmsCode,
        close3ds: close3ds,
        generateCountryOptions: generateCountryOptions
    };
})();

PageInit.initShopPage = function(params) {
    ShopApp.reset();
    ShopApp.goToStep(1);
    ShopApp.generateCountryOptions();

    var onLangChange = function() {
        if (typeof I18n !== 'undefined' && I18n.applyTranslations) {
            I18n.applyTranslations();
            ShopApp.generateCountryOptions();
        }
    };
    document.addEventListener('languageChanged', onLangChange);
    return function() { document.removeEventListener('languageChanged', onLangChange); };
};
