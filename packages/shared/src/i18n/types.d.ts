export type Language = 'en' | 'ko' | 'es' | 'fr' | 'de' | 'ja' | 'zh-CN' | 'zh-TW' | 'ru' | 'pt' | 'it' | 'vi' | 'th' | 'id' | 'hi' | 'ar' | 'tr' | 'pl' | 'nl' | 'el' | 'sv' | 'fi' | 'da' | 'no' | 'uk' | 'hu' | 'cs' | 'ro' | 'he' | 'ms' | 'bn' | 'pa' | 'jv' | 'te' | 'mr' | 'ta' | 'ur' | 'gu' | 'kn' | 'ml' | 'or' | 'my' | 'km' | 'lo' | 'am' | 'ti' | 'om' | 'so' | 'sw' | 'yo' | 'ig' | 'ha' | 'zu' | 'xh' | 'af' | 'ka' | 'hy' | 'az' | 'kk' | 'uz' | 'tg' | 'tk' | 'ky' | 'mn' | 'ps' | 'fa' | 'sd' | 'ne' | 'si' | 'dz' | 'as' | 'et' | 'lv' | 'lt' | 'sl' | 'hr' | 'bs' | 'sr' | 'mk' | 'bg' | 'sq' | 'is' | 'ga' | 'cy' | 'gd' | 'mt' | 'eu' | 'ca' | 'gl' | 'eo' | 'sk' | 'be' | 'uz-Cyrl' | 'kk-Cyrl' | 'sr-Latn' | 'pt-BR' | 'es-419';
export declare const SUPPORTED_LANGUAGES: {
    code: Language;
    name: string;
    nativeName: string;
}[];
export type TranslationMap = Record<string, any>;
