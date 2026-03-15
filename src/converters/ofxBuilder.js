export function formatDateNow() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
}

export function buildTransaction({ trntype, dtposted, trnamt, fitid, name, memo = "" }) {
  return `<STMTTRN>
<TRNTYPE>${trntype}</TRNTYPE>
<DTPOSTED>${dtposted}</DTPOSTED>
<TRNAMT>${trnamt}</TRNAMT>
<FITID>${fitid}</FITID>
<NAME>${name}</NAME>
${memo ? `<MEMO>${memo}</MEMO>\n` : ""}</STMTTRN>`;
}

export function buildOfx({
  dtNow,
  currency = "USD",
  bankId = "000000000",
  acctId = "000000000",
  acctType = "CHECKING",
  txnLines,
}) {
  return `OFXHEADER:100
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
}
