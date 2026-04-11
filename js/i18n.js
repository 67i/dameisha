/**
 * i18n Internationalization Module
 * Supports: English, Chinese, Korean, Japanese
 * Default language: English
 */

const I18n = {
    currentLang: 'en',
    translations: {},
    
    supportedLangs: ['en', 'zh', 'ko', 'ja'],
    
    async init() {
        const savedLang = localStorage.getItem('lang');
        if (savedLang && this.supportedLangs.includes(savedLang)) {
            this.currentLang = savedLang;
        }
        
        await this.loadTranslations(this.currentLang);
        this.applyTranslations();
        this.updateLangButtons();
        
        this.bindEvents();
        this.initMobileMenu();
        
        document.dispatchEvent(new CustomEvent('i18nReady', { 
            detail: { language: this.currentLang } 
        }));
    },
    
    async loadTranslations(lang) {
        try {
            const response = await fetch(`./js/locales/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load ${lang} translations`);
            }
            this.translations = await response.json();
        } catch (error) {
            console.error('Error loading translations:', error);
            if (lang !== 'en') {
                await this.loadTranslations('en');
            }
        }
    },
    
    get(key) {
        const keys = key.split('.');
        let value = this.translations;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
        }
        
        return typeof value === 'string' ? value : key;
    },
    
    applyTranslations() {
        const elements = document.querySelectorAll('[data-i18n]');
        
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.get(key);
            
            if (translation && translation !== key) {
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    if (element.hasAttribute('placeholder')) {
                        element.setAttribute('placeholder', translation);
                    } else {
                        element.value = translation;
                    }
                } else {
                    if (translation.includes('<br>')) {
                        const safeHtml = translation
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&#039;')
                            .replace(/&lt;br&gt;/gi, '<br>');
                        element.innerHTML = safeHtml;
                    } else {
                        element.textContent = translation;
                    }
                }
            }
        });
        
        const altElements = document.querySelectorAll('[data-i18n-alt]');
        altElements.forEach(element => {
            const key = element.getAttribute('data-i18n-alt');
            const translation = this.get(key);
            if (translation && translation !== key) {
                element.setAttribute('alt', translation);
            }
        });
        
        document.documentElement.lang = this.currentLang;
    },
    
    async switchLanguage(lang) {
        if (!this.supportedLangs.includes(lang) || lang === this.currentLang) {
            return;
        }
        
        this.currentLang = lang;
        localStorage.setItem('lang', lang);
        
        await this.loadTranslations(lang);
        this.applyTranslations();
        this.updateLangButtons();
        
        document.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: lang } 
        }));
    },
    
    updateLangButtons() {
        const buttons = document.querySelectorAll('.lang-btn, .mobile-lang-btn');
        buttons.forEach(btn => {
            const btnLang = btn.getAttribute('data-lang');
            if (btnLang === this.currentLang) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },
    
    bindEvents() {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = btn.getAttribute('data-lang');
                this.switchLanguage(lang);
            });
        });
        
        document.querySelectorAll('.mobile-lang-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = btn.getAttribute('data-lang');
                this.switchLanguage(lang);
            });
        });
    },
    
    initMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenuBtn.classList.toggle('active');
                mobileMenu.classList.toggle('active');
            });
            
            document.addEventListener('click', (e) => {
                if (!mobileMenuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                    mobileMenuBtn.classList.remove('active');
                    mobileMenu.classList.remove('active');
                }
            });
            
            mobileMenu.querySelectorAll('.mobile-menu-link').forEach(link => {
                link.addEventListener('click', () => {
                    mobileMenuBtn.classList.remove('active');
                    mobileMenu.classList.remove('active');
                });
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    I18n.init();
});

window.I18n = I18n;
