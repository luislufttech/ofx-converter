import { useState, useRef, useCallback, useEffect } from "react";
import { convertXmlToOfx } from "../converters/converter";
import { convertPdfToOfx } from "../converters/pdfConverter";
import { translations } from "../lib/translations";
import { steps } from "../lib/constants";
import useStoredToggle from "../hooks/useStoredToggle";
import Header from "./Header";
import DocIcon from "./DocIcon";

export default function App() {
  const [step, setStep] = useState(steps.IDLE);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [ofxResult, setOfxResult] = useState(null);
  const [txnCount, setTxnCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [lang, toggleLang] = useStoredToggle("lang", "en", "pt");
  const [theme, toggleTheme] = useStoredToggle("theme", "dark", "light");
  const fileInputRef = useRef(null);

  const t = translations[lang];

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const loadFile = useCallback(
    (file) => {
      if (!file) return;
      const isXml = file.name.toLowerCase().endsWith(".xml");
      const isPdf = file.name.toLowerCase().endsWith(".pdf");
      if (!isXml && !isPdf) {
        setErrorMsg(t.invalidFile);
        setStep(steps.ERROR);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileContent(e.target.result);
        setFileName(file.name);
        setFileType(isXml ? "xml" : "pdf");
        setStep(steps.FILE_LOADED);
        setErrorMsg("");
        setOfxResult(null);
      };
      reader.onerror = () => {
        setErrorMsg(t.readError);
        setStep(steps.ERROR);
      };
      if (isXml) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    },
    [t]
  );

  const handleFileChange = (e) => loadFile(e.target.files[0]);
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); loadFile(e.dataTransfer.files[0]); };

  const handleConvert = async () => {
    setStep(steps.CONVERTING);
    try {
      const result = fileType === "xml"
        ? (await new Promise((r) => setTimeout(r, 400)), convertXmlToOfx(fileContent))
        : await convertPdfToOfx(fileContent);
      setOfxResult(result.ofx);
      setTxnCount(result.transactionCount);
      setStep(steps.DONE);
    } catch (err) {
      setErrorMsg(err.message || t.conversionFailed);
      setStep(steps.ERROR);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([ofxResult], { type: "application/x-ofx" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.(xml|pdf)$/i, ".ofx");
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setStep(steps.IDLE);
    setFileName("");
    setFileType(null);
    setFileContent(null);
    setOfxResult(null);
    setTxnCount(0);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const faqs = [
    { q: t.faq1q, a: t.faq1a },
    { q: t.faq2q, a: t.faq2a },
    { q: t.faq3q, a: t.faq3a },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col">
      <Header lang={lang} theme={theme} toggleLang={toggleLang} toggleTheme={toggleTheme} />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-lg mb-4">
              <DocIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">OFX Converter</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">{t.tagline}</p>
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5 w-1/2 mx-auto">
            {/* Drop zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
                ${dragOver ? "border-indigo-400 bg-indigo-500/10" : "border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/30"}
                ${step === steps.FILE_LOADED || step === steps.DONE ? "border-emerald-500/50 bg-emerald-500/5" : ""}
              `}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input ref={fileInputRef} type="file" accept=".xml,.pdf" className="hidden" onChange={handleFileChange} />

              {step === steps.IDLE && (
                <>
                  <svg className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">{t.dropPrompt}</p>
                  <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">{t.dropSub}</p>
                </>
              )}

              {(step === steps.FILE_LOADED || step === steps.DONE) && (
                <>
                  <svg className="w-10 h-10 text-emerald-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-emerald-400 font-medium truncate max-w-xs mx-auto">{fileName}</p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{t.changeFile}</p>
                </>
              )}

              {step === steps.ERROR && (
                <>
                  <svg className="w-10 h-10 text-red-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 font-medium">{t.uploadFailed}</p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{t.tryAgain}</p>
                </>
              )}
            </div>

            {/* File type badge */}
            {(step === steps.FILE_LOADED || step === steps.DONE) && fileType && (
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${fileType === "pdf" ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"}`}>
                  {fileType.toUpperCase()}
                </span>
                {fileType === "pdf" && (
                  <span className="text-slate-400 dark:text-slate-500 text-xs">{t.pdfHeuristics}</span>
                )}
              </div>
            )}

            {/* Error message */}
            {step === steps.ERROR && errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-500 dark:text-red-400 text-sm">
                {errorMsg}
              </div>
            )}

            {/* Result info */}
            {step === steps.DONE && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 text-emerald-500 dark:text-emerald-400 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {txnCount === 1 ? t.successOne : t.successMany(txnCount)}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {(step === steps.FILE_LOADED || step === steps.CONVERTING) && (
                <button
                  onClick={handleConvert}
                  disabled={step === steps.CONVERTING}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {step === steps.CONVERTING ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      {t.converting}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {t.convert}
                    </>
                  )}
                </button>
              )}

              {step === steps.DONE && (
                <button
                  onClick={handleDownload}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {t.download}
                </button>
              )}

              {step !== steps.IDLE && (
                <button
                  onClick={handleReset}
                  className="w-full py-2 px-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-sm transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50"
                >
                  {t.reset}
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-slate-400 dark:text-slate-600 text-xs mt-6">{t.localNote}</p>

          {/* Informational content for SEO */}
          <div className="mt-12 space-y-8 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            <section>
              <h2 className="text-slate-800 dark:text-slate-200 font-semibold text-base mb-2">{t.whatIsOfxTitle}</h2>
              <p>{t.whatIsOfxBody}</p>
            </section>

            <section>
              <h2 className="text-slate-800 dark:text-slate-200 font-semibold text-base mb-2">{t.supportedTitle}</h2>
              <ul className="space-y-1 list-disc list-inside marker:text-indigo-500">
                <li><strong className="text-slate-700 dark:text-slate-300">Wise PDF</strong> — {t.supportedWise}</li>
                <li><strong className="text-slate-700 dark:text-slate-300">SEPA camt.053 XML</strong> — {t.supportedCamt}</li>
                <li><strong className="text-slate-700 dark:text-slate-300">XML</strong> — {t.supportedXml}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-slate-800 dark:text-slate-200 font-semibold text-base mb-3">{t.faqTitle}</h2>
              <div className="space-y-4">
                {faqs.map(({ q, a }) => (
                  <div key={q}>
                    <h3 className="text-slate-700 dark:text-slate-300 font-medium mb-1">{q}</h3>
                    <p>{a}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <footer className="mt-10 pb-6 text-center text-slate-400 dark:text-slate-600 text-xs space-x-4">
            <span>{t.footerLocal}</span>
            <a href="/privacy.html" className="hover:text-slate-600 dark:hover:text-slate-400 transition-colors underline underline-offset-2">{t.privacyLink}</a>
          </footer>
        </div>
      </div>
    </div>
  );
}
