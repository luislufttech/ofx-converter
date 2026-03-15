import DocIcon from "./DocIcon";

export default function Header({ lang, theme, toggleLang, toggleTheme }) {
  return (
    <header className="border-b border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 backdrop-blur px-6 py-3 flex items-center gap-3">
      <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <DocIcon className="w-4 h-4 text-white" />
        </div>
        <span className="text-slate-900 dark:text-white font-semibold text-sm tracking-tight">OFX Converter</span>
      </a>
      <div className="ml-auto flex items-center gap-3">
        <a href={lang === "pt" ? "/blog/pt/" : "/blog/"} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm transition-colors">Blog</a>
        <button
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-400 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
        <button
          onClick={toggleLang}
          className="text-xs font-semibold px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-400 transition-colors"
        >
          {lang === "en" ? "PT" : "EN"}
        </button>
      </div>
    </header>
  );
}
