/**
 * Converts a PDF bank statement to OFX format.
 * Extracts text from the PDF and uses heuristics to detect transactions.
 *
 * Wise PDF layout (and similar columnar statements):
 *   Line N:   "Description text ... txn_amount  balance"  (description + amount columns, same y)
 *   Line N+1: "DD Month YYYY  Card ending in..."           (date line, below)
 *
 * So for each date line we look BACKWARDS for the nearest line that contains amounts.
 * The last amount on that line is the running balance (ignore it).
 * The second-to-last amount is the actual transaction amount.
 */

import * as pdfjsLib from "pdfjs-dist";
import { formatDateNow, buildTransaction, buildOfx } from "./ofxBuilder.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

const MONTH_MAP = {
  january: 1, february: 2, march: 3, april: 4,
  may: 5, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12,
};
const MONTH_NAMES = Object.keys(MONTH_MAP).join("|");

// "23 February 2026" or "23 Feb 2026"
const LONG_DATE_RE = new RegExp(
  `\\b(\\d{1,2})\\s+(${MONTH_NAMES})\\s+(\\d{4})\\b`,
  "i"
);

// "2026-02-23", "23/02/2026", "23-02-2026", "23.02.2026"
const NUMERIC_DATE_RE = /\b(\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})\b/;

// Matches signed or unsigned decimal amounts: -46.22  245.17  1,234.56  1.234,56
const AMOUNT_RE = /[-+]?\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\b/;

function normalizeAmount(raw) {
  // European format: dots as thousands separators, comma as decimal
  if (/^\d{1,3}(?:\.\d{3})*,\d{2}$/.test(raw)) {
    return raw.replace(/\./g, "").replace(",", ".");
  }
  return raw.replace(/,/g, "");
}

function parseLongDate(day, monthName, year) {
  const month = String(MONTH_MAP[monthName.toLowerCase()]).padStart(2, "0");
  return `${year}${month}${day.padStart(2, "0")}`;
}

function parseNumericDate(raw) {
  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(raw)) {
    return raw.replace(/[-/]/g, "");
  }
  const m = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return `${y}${mo.padStart(2, "0")}${d.padStart(2, "0")}`;
  }
  const d = new Date(raw);
  if (!isNaN(d)) {
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  }
  return raw.replace(/\D/g, "").slice(0, 8);
}

function findDateInLine(line) {
  const longMatch = line.match(LONG_DATE_RE);
  if (longMatch) {
    return {
      date: parseLongDate(longMatch[1], longMatch[2], longMatch[3]),
      matchIndex: longMatch.index,
      matchLength: longMatch[0].length,
    };
  }
  const numMatch = line.match(NUMERIC_DATE_RE);
  if (numMatch) {
    return {
      date: parseNumericDate(numMatch[1]),
      matchIndex: numMatch.index,
      matchLength: numMatch[0].length,
    };
  }
  return null;
}

function findAmountsInLine(line) {
  return [...line.matchAll(new RegExp(AMOUNT_RE.source, "g"))].map((m) => m[0]);
}

/**
 * Given the amounts line and the chosen transaction amount string,
 * extract the description: text before the last occurrence of txnAmount.
 * Also strips common table header words from the start.
 */
function extractDesc(line, txnAmount) {
  const idx = line.lastIndexOf(txnAmount);
  let desc = idx > 0 ? line.slice(0, idx).trim() : line;
  desc = desc
    .replace(/^(Description\s+)?(Incoming\s+)?(Outgoing\s+)?(Amount\s+)?/i, "")
    .trim();
  return desc;
}

