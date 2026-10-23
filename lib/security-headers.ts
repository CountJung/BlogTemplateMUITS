// Candidate policy is opt-in and report-only until real content and browser flows are checked.
export function securityHeaders(reportOnly = false) {
  const headers = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'" },
  ];
  if (reportOnly) headers.push({ key: 'Content-Security-Policy-Report-Only', value: "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: data:; font-src 'self' data:; connect-src 'self'; base-uri 'self'; object-src 'none'" });
  return headers;
}
