const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const { uploadDir } = require('../middleware/upload');

// Gemini renames/retires model IDs periodically and individual models get overloaded (503), so we try
// GEMINI_MODEL first and fall back to stable aliases before giving up.
const MODELS = [...new Set([process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-flash-lite-latest'].filter(Boolean))];
const REQUEST_TIMEOUT_MS = 45000;

const MEDIA_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const getClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error('AI verification is not configured. Set GEMINI_API_KEY in backend/.env.');
    error.status = 503;
    throw error;
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: REQUEST_TIMEOUT_MS } });
};

// Gemini errors carry an HTTP-like status and a raw JSON message; classify them so we can move on to
// the next model or show the admin a readable message.
const classifyGeminiError = (err) => {
  const status = Number(err?.status) || 0;
  const text = String(err?.message || '');
  if (status === 400 && /API key/i.test(text)) return 'bad-key';
  if (status === 401 || status === 403 || /PERMISSION_DENIED|API_KEY_INVALID/i.test(text)) return 'bad-key';
  if ([429, 500, 503, 504].includes(status) || /UNAVAILABLE|overloaded|high demand|RESOURCE_EXHAUSTED|DEADLINE_EXCEEDED|timed? ?out|abort/i.test(text)) {
    return 'busy';
  }
  if (status === 404 || /NOT_FOUND|is not found|not supported/i.test(text)) return 'missing-model';
  return 'fatal';
};

const aiError = (message, status = 503) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const generateWithFallback = async (request) => {
  const ai = getClient();
  let sawBusy = false;
  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({ ...request, model });
      return { response, model };
    } catch (err) {
      const kind = classifyGeminiError(err);
      console.warn(`AI check: ${model} failed (${kind}): ${String(err?.message).slice(0, 200)}`);
      if (kind === 'bad-key') {
        throw aiError('The Gemini API key was rejected. Check GEMINI_API_KEY in backend/.env.', 502);
      }
      if (kind === 'fatal') {
        throw aiError('The AI service returned an unexpected error. Please try again.', 502);
      }
      if (kind === 'busy') sawBusy = true;
    }
  }
  throw aiError(
    !sawBusy
      ? 'No available Gemini model was found. Set GEMINI_MODEL in backend/.env to a current model name.'
      : 'The AI service is busy right now. Please try the AI check again in a minute.'
  );
};

const urlToLocalPath = (url) => {
  if (!url) return null;
  const filename = url.split('/uploads/')[1];
  if (!filename) return null;
  const filePath = path.join(uploadDir, filename);
  return fs.existsSync(filePath) ? filePath : null;
};

const fileToImagePart = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MEDIA_TYPES[ext] || 'image/jpeg';
  const data = fs.readFileSync(filePath).toString('base64');
  return { inlineData: { mimeType, data } };
};

const RESULT_SCHEMA_INSTRUCTIONS = `Respond with ONLY a single JSON object, no markdown fences, no extra text, in exactly this shape:
{
  "riskScore": <integer 0-100, where 0 = no concerns and 100 = very likely fraudulent/fake>,
  "verdict": "<one of: low_risk, medium_risk, high_risk>",
  "reasons": ["<short specific reason 1>", "<short specific reason 2>", ...],
  "summary": "<1-2 sentence plain-language summary for a human admin>"
}`;

// Returns snake_case fields to match the ai_verification_results columns and the frontend AiResult type.
const parseAiJson = (text) => {
  const match = text.match(/\{[\s\S]*\}/);
  let parsed;
  try {
    parsed = match ? JSON.parse(match[0]) : null;
  } catch {
    parsed = null;
  }
  if (!parsed) throw aiError('The AI returned an unreadable answer. Please run the check again.', 502);
  const riskScore = Math.round(Math.max(0, Math.min(100, Number(parsed.riskScore ?? parsed.risk_score) || 0)));
  const verdict = ['low_risk', 'medium_risk', 'high_risk'].includes(parsed.verdict)
    ? parsed.verdict
    : (riskScore >= 70 ? 'high_risk' : riskScore >= 30 ? 'medium_risk' : 'low_risk');
  return {
    risk_score: riskScore,
    verdict,
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String).slice(0, 10) : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
  };
};

const analyzeLicenseVerification = async ({ licenseImageUrl, selfieImageUrl, licenseNumber, fullName }) => {
  const licensePath = urlToLocalPath(licenseImageUrl);
  const selfiePath = urlToLocalPath(selfieImageUrl);
  if (!licensePath || !selfiePath) {
    const error = new Error('License or selfie image file could not be found on the server.');
    error.status = 404;
    throw error;
  }

  const { response, model } = await generateWithFallback({
    config: {
      responseMimeType: 'application/json',
      systemInstruction:
        'You are a KYC (know-your-customer) fraud review assistant for a Philippine vehicle rental platform. ' +
        'You are shown a driver\'s license photo and a live selfie submitted by the same user during identity verification. ' +
        'Assess whether the submission looks genuine, flagging any signs of tampering, screen photography, mismatched face, ' +
        'blurry/illegible details, or a mismatch between the stated license number and what is visible. ' +
        'You are assisting a human admin who makes the final decision — never claim certainty, describe what you observe. ' +
        RESULT_SCHEMA_INSTRUCTIONS,
    },
    contents: [
      { text: `Applicant name: ${fullName || 'unknown'}\nStated license number: ${licenseNumber || 'unknown'}\n\nDriver's license photo:` },
      fileToImagePart(licensePath),
      { text: 'Live selfie photo:' },
      fileToImagePart(selfiePath),
    ],
  });

  return { ...parseAiJson(response.text || ''), model };
};

const analyzeVehiclePhotos = async ({ imageUrls, title, brand, model, vehicleType, plateNumber }) => {
  const localPaths = (imageUrls || []).map(urlToLocalPath).filter(Boolean).slice(0, 4);
  if (!localPaths.length) {
    const error = new Error('No vehicle photo files could be found on the server.');
    error.status = 404;
    throw error;
  }

  const { response, model: usedModel } = await generateWithFallback({
    config: {
      responseMimeType: 'application/json',
      systemInstruction:
        'You are a listing-fraud review assistant for a Philippine (Cebu) vehicle rental platform. ' +
        'You are shown photos an owner submitted as proof of an actual vehicle they are listing for rent. ' +
        'Assess whether the photos look like real, original photos of one consistent, distinct vehicle matching the stated ' +
        'brand/model/type, and flag signs of stock photography, watermarks, screenshots of other listings/ads, ' +
        'inconsistent vehicles across the photos, or heavy editing. ' +
        'You are assisting a human admin who makes the final decision — never claim certainty, describe what you observe. ' +
        RESULT_SCHEMA_INSTRUCTIONS,
    },
    contents: [
      {
        text: `Listing title: ${title || 'unknown'}\nStated brand/model: ${brand || ''} ${model || ''}\nStated type: ${vehicleType || 'unknown'}\nPlate number: ${plateNumber || 'unknown'}\n\nVehicle photos:`,
      },
      ...localPaths.map(fileToImagePart),
    ],
  });

  return { ...parseAiJson(response.text || ''), model: usedModel };
};

module.exports = { analyzeLicenseVerification, analyzeVehiclePhotos };
