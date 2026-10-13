import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hi';
export type TextSize = 'small' | 'normal' | 'large';

export type ThemeMode = 'dark' | 'light';

interface UIPreferencesContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  textSize: TextSize;
  increaseTextSize: () => void;
  decreaseTextSize: () => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  t: (key: string) => string;
}

const UIPreferencesContext = createContext<UIPreferencesContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav entries
    'nav.home': 'Home',
    'nav.overview': 'Overview',
    'nav.playground': 'Playground',
    'nav.honeytokens': 'Honey Tokens',
    'nav.scanhistory': 'Scan History',
    'nav.securityactivity': 'Security Activity',
    'nav.brain': 'Brain',
    'nav.howitworks': 'How It Works',
    'nav.userguide': 'User Guide',

    // Top bar
    'topbar.signout': 'Sign Out',
    'topbar.language': 'Language',
    'topbar.textsize': 'Text Size',
    'topbar.activealerts': 'Active Alerts',
    'topbar.cybermode': 'Dark Navy',
    'topbar.lightmode': 'Light Mode',

    // Common CTAs
    'cta.checkmessage': 'Check a message',
    'cta.learnhow': 'Learn how it works',
    'cta.tryityourself': 'Try It Yourself',
    'cta.runtest': 'Run Security Test',
    'cta.clear': 'Clear',
    'cta.copy': 'Copy',
    'cta.refresh': 'Refresh',

    // Home
    'home.heading': "Test your AI's security.",
    'home.subheading': 'AgentSentry is an AI agent security platform and SOC that inspects prompts, neutralizes prompt injection attacks, detects canary honey token exfiltration, and enforces runtime tool boundaries in real time.',
    'home.totalscans': 'Total Scans',
    'home.activetokens': 'Active Tokens',
    'home.blockedattempts': 'Blocked Attempts',
    'home.riskscoreavg': 'Risk Score (Avg)',
    'home.systemoverview': 'System Overview Diagram',
    'home.recentactivity': 'Recent Security Activity',
    'home.policybreakdown': 'Firewall Policy Breakdown',
    'home.quickactions': 'Quick Actions',

    // Brain
    'brain.title': 'The Brain',
    'brain.subtitle': 'Our AI brain analyzes, detects and protects your AI.',

    // User Guide
    'guide.title': 'User Guide',
    'guide.subtitle': 'Learn how AgentSentry protects your AI applications from adversarial attacks in four easy steps.',
  },
  hi: {
    // Nav entries
    'nav.home': 'होम',
    'nav.overview': 'अवलोकन',
    'nav.playground': 'प्लेग्राउंड',
    'nav.honeytokens': 'हनी टोकन्स',
    'nav.scanhistory': 'स्कैन इतिहास',
    'nav.securityactivity': 'सुरक्षा गतिविधि',
    'nav.brain': 'द ब्रेन',
    'nav.howitworks': 'यह कैसे काम करता है',
    'nav.userguide': 'उपयोगकर्ता गाइड',

    // Top bar
    'topbar.signout': 'लॉग आउट',
    'topbar.language': 'भाषा',
    'topbar.textsize': 'अक्षर आकार',
    'topbar.activealerts': 'सक्रिय चेतावनियां',
    'topbar.cybermode': 'डार्क नेवी',
    'topbar.lightmode': 'लाइट मोड',

    // Common CTAs
    'cta.checkmessage': 'संदेश जांचें',
    'cta.learnhow': 'यह कैसे काम करता है',
    'cta.tryityourself': 'स्वयं प्रयास करें',
    'cta.runtest': 'सुरक्षा परीक्षण चलाएं',
    'cta.clear': 'साफ़ करें',
    'cta.copy': 'कॉपी करें',
    'cta.refresh': 'रिफ्रेश करें',

    // Home
    'home.heading': 'अपने एआई की सुरक्षा की जांच करें।',
    'home.subheading': 'AgentSentry एक AI एजेंट सुरक्षा प्लेटफॉर्म और SOC है जो संकेतों का निरीक्षण करता है, प्रॉम्प्ट इंजेक्शन हमलों को रोकता है, और टूल सीमाओं को लागू करता है।',
    'home.totalscans': 'कुल स्कैन',
    'home.activetokens': 'सक्रिय टोकन',
    'home.blockedattempts': 'अवरुद्ध प्रयास',
    'home.riskscoreavg': 'औसत जोखिम स्कोर',
    'home.systemoverview': 'सिस्टम अवलोकन आरेख',
    'home.recentactivity': 'हालिया सुरक्षा गतिविधि',
    'home.policybreakdown': 'फ़ायरवॉल नीति विवरण',
    'home.quickactions': 'त्वरित कार्रवाइयां',

    // Brain
    'brain.title': 'द ब्रेन',
    'brain.subtitle': 'हमारा AI मस्तिष्क आपके AI का विश्लेषण, पता लगाने और सुरक्षा करने का काम करता है।',

    // User Guide
    'guide.title': 'उपयोगकर्ता गाइड',
    'guide.subtitle': 'चार आसान चरणों में जानें कि AgentSentry आपके AI अनुप्रयोगों को कैसे सुरक्षित रखता है।',
  },
};

export const UIPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      return (localStorage.getItem('agentsentry_lang') as Language) || 'en';
    } catch {
      return 'en';
    }
  });

  const [textSize, setTextSizeState] = useState<TextSize>(() => {
    try {
      return (localStorage.getItem('agentsentry_text_size') as TextSize) || 'small';
    } catch {
      return 'small';
    }
  });

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      return (localStorage.getItem('agentsentry_theme') as ThemeMode) || 'dark';
    } catch {
      return 'dark';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('agentsentry_lang', lang);
    } catch (e) {
      // ignore
    }
  };

  const setTextSize = (size: TextSize) => {
    setTextSizeState(size);
    try {
      localStorage.setItem('agentsentry_text_size', size);
    } catch (e) {
      // ignore
    }
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem('agentsentry_theme', mode);
    } catch (e) {
      // ignore
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-text-size', textSize);
  }, [textSize]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const increaseTextSize = () => {
    if (textSize === 'small') setTextSize('normal');
    else if (textSize === 'normal') setTextSize('large');
  };

  const decreaseTextSize = () => {
    if (textSize === 'large') setTextSize('normal');
    else if (textSize === 'normal') setTextSize('small');
  };

  const t = (key: string): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  return (
    <UIPreferencesContext.Provider
      value={{
        language,
        setLanguage,
        textSize,
        increaseTextSize,
        decreaseTextSize,
        theme,
        toggleTheme,
        setTheme,
        t,
      }}
    >
      {children}
    </UIPreferencesContext.Provider>
  );
};

export const useUIPreferences = () => {
  const context = useContext(UIPreferencesContext);
  if (!context) {
    throw new Error('useUIPreferences must be used within a UIPreferencesProvider');
  }
  return context;
};
