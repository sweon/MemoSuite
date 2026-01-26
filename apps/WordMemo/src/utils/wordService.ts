export interface WordEntry {
    word: string;
    meaning: string;
    meaning_ko?: string;
    examples?: string[];
    example_ko?: string;
}

const DICTIONARY_API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

export const translateToKorean = async (text: string): Promise<string | null> => {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        if (data && data[0] && data[0][0] && data[0][0][0]) {
            return data[0].map((part: any) => part[0]).join('');
        }
    } catch (e) {
        console.error("Translation error:", e);
    }
    return null;
};

const getPrompt = (level: number): string => {
    const levels = {
        1: "Beginner (Common daily words and simple phrases)",
        2: "Intermediate (Useful vocabulary for conversation and general reading)",
        3: "Advanced (Academic, professional, or complex literary terms)"
    };
    const levelStr = levels[level as keyof typeof levels] || levels[2];

    return `Please recommend one English word or idiom for a user at the following level: ${levelStr}.
The response must be in JSON format:
{
  "word": "the word or idiom",
  "meaning": "simple English definition",
  "meaning_ko": "Korean translation of the definition",
  "examples": ["one natural example sentence in English"],
  "example_ko": "Korean translation of the example sentence"
}
Only return the JSON.`;
};

export const fetchRandomWord = async (level: number = 1): Promise<WordEntry | null> => {
    try {
        // @ts-ignore - window.ai is experimental
        const ai = (window as any).ai || (window as any).model;
        const lm = ai?.languageModel || ai?.assistant;

        if (!lm) {
            throw new Error('AI Language Model API not found. Please check chrome://flags');
        }

        // Check capabilities if available
        if (lm.capabilities) {
            const capabilities = await lm.capabilities();
            console.log("AI Capabilities:", capabilities);
            if (capabilities.available === 'no') {
                throw new Error('AI Model is not supported on this device/browser version.');
            }
            if (capabilities.available === 'after-download') {
                throw new Error('AI Model is still downloading. Please wait a few minutes and try again.');
            }
        }

        const prompt = getPrompt(level);
        const session = await lm.create();
        const text = await session.prompt(prompt);

        console.log("AI Response:", text);

        let data;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            data = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        } catch (parseError) {
            console.error("Failed to parse AI response:", text);
            throw new Error('Invalid AI response format');
        }

        return {
            word: data.word,
            meaning: data.meaning,
            meaning_ko: data.meaning_ko,
            examples: data.examples || [],
            example_ko: data.example_ko
        };
    } catch (e) {
        console.error("Gemini Nano error:", e);
        return null;
    }
};

// Kept for compatibility but now attempts to fetch from API if not found (though context is usually random word)
export const getExampleByWord = async (word: string): Promise<{ en: string, ko?: string } | null> => {
    try {
        const defRes = await fetch(`${DICTIONARY_API_BASE}${word}`);
        if (!defRes.ok) return null;
        const defData = await defRes.json();

        const candidates: string[] = [];

        if (Array.isArray(defData) && defData.length > 0) {
            for (const entry of defData) {
                for (const meaning of entry.meanings || []) {
                    for (const def of meaning.definitions || []) {
                        if (def.example) {
                            candidates.push(def.example);
                        }
                    }
                }
            }
        }

        if (candidates.length === 0) return null;

        // Score candidates to find the "best" one
        candidates.sort((a, b) => {
            const getScore = (str: string) => {
                let score = 0;
                if (str.length >= 30) score += 20;
                if (str.length <= 150) score += 10;
                else score -= 10;
                if (/^[A-Z]/.test(str)) score += 5;
                if (/[.!?]$/.test(str)) score += 5;
                if (!str.includes('  ')) score += 1;
                return score;
            };
            return getScore(b) - getScore(a);
        });

        const bestExample = candidates[0];
        const ko = await translateToKorean(bestExample);
        return { en: bestExample, ko: ko || undefined };

    } catch (e) {
        console.error(e);
    }
    return null;
};
