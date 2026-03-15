import { useState, useRef, useCallback } from "react";
import { convertXmlToOfx } from "./converter";
import { convertPdfToOfx } from "./pdfConverter";

const steps = {
  IDLE: "idle",
  FILE_LOADED: "file_loaded",
  CONVERTING: "converting",
  DONE: "done",
  ERROR: "error",
};

export default function App() {
  const [step, setStep] = useState(steps.IDLE);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState(null); // "xml" | "pdf"
  const [fileContent, setFileContent] = useState(null); // string for XML, ArrayBuffer for PDF
  const [ofxResult, setOfxResult] = useState(null);
  const [txnCount, setTxnCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const loadFile = useCallback((file) => {
    if (!file) return;
    const isXml = file.name.toLowerCase().endsWith(".xml");
    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    if (!isXml && !isPdf) {
      setErrorMsg("Please upload a valid .xml or .pdf file.");
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
      setErrorMsg("Failed to read the file.");
      setStep(steps.ERROR);
    };
    if (isXml) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, []);

  const handleFileChange = (e) => {
    loadFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    loadFile(e.dataTransfer.files[0]);
  };

  const handleConvert = async () => {
    setStep(steps.CONVERTING);
    try {
      let result;
      if (fileType === "xml") {
        // Small timeout to show converting state for sync operation
        await new Promise((r) => setTimeout(r, 400));
        result = convertXmlToOfx(fileContent);
      } else {
        result = await convertPdfToOfx(fileContent);
      }
      setOfxResult(result.ofx);
      setTxnCount(result.transactionCount);
      setStep(steps.DONE);
    } catch (err) {
      setErrorMsg(err.message || "Conversion failed.");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <header className="border-b border-slate-700 bg-slate-900/60 backdrop-blur px-6 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <span className="text-white font-semibold text-sm tracking-tight">OFX Converter</span>
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">OFX Converter</h1>
          <p className="text-slate-400 mt-2 text-sm">Convert your XML or PDF bank statements to OFX format</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-6 space-y-5">

          {/* Drop zone */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
              ${dragOver ? "border-indigo-400 bg-indigo-500/10" : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/30"}
              ${step === steps.FILE_LOADED || step === steps.DONE ? "border-emerald-500/50 bg-emerald-500/5" : ""}
            `}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {step === steps.IDLE && (
              <>
                <svg className="w-10 h-10 text-slate-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-slate-300 font-medium">Drop your XML or PDF file here</p>
                <p className="text-slate-500 text-sm mt-1">or click to browse</p>
              </>
            )}

            {(step === steps.FILE_LOADED || step === steps.DONE) && (
              <>
                <svg className="w-10 h-10 text-emerald-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-emerald-400 font-medium truncate max-w-xs mx-auto">{fileName}</p>
                <p className="text-slate-500 text-xs mt-1">Click to change file</p>
              </>
            )}

            {step === steps.ERROR && (
              <>
                <svg className="w-10 h-10 text-red-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-400 font-medium">Upload failed</p>
                <p className="text-slate-500 text-xs mt-1">Click to try again</p>
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
                <span className="text-slate-500 text-xs">Transaction detection uses heuristics — review results</span>
              )}
            </div>
          )}

          {/* Error message */}
          {step === steps.ERROR && errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              {errorMsg}
            </div>
          )}

          {/* Result info */}
          {step === steps.DONE && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 text-emerald-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Converted successfully — {txnCount} transaction{txnCount !== 1 ? "s" : ""} found.
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {/* Convert button */}
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
                    Converting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Convert to OFX
                  </>
                )}
              </button>
            )}

            {/* Download button */}
            {step === steps.DONE && (
              <button
                onClick={handleDownload}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download OFX File
              </button>
            )}

            {/* Reset */}
            {step !== steps.IDLE && (
              <button
                onClick={handleReset}
                className="w-full py-2 px-4 text-slate-400 hover:text-slate-200 text-sm transition-colors rounded-xl hover:bg-slate-700/50"
              >
                Start over
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Files are processed locally — nothing is uploaded to any server.
        </p>

        {/* Informational content for SEO */}
        <div className="mt-12 space-y-8 text-slate-400 text-sm leading-relaxed">
          <section>
            <h2 className="text-slate-200 font-semibold text-base mb-2">What is OFX format?</h2>
            <p>
              OFX (Open Financial Exchange) is a standardized data format used by banks and
              personal finance applications to exchange transaction data. It is widely supported
              by tools like <strong className="text-slate-300">Quicken</strong>, <strong className="text-slate-300">GnuCash</strong>,{" "}
              <strong className="text-slate-300">YNAB</strong>, and most accounting software, making
              it the easiest way to import your bank history without manual entry.
            </p>
          </section>

          <section>
            <h2 className="text-slate-200 font-semibold text-base mb-2">Supported input formats</h2>
            <ul className="space-y-1 list-disc list-inside marker:text-indigo-500">
              <li><strong className="text-slate-300">Wise PDF statements</strong> — monthly USD, EUR, and multi-currency exports</li>
              <li><strong className="text-slate-300">SEPA camt.053 XML</strong> — ISO 20022 bank-to-customer statement format</li>
              <li><strong className="text-slate-300">Generic XML</strong> — any XML file containing transaction-like nodes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-slate-200 font-semibold text-base mb-3">Frequently asked questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-slate-300 font-medium mb-1">Is this tool free?</h3>
                <p>Yes, completely free with no sign-up or account required.</p>
              </div>
              <div>
                <h3 className="text-slate-300 font-medium mb-1">Is my financial data safe?</h3>
                <p>
                  All conversion happens directly in your browser. Your files are never uploaded
                  to any server — not even ours. Once you close the tab, nothing is retained.
                </p>
              </div>
              <div>
                <h3 className="text-slate-300 font-medium mb-1">Which apps accept OFX files?</h3>
                <p>
                  Quicken, GnuCash, YNAB, Banktivity, Moneydance, HomeBank, and most other
                  personal finance and accounting applications support importing OFX files directly.
                </p>
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-10 pb-6 text-center text-slate-600 text-xs space-x-4">
          <span>Files processed locally — never uploaded.</span>
          <a href="/privacy.html" className="hover:text-slate-400 transition-colors underline underline-offset-2">Privacy Policy</a>
        </footer>
      </div>
    </div>
  </div>
  );
}