function extractTransactionsFromText(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const transactions = [];
  const usedLines = new Set();

  for (let i = 0; i < lines.length; i++) {
    if (usedLines.has(i)) continue;

    const line = lines[i];
    const dateInfo = findDateInLine(line);
    if (!dateInfo) continue;

    const amountsOnLine = findAmountsInLine(line);

    if (amountsOnLine.length > 0) {
      // ── Single-line: date and amounts appear on the same line ──────────
      const lastAmount = amountsOnLine[amountsOnLine.length - 1];
      const descBefore = line.slice(0, dateInfo.matchIndex).trim();
      const afterDate = line.slice(dateInfo.matchIndex + dateInfo.matchLength);
      const descAfter = afterDate.replace(lastAmount, "").trim();
      const desc = [descBefore, descAfter].filter(Boolean).join(" ") || "Transaction";

      if (desc.length >= 2) {
        usedLines.add(i);
        transactions.push({ date: dateInfo.date, amount: normalizeAmount(lastAmount), name: desc });
      }
      continue;
    }

    // ── Multi-line: look BACKWARDS for the nearest line that has amounts ──
    // Wise PDF: columns put description+amounts on one y-coordinate, date on
    // the next line below. We may also have 1-2 continuation lines between
    // the amounts line and the date (e.g. a wrapped merchant name like "COM").
    let foundBackward = false;
    for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
      if (usedLines.has(j)) break;
      if (findDateInLine(lines[j])) break; // hit a previous transaction's date line

      const prevAmounts = findAmountsInLine(lines[j]);
      if (prevAmounts.length === 0) continue;

      // Last amount = running balance (ignore). Second-to-last = actual transaction amount.
      const txnAmount =
        prevAmounts.length >= 2
          ? prevAmounts[prevAmounts.length - 2]
          : prevAmounts[0];

      const descFromAmtsLine = extractDesc(lines[j], txnAmount);
      const descMiddle = lines.slice(j + 1, i).join(" ").trim();
      const desc = [descFromAmtsLine, descMiddle].filter(Boolean).join(" ") || "Transaction";

      for (let k = j; k <= i; k++) usedLines.add(k);
      transactions.push({ date: dateInfo.date, amount: normalizeAmount(txnAmount), name: desc });
      foundBackward = true;
      break;
    }

    if (foundBackward) continue;

    // ── Fallback: look at the NEXT line for amounts ────────────────────────
    const nextLine = i + 1 < lines.length ? lines[i + 1] : null;
    if (!nextLine) continue;

    const amountsOnNext = findAmountsInLine(nextLine);
    if (amountsOnNext.length === 0) continue;

    const txnAmount = amountsOnNext[0];

    const descLines = [];
    for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
      if (usedLines.has(j) || findDateInLine(lines[j])) break;
      descLines.unshift(lines[j]);
    }
    const desc = descLines.join(" ") || "Transaction";

    if (desc.length >= 2) {
      usedLines.add(i);
      usedLines.add(i + 1);
      transactions.push({ date: dateInfo.date, amount: normalizeAmount(txnAmount), name: desc });
    }
  }

  return transactions;
}

async function extractTextFromPdf(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Group text items by y-coordinate to reconstruct visual lines
    const lineMap = new Map();
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push({ x: item.transform[4], text: item.str });
    }

    // Sort groups top-to-bottom; within each line sort left-to-right
    const sortedLines = [...lineMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) =>
        items
          .sort((a, b) => a.x - b.x)
          .map((i) => i.text)
          .join(" ")
      );

    fullText += sortedLines.join("\n") + "\n";
  }

  return fullText;
}

export async function convertPdfToOfx(arrayBuffer) {
  const text = await extractTextFromPdf(arrayBuffer);
  const transactions = extractTransactionsFromText(text);

  if (transactions.length === 0) {
    throw new Error(
      "No transactions detected in the PDF. The format may not be supported."
    );
  }

  const dtNow = formatDateNow();

  const txnLines = transactions.map((t, i) => {
    const amount = parseFloat(t.amount);
    const trntype = isNaN(amount) || amount >= 0 ? "CREDIT" : "DEBIT";
    const name = t.name.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
    return buildTransaction({
      trntype,
      dtposted: t.date || dtNow,
      trnamt: t.amount,
      fitid: `${dtNow}${String(i + 1).padStart(4, "0")}`,
      name,
    });
  });

  return { ofx: buildOfx({ dtNow, txnLines }), transactionCount: transactions.length };
}
