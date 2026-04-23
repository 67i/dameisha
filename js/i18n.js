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
        await this.loadTranslations('en');
        this.applyTranslations();
        this.updateLangButtons();
        
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
            const allowHtml = element.hasAttribute('data-i18n-html');
            
            if (translation && translation !== key) {
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    if (element.hasAttribute('placeholder')) {
                        element.setAttribute('placeholder', translation);
                    } else {
                        element.value = translation;
                    }
                } else if (element.tagName === 'TITLE') {
                    document.title = translation;
                } else {
                    if (allowHtml || (translation && translation.includes('<br>'))) {
                        let safeHtml = translation;
                        if (allowHtml) {
                            safeHtml = translation
                                .replace(/&amp;/g, '&')
                                .replace(/&lt;/g, '<')
                                .replace(/&gt;/g, '>')
                                .replace(/&quot;/g, '"')
                                .replace(/&#039;/g, "'");
                        } else {
                            safeHtml = translation
                                .replace(/&/g, '&amp;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;')
                                .replace(/"/g, '&quot;')
                                .replace(/'/g, '&#039;')
                                .replace(/&lt;br&gt;/gi, '<br>');
                        }
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
    
};

document.addEventListener('DOMContentLoaded', () => {
    I18n.init();
});

window.I18n = I18n;
