// One password rule for registration, password reset, and password change.
const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, message: 'at least 8 characters' },
  { test: (p) => /[A-Z]/.test(p), message: 'an uppercase letter' },
  { test: (p) => /[a-z]/.test(p), message: 'a lowercase letter' },
  { test: (p) => /\d/.test(p), message: 'a number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), message: 'a special character (e.g. ! @ # $ %)' },
];

// Returns null when the password is strong enough, otherwise a sentence listing what's missing.
const passwordProblem = (password) => {
  const missing = PASSWORD_RULES.filter((r) => !r.test(String(password || ''))).map((r) => r.message);
  return missing.length ? `Password must contain ${missing.join(', ')}.` : null;
};

// express-validator custom check: body('password').custom(strongPassword)
const strongPassword = (value) => {
  const problem = passwordProblem(value);
  if (problem) throw new Error(problem);
  return true;
};

module.exports = { passwordProblem, strongPassword };
