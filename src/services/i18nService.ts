/**
 * Internationalization (i18n) Service
 * 
 * Manages multi-language support including translation,
 * locale formatting, and language preferences.
 */

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'it' | 'ja' | 'ko' | 'zh' | 'ar';
export type TextDirection = 'ltr' | 'rtl';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  direction: TextDirection;
  flag: string;
  enabled: boolean;
}

export interface LocaleSettings {
  language: SupportedLanguage;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  numberFormat: 'comma' | 'period' | 'space';
  firstDayOfWeek: 0 | 1; // 0 = Sunday, 1 = Monday
}

export interface TranslationStats {
  totalKeys: number;
  translatedKeys: number;
  completionPercentage: number;
  lastUpdated: string;
}

class I18nService {
  private currentLanguage: SupportedLanguage = 'en';
  private translations: Record<SupportedLanguage, Record<string, string>> = {
    en: {},
    es: {},
    fr: {},
    de: {},
    it: {},
    ja: {},
    ko: {},
    zh: {},
    ar: {},
  };

  /**
   * Get all supported languages
   */
  async getSupportedLanguages(): Promise<LanguageInfo[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        direction: 'ltr',
        flag: '🇺🇸',
        enabled: true,
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        direction: 'ltr',
        flag: '🇪🇸',
        enabled: true,
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        direction: 'ltr',
        flag: '🇫🇷',
        enabled: true,
      },
      {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        direction: 'ltr',
        flag: '🇩🇪',
        enabled: true,
      },
      {
        code: 'it',
        name: 'Italian',
        nativeName: 'Italiano',
        direction: 'ltr',
        flag: '🇮🇹',
        enabled: true,
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        direction: 'ltr',
        flag: '🇯🇵',
        enabled: true,
      },
      {
        code: 'ko',
        name: 'Korean',
        nativeName: '한국어',
        direction: 'ltr',
        flag: '🇰🇷',
        enabled: true,
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        direction: 'ltr',
        flag: '🇨🇳',
        enabled: true,
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        direction: 'rtl',
        flag: '🇸🇦',
        enabled: true,
      },
    ];
  }

  /**
   * Get current language
   */
  async getCurrentLanguage(): Promise<SupportedLanguage> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.currentLanguage;
  }

  /**
   * Set language
   */
  async setLanguage(language: SupportedLanguage): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    this.currentLanguage = language;
    // In real app: save to AsyncStorage and reload translations
  }

  /**
   * Get locale settings
   */
  async getLocaleSettings(): Promise<LocaleSettings> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const localeDefaults: Record<SupportedLanguage, LocaleSettings> = {
      en: {
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        currency: 'USD',
        numberFormat: 'comma',
        firstDayOfWeek: 0,
      },
      es: {
        language: 'es',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        currency: 'EUR',
        numberFormat: 'period',
        firstDayOfWeek: 1,
      },
      fr: {
        language: 'fr',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        currency: 'EUR',
        numberFormat: 'space',
        firstDayOfWeek: 1,
      },
      de: {
        language: 'de',
        dateFormat: 'DD.MM.YYYY',
        timeFormat: '24h',
        currency: 'EUR',
        numberFormat: 'period',
        firstDayOfWeek: 1,
      },
      it: {
        language: 'it',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        currency: 'EUR',
        numberFormat: 'period',
        firstDayOfWeek: 1,
      },
      ja: {
        language: 'ja',
        dateFormat: 'YYYY/MM/DD',
        timeFormat: '24h',
        currency: 'JPY',
        numberFormat: 'comma',
        firstDayOfWeek: 0,
      },
      ko: {
        language: 'ko',
        dateFormat: 'YYYY.MM.DD',
        timeFormat: '12h',
        currency: 'KRW',
        numberFormat: 'comma',
        firstDayOfWeek: 0,
      },
      zh: {
        language: 'zh',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
        currency: 'CNY',
        numberFormat: 'comma',
        firstDayOfWeek: 1,
      },
      ar: {
        language: 'ar',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        currency: 'SAR',
        numberFormat: 'comma',
        firstDayOfWeek: 6,
      },
    };

    return localeDefaults[this.currentLanguage];
  }

  /**
   * Update locale settings
   */
  async updateLocaleSettings(settings: Partial<LocaleSettings>): Promise<LocaleSettings> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const current = await this.getLocaleSettings();
    return { ...current, ...settings };
  }

  /**
   * Translate text
   */
  async translate(key: string, params?: Record<string, string>): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 50));

    // Mock translations for common keys
    const mockTranslations: Record<string, Record<SupportedLanguage, string>> = {
      'app.name': {
        en: '33 Trends',
        es: '33 Trends',
        fr: '33 Trends',
        de: '33 Trends',
        it: '33 Trends',
        ja: '33 Trends',
        ko: '33 Trends',
        zh: '33 Trends',
        ar: '33 Trends',
      },
      'common.welcome': {
        en: 'Welcome',
        es: 'Bienvenido',
        fr: 'Bienvenue',
        de: 'Willkommen',
        it: 'Benvenuto',
        ja: 'ようこそ',
        ko: '환영합니다',
        zh: '欢迎',
        ar: 'مرحبا',
      },
      'common.save': {
        en: 'Save',
        es: 'Guardar',
        fr: 'Enregistrer',
        de: 'Speichern',
        it: 'Salva',
        ja: '保存',
        ko: '저장',
        zh: '保存',
        ar: 'حفظ',
      },
      'common.cancel': {
        en: 'Cancel',
        es: 'Cancelar',
        fr: 'Annuler',
        de: 'Abbrechen',
        it: 'Annulla',
        ja: 'キャンセル',
        ko: '취소',
        zh: '取消',
        ar: 'إلغاء',
      },
      'wardrobe.title': {
        en: 'My Wardrobe',
        es: 'Mi Armario',
        fr: 'Ma Garde-robe',
        de: 'Meine Garderobe',
        it: 'Il Mio Guardaroba',
        ja: 'マイワードローブ',
        ko: '내 옷장',
        zh: '我的衣橱',
        ar: 'خزانة ملابسي',
      },
    };

    const translation = mockTranslations[key]?.[this.currentLanguage] || key;

    // Replace parameters
    if (params) {
      let result = translation;
      Object.entries(params).forEach(([param, value]) => {
        result = result.replace(`{{${param}}}`, value);
      });
      return result;
    }

    return translation;
  }

  /**
   * Format date according to locale
   */
  async formatDate(date: Date, format?: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 50));

    const settings = await this.getLocaleSettings();
    const dateFormat = format || settings.dateFormat;

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return dateFormat
      .replace('DD', day)
      .replace('MM', month)
      .replace('YYYY', year.toString());
  }

  /**
   * Format number according to locale
   */
  async formatNumber(num: number): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 50));

    const settings = await this.getLocaleSettings();
    const parts = num.toString().split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    let formatted = '';
    for (let i = integerPart.length - 1, count = 0; i >= 0; i--, count++) {
      if (count > 0 && count % 3 === 0) {
        formatted = (settings.numberFormat === 'comma' ? ',' : 
                     settings.numberFormat === 'period' ? '.' : ' ') + formatted;
      }
      formatted = integerPart[i] + formatted;
    }

    if (decimalPart) {
      const decimalSeparator = settings.numberFormat === 'comma' ? '.' : ',';
      formatted += decimalSeparator + decimalPart;
    }

    return formatted;
  }

  /**
   * Format currency according to locale
   */
  async formatCurrency(amount: number): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 50));

    const settings = await this.getLocaleSettings();
    const formatted = await this.formatNumber(amount);

    const currencySymbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CNY: '¥',
      KRW: '₩',
      SAR: 'ر.س',
    };

    const symbol = currencySymbols[settings.currency] || settings.currency;

    // Different currencies have different positioning
    if (settings.currency === 'EUR') {
      return `${formatted} ${symbol}`;
    } else if (settings.currency === 'SAR') {
      return `${symbol} ${formatted}`;
    } else {
      return `${symbol}${formatted}`;
    }
  }

  /**
   * Get translation stats
   */
  async getTranslationStats(language: SupportedLanguage): Promise<TranslationStats> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const stats: Record<SupportedLanguage, TranslationStats> = {
      en: {
        totalKeys: 500,
        translatedKeys: 500,
        completionPercentage: 100,
        lastUpdated: new Date().toISOString(),
      },
      es: {
        totalKeys: 500,
        translatedKeys: 485,
        completionPercentage: 97,
        lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      fr: {
        totalKeys: 500,
        translatedKeys: 480,
        completionPercentage: 96,
        lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      de: {
        totalKeys: 500,
        translatedKeys: 475,
        completionPercentage: 95,
        lastUpdated: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      it: {
        totalKeys: 500,
        translatedKeys: 465,
        completionPercentage: 93,
        lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      ja: {
        totalKeys: 500,
        translatedKeys: 450,
        completionPercentage: 90,
        lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      ko: {
        totalKeys: 500,
        translatedKeys: 440,
        completionPercentage: 88,
        lastUpdated: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      },
      zh: {
        totalKeys: 500,
        translatedKeys: 430,
        completionPercentage: 86,
        lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      ar: {
        totalKeys: 500,
        translatedKeys: 420,
        completionPercentage: 84,
        lastUpdated: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };

    return stats[language];
  }

  /**
   * Detect device language
   */
  async detectDeviceLanguage(): Promise<SupportedLanguage> {
    await new Promise(resolve => setTimeout(resolve, 100));
    // In real app: use Platform.OS and NativeModules to detect
    return 'en';
  }

  /**
   * Get text direction for language
   */
  getTextDirection(language: SupportedLanguage): TextDirection {
    return language === 'ar' ? 'rtl' : 'ltr';
  }

  /**
   * Check if language is RTL
   */
  isRTL(language: SupportedLanguage): boolean {
    return this.getTextDirection(language) === 'rtl';
  }

  /**
   * Get language name in native language
   */
  async getLanguageNativeName(language: SupportedLanguage): Promise<string> {
    const languages = await this.getSupportedLanguages();
    return languages.find(l => l.code === language)?.nativeName || language;
  }

  /**
   * Export translations for offline use
   */
  async exportTranslations(language: SupportedLanguage): Promise<Record<string, string>> {
    await new Promise(resolve => setTimeout(resolve, 600));
    return this.translations[language];
  }

  /**
   * Import custom translations
   */
  async importTranslations(
    language: SupportedLanguage,
    translations: Record<string, string>
  ): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    this.translations[language] = { ...this.translations[language], ...translations };
  }
}

export const i18nService = new I18nService();
