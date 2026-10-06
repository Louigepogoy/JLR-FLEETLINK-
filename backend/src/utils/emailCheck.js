// Checks, before sign-up, whether an email address can actually receive mail, without sending any.
// 1. Every domain must have mail (MX) servers — catches typos like "gmial.com".
// 2. For Gmail, the mail server is asked about the mailbox itself (SMTP RCPT TO); Gmail answers
//    "550 5.1.1 NoSuchUser" for accounts that don't exist.
// Anything inconclusive (port 25 blocked by the network/host, timeouts, other providers) returns
// 'unknown' so sign-up continues — the emailed verification code is still the final proof.
const dns = require('dns').promises;
const net = require('net');

const PROBE_TIMEOUT_MS = 7000;
const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);
const CACHE_MS = 10 * 60 * 1000;
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

/** Returns 'exists' | 'not_found' | 'invalid_domain' | 'unknown'. */
const checkEmailDeliverable = async (email) => {
  const key = String(email).toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.result;

  let result = 'unknown';
  try {
    const domain = key.split('@')[1];
    const mx = await lookupMx(domain);
    if (!mx.length) result = 'invalid_domain';
    else if (GMAIL_DOMAINS.has(domain)) result = await probeMailbox(mx[0], key);
  } catch {
    result = 'unknown';
  }
  cache.set(key, { result, expires: Date.now() + CACHE_MS });
  return result;
};

const EMAIL_PROBLEM_MESSAGES = {
  not_found: 'This Gmail address doesn\'t exist. Check the spelling, or use another email.',
  invalid_domain: 'This email domain can\'t receive email. Check the part after "@" for typos.',
};

module.exports = { checkEmailDeliverable, EMAIL_PROBLEM_MESSAGES };
