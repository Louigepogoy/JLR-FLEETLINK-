const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const { uploadDir } = require('../middleware/upload');

// Gemini renames/retires model IDs periodically; override via GEMINI_MODEL in .env if this stops working.
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

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
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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

const parseAiJson = (text) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI response did not contain valid JSON');
  const parsed = JSON.parse(match[0]);
  const riskScore = Math.max(0, Math.min(100, Number(parsed.riskScore) || 0));
  const verdict = ['low_risk', 'medium_risk', 'high_risk'].includes(parsed.verdict)
    ? parsed.verdict
    : (riskScore >= 70 ? 'high_risk' : riskScore >= 30 ? 'medium_risk' : 'low_risk');
  return {
    riskScore,
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

  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    config: {
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

  return { ...parseAiJson(response.text || ''), model: MODEL };
};

const analyzeVehiclePhotos = async ({ imageUrls, title, brand, model, vehicleType, plateNumber }) => {
  const localPaths = (imageUrls || []).map(urlToLocalPath).filter(Boolean).slice(0, 4);
  if (!localPaths.length) {
    const error = new Error('No vehicle photo files could be found on the server.');
    error.status = 404;
    throw error;
  }

  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    config: {
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

  return { ...parseAiJson(response.text || ''), model: MODEL };
};

module.exports = { analyzeLicenseVerification, analyzeVehiclePhotos };
