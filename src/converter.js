/**
 * Converts an XML bank statement to OFX format.
 * Supports generic XML with transaction-like nodes.
 */

function parseDate(dateStr) {
  if (!dateStr) return "";
  // Remove dashes/slashes and return YYYYMMDD
  const clean = dateStr.replace(/[-/]/g, "");
  // If already 8 digits, return as-is
  if (/^\d{8}$/.test(clean)) return clean;
  // Try to parse and format
  const d = new Date(dateStr);
  if (!isNaN(d)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${day}`;
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
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid XML: " + parseError.textContent);
  }

  // Try to detect common transaction node names
  const txnNodeNames = ["STMTTRN", "transaction", "Transaction", "TRANSACTION", "entry", "Entry"];
  let transactions = [];
  for (const name of txnNodeNames) {
    const nodes = doc.querySelectorAll(name);
    if (nodes.length > 0) {
      transactions = Array.from(nodes);
      break;
    }
  }

  // Account info (best-effort)
  const bankId = getText(doc, "BANKID", "bankId", "bank_id", "BankId") || "000000000";
  const acctId = getText(doc, "ACCTID", "acctId", "account_id", "AccountId", "accountId") || "000000000";
  const acctType = getText(doc, "ACCTTYPE", "acctType", "account_type", "AccountType") || "CHECKING";
  const currency = getText(doc, "CURDEF", "currency", "Currency", "CURRENCY") || "USD";

  const now = new Date();
  const dtNow = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  const txnLines = transactions.map((trn, i) => {
    const trntype =
      getText(trn, "TRNTYPE", "type", "Type", "trnType", "transactionType") || "OTHER";
    const dtposted =
      parseDate(getText(trn, "DTPOSTED", "date", "Date", "dtPosted", "transactionDate", "postDate")) || dtNow;
    const trnamt =
      getText(trn, "TRNAMT", "amount", "Amount", "trnAmt", "value") || "0.00";
    const fitid =
      getText(trn, "FITID", "id", "Id", "fitId", "transactionId") || String(i + 1);
    const name =
      getText(trn, "NAME", "name", "Name", "description", "Description", "memo", "Memo") || "Transaction";
    const memo =
      getText(trn, "MEMO", "memo", "Memo", "notes", "Notes") || "";

    return `<STMTTRN>
<TRNTYPE>${trntype.toUpperCase()}</TRNTYPE>
<DTPOSTED>${dtposted}</DTPOSTED>
<TRNAMT>${trnamt}</TRNAMT>
<FITID>${fitid}</FITID>
<NAME>${name}</NAME>
${memo ? `<MEMO>${memo}</MEMO>` : ""}
</STMTTRN>`;
  });

  const ofx = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:UTF-8
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0</CODE>
<SEVERITY>INFO</SEVERITY>
</STATUS>
<DTSERVER>${dtNow}</DTSERVER>
<LANGUAGE>ENG</LANGUAGE>
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001</TRNUID>
<STATUS>
<CODE>0</CODE>
<SEVERITY>INFO</SEVERITY>
</STATUS>
<STMTRS>
<CURDEF>${currency}</CURDEF>
<BANKACCTFROM>
<BANKID>${bankId}</BANKID>
<ACCTID>${acctId}</ACCTID>
<ACCTTYPE>${acctType}</ACCTTYPE>
</BANKACCTFROM>
<BANKTRANLIST>
${txnLines.join("\n")}
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

  return { ofx, transactionCount: transactions.length };
}
