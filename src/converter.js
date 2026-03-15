import { formatDateNow, buildTransaction, buildOfx } from "./ofxBuilder.js";

function parseDate(dateStr) {
  if (!dateStr) return "";
  const clean = dateStr.replace(/[-/]/g, "");
  if (/^\d{8}$/.test(clean)) return clean;
  const d = new Date(dateStr);
  if (!isNaN(d)) {
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  }
  return clean;
}

function getText(el, ...tags) {
  for (const tag of tags) {
    const found = el.querySelector(tag);
    if (found) return found.textContent.trim();
  }
  return "";
}

export function convertXmlToOfx(xmlString) {
  // Strip XML namespace declarations so querySelector works without namespace handling
  const cleanXml = xmlString.replace(/\s+xmlns(?::\w+)?="[^"]*"/g, "");

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanXml, "application/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid XML: " + parseError.textContent);
  }

  // Try common transaction node names; Ntry is used in ISO 20022 camt.053
  const txnNodeNames = ["STMTTRN", "Ntry", "transaction", "Transaction", "TRANSACTION", "entry", "Entry"];
  let transactions = [];
  for (const name of txnNodeNames) {
    const nodes = doc.querySelectorAll(name);
    if (nodes.length > 0) {
      transactions = Array.from(nodes);
      break;
    }
  }

  // Account info — try generic and camt.053 field names
  const bankId = getText(doc, "BANKID", "bankId", "bank_id", "BankId", "BICFI", "BIC") || "000000000";
  const acctId = getText(doc, "ACCTID", "acctId", "account_id", "AccountId", "accountId", "IBAN") || "000000000";
  const acctType = getText(doc, "ACCTTYPE", "acctType", "account_type", "AccountType") || "CHECKING";

  // Currency: try element text first, then attribute on Amt element
  let currency = getText(doc, "CURDEF", "currency", "Currency", "CURRENCY", "Ccy");
  if (!currency) {
    const amtEl = doc.querySelector("Amt");
    currency = amtEl?.getAttribute("Ccy") || "USD";
  }

  const dtNow = formatDateNow();

  const txnLines = transactions.map((trn, i) => {
    // camt.053 uses CdtDbtInd (CRDT/DBIT) to indicate sign
    const cdtDbt = getText(trn, "CdtDbtInd");

    let trntype;
    if (cdtDbt === "DBIT") trntype = "DEBIT";
    else if (cdtDbt === "CRDT") trntype = "CREDIT";
    else trntype = (getText(trn, "TRNTYPE", "type", "Type", "trnType", "transactionType") || "OTHER").toUpperCase();

    // Amount — camt.053 uses <Amt> (always positive); sign comes from CdtDbtInd
    const rawAmt = getText(trn, "Amt", "TRNAMT", "amount", "Amount", "trnAmt", "value") || "0.00";
    const trnamt = cdtDbt === "DBIT" ? `-${rawAmt}` : rawAmt;

    // Date — camt.053 uses <BookgDt><Dt> or <ValDt><Dt>
    let dtStr = getText(trn, "DTPOSTED", "date", "Date", "dtPosted", "transactionDate", "postDate");
    if (!dtStr) {
      const dtEl =
        trn.querySelector("BookgDt Dt") ||
        trn.querySelector("ValDt Dt") ||
        trn.querySelector("Dt");
      if (dtEl) dtStr = dtEl.textContent.trim();
    }
    const dtposted = parseDate(dtStr) || dtNow;

    // ID — camt.053 uses <BkTxCd><Prtry><Cd> or <NtryRef>
    let fitid = getText(trn, "FITID", "id", "fitId", "transactionId");
    if (!fitid) {
      const idEl =
        trn.querySelector("BkTxCd Prtry Cd") ||
        trn.querySelector("NtryRef");
      fitid = idEl ? idEl.textContent.trim() : String(i + 1);
    }

    // Name — camt.053 uses <AddtlNtryInf> or <RmtInf><Ustrd>
    const name =
      getText(trn, "AddtlNtryInf", "NAME", "name", "Name", "description", "Description", "memo", "Memo") ||
      getText(trn, "Ustrd") ||
      "Transaction";

    const memo = getText(trn, "MEMO", "memo", "Memo", "notes", "Notes") || "";

    return buildTransaction({ trntype, dtposted, trnamt, fitid, name, memo });
  });

  return { ofx: buildOfx({ dtNow, currency, bankId, acctId, acctType, txnLines }), transactionCount: transactions.length };
}
