// Checks, before sign-up, whether an email address can actually receive mail, without sending any.
// 1. Every domain must have mail (MX) servers — catches typos like "gmial.com".
// 2. For Gmail, the mail server is asked about the mailbox itself (SMTP RCPT TO); Gmail answers
//    "550 5.1.1 NoSuchUser" for accounts that don't exist.
// Anything inconclusive (port 25 blocked by the network/host, timeouts, other providers) returns
// 'unknown' for Gmail (mailbox couldn't be confirmed) or 'domain_ok' for other providers (the domain can
// receive mail, the mailbox isn't probed) so sign-up continues —
// the emailed verification code is still the final proof.
const dns = require('dns').promises;
const net = require('net');

const PROBE_TIMEOUT_MS = 7000;
const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);
const CACHE_MS = 10 * 60 * 1000;

// Gmail usernames: letters, numbers and periods only, no leading/trailing/double periods, up to 30
// characters (a "+tag" suffix is delivery-only and ignored). Catches addresses that can't be real.
const isValidGmailLocalPart = (local) => {
  const base = local.split('+')[0];
  return base.length >= 3 && base.length <= 30 && /^[a-z0-9](?:[a-z0-9]|\.(?!\.))*[a-z0-9]$/.test(base);
};
const cache = new Map();

const lookupMx = async (domain) => {
  try {
    const records = await dns.resolveMx(domain);
    return records.sort((a, b) => a.priority - b.priority).map((r) => r.exchange);
  } catch (err) {
    if (['ENOTFOUND', 'ENODATA', 'ESERVFAIL'].includes(err.code)) return [];
    throw err;
  }
};

// Talks just enough SMTP to ask whether the mailbox exists, then quits before any message is sent.
const probeMailbox = (host, email) => new Promise((resolve) => {
  const socket = net.createConnection(25, host);
  const commands = ['EHLO jlrfleetlink.com', 'MAIL FROM:<verify@jlrfleetlink.com>', `RCPT TO:<${email}>`];
  let step = 0;
  let buffer = '';
  const finish = (result) => {
    clearTimeout(timer);
    socket.end('QUIT\r\n');
    socket.destroy();
    resolve(result);
  };
  const timer = setTimeout(() => finish('unknown'), PROBE_TIMEOUT_MS);
  socket.on('error', () => finish('unknown'));
  socket.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\r\n').filter(Boolean);
    const last = lines[lines.length - 1] || '';
    // Multi-line replies use "250-"; wait for the final "250 " line.
    if (!buffer.endsWith('\r\n') || /^\d{3}-/.test(last)) return;
    buffer = '';
    if (step === commands.length) {
      if (last.startsWith('250')) return finish('exists');
      if (/^550[ -]5\.1\.1/.test(last)) return finish('not_found');
      return finish('unknown');
    }
    if (!/^2\d\d/.test(last)) return finish('unknown');
    socket.write(`${commands[step]}\r\n`);
    step += 1;
  });
});

// Fallback for hosts that block outbound port 25 (e.g. Railway on non-Pro plans): Abstract's Email Reputation
// API runs the mailbox check from its own servers. Only used when ABSTRACT_EMAIL_API_KEY is set and the
// direct probe was inconclusive, so the free quota isn't spent on addresses we can already answer.
const API_TIMEOUT_MS = 8000;
const apiMailboxCheck = async (email) => {
  const apiKey = process.env.ABSTRACT_EMAIL_API_KEY;
  if (!apiKey) return 'unknown';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://emailreputation.abstractapi.com/v1/?email=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${apiKey}` }, signal: controller.signal }
    );
    if (!response.ok) return 'unknown'; // quota reached, rate limited, bad key... just don't claim anything
    const { email_deliverability: d } = await response.json();
    if (d?.status === 'deliverable') return 'exists';
    if (d?.status === 'undeliverable') {
      if (d.status_detail === 'invalid_mailbox') return 'not_found';
      if (d.status_detail === 'full_mailbox') return 'exists'; // the mailbox is there, just full
    }
    return 'unknown';
  } catch {
    return 'unknown';
  } finally {
    clearTimeout(timer);
  }
};

/** Returns 'exists' | 'not_found' | 'invalid_gmail' | 'invalid_domain' | 'domain_ok' | 'unknown' (couldn't check). */
const checkEmailDeliverable = async (email) => {
  const key = String(email).toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.result;

  let result = 'unknown';
  try {
    const [local, domain] = key.split('@');
    const mx = await lookupMx(domain);
    if (!mx.length) result = 'invalid_domain';
    else if (GMAIL_DOMAINS.has(domain) && !isValidGmailLocalPart(local)) result = 'invalid_gmail';
    else if (GMAIL_DOMAINS.has(domain)) {
      // 'unknown' here means the mailbox couldn't be checked (e.g. the host blocks port 25): don't claim
      // the address looks fine, just leave the plain "we'll send a code" hint.
      result = await probeMailbox(mx[0], key);
      if (result === 'unknown') result = await apiMailboxCheck(key);
    } else result = 'domain_ok';
  } catch {
    result = 'unknown';
  }
  // An inconclusive answer is only remembered briefly, so a quota reset or a retry can still resolve it.
  cache.set(key, { result, expires: Date.now() + (result === 'unknown' ? 60 * 1000 : CACHE_MS) });
  return result;
};

const EMAIL_PROBLEM_MESSAGES = {
  not_found: 'This Gmail address doesn\'t exist. Check the spelling, or use another email.',
  invalid_gmail: 'This isn\'t a valid Gmail address. Gmail names use only letters, numbers and periods.',
  invalid_domain: 'This email domain can\'t receive email. Check the part after "@" for typos.',
};

module.exports = { checkEmailDeliverable, EMAIL_PROBLEM_MESSAGES };
