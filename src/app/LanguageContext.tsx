import React, { createContext, useContext, useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useBodyScrollLock } from '../shared/utils/scrollLock';

type Language = 'en' | 'ur';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isRtl: boolean;
  requestLanguageChange: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_lang');
    return (saved === 'ur' || saved === 'en') ? saved : 'en';
  });
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<'en' | 'ur' | null>(null);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_lang', lang);
  };

  const requestLanguageChange = (lang: Language) => {
    if (lang === 'ur' && language !== 'ur') {
      setPendingLanguage('ur');
      setShowPermissionModal(true);
    } else {
      setLanguage(lang);
    }
  };

  const isRtl = language === 'ur';

  // Lock body scroll when permission dialog is open
  useBodyScrollLock(showPermissionModal);

  useEffect(() => {
    // Dynamically adjust html dir and lang attributes
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    // Apply styling helper classes if needed
    if (isRtl) {
      document.body.classList.add('font-urdu');
    } else {
      document.body.classList.remove('font-urdu');
    }
  }, [language, isRtl]);

  useEffect(() => {
    if (!isRtl) return undefined;
    let stop: (() => void) | undefined;
    let active = true;
    import('./urdu').then(({ startUrdu }) => { if (active) stop = startUrdu(); });
    return () => { active = false; stop?.(); };
  }, [isRtl]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRtl, requestLanguageChange }}>
      <div className={isRtl ? 'rtl-layout' : 'ltr-layout'}>
        {children}
      </div>

      {/* Centered Urdu Language Permission Dialog */}
      {showPermissionModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs touch-none overscroll-none" id="language-permission-modal">
            {/* Backdrop */}
            <div
              onClick={() => setShowPermissionModal(false)}
              className="absolute inset-0 cursor-default touch-none overscroll-none"
            />
            
            {/* Modal Body */}
            <div
              className="animate-pop-in relative w-full max-w-md bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 text-left overflow-y-auto max-h-[calc(100vh-2rem)] z-10 my-auto mx-auto"
              dir="ltr"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 animate-pulse" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-base sm:text-lg font-bold text-slate-950 flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span>Switch to Urdu</span>
                    <span className="text-slate-300 hidden sm:inline">|</span>
                    <span className="font-urdu font-medium text-emerald-700">اردو زبان</span>
                  </h3>
                </div>
              </div>

              <div className="space-y-3 py-0.5 text-slate-600 text-xs sm:text-sm leading-relaxed">
                <p className="font-medium text-slate-900 border-b border-slate-100 pb-2.5">
                  Show menus, listings and bookings in Urdu. You can switch back to English at any time.
                </p>
                <p className="font-urdu font-medium text-slate-700 text-xs sm:text-base leading-relaxed bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 text-right" dir="rtl">
                  کیا آپ ویب سائٹ اردو میں دیکھنا چاہتے ہیں؟
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                <button
                  id="btn-confirm-language-cancel"
                  onClick={() => {
                    setShowPermissionModal(false);
                    setPendingLanguage(null);
                  }}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer text-center min-h-[44px] flex items-center justify-center"
                >
                  Keep English
                </button>
                <button
                  id="btn-confirm-language-approve"
                  onClick={() => {
                    if (pendingLanguage) {
                      setLanguage(pendingLanguage);
                    }
                    setShowPermissionModal(false);
                    setPendingLanguage(null);
                  }}
                  className="w-full px-4 rounded-lg bg-[#006F3C] hover:bg-[#005C32] text-white transition-colors text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer text-center min-h-[44px]"
                >
                  Switch to Urdu · اردو
                </button>
              </div>
            </div>
          </div>
        )}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
