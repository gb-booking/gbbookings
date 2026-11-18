import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';
import { AiFeatureModel, AiUsageModel } from '../../models/console.models.js';
import { AppError, ServiceUnavailableError } from '../../shared/app-error.js';

export const AI_FEATURES = {
  'trip-planner': 'Trip planner (website)',
  assistant: 'Console assistant',
  pricing: 'Pricing intelligence',
  content: 'Content assistant',
  reviews: 'Review intelligence',
  support: 'Support assistant',
  vendor: 'Vendor intelligence',
} as const;
export type AiFeature = keyof typeof AI_FEATURES;

let client: GoogleGenAI | null = null;

/**
 * One Gemini call for a feature: refused when the feature is switched off, and logged (tokens, success) for the
 * AI control center. Suggestions only: callers never apply the answer to data themselves.
 */
export async function generate(feature: AiFeature, userId: string | undefined, request: { system: string; contents: Array<{ role: 'user' | 'model'; text: string }>; temperature?: number; json?: boolean }) {
  if (!env.GEMINI_API_KEY) throw new ServiceUnavailableError('AI is not set up yet: add GEMINI_API_KEY.');
  if (await AiFeatureModel.exists({ feature, enabled: false })) throw new AppError(403, 'AI_FEATURE_OFF', `${AI_FEATURES[feature]} is switched off in the AI control center.`);
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  try {
    const result = await client.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: request.contents.map((item) => ({ role: item.role, parts: [{ text: item.text }] })),
      config: { systemInstruction: request.system, temperature: request.temperature ?? 0.4, ...(request.json ? { responseMimeType: 'application/json' } : {}) },
    });
    if (!result.text) throw new AppError(502, 'AI_EMPTY_RESPONSE', 'The AI provider returned an empty response.');
    await AiUsageModel.create({ feature, userId, tokens: result.usageMetadata?.totalTokenCount ?? 0, ok: true }).catch(() => undefined);
    return result.text;
  } catch (error) {
    await AiUsageModel.create({ feature, userId, ok: false }).catch(() => undefined);
    throw error;
  }
}

/** Parses a JSON answer; a malformed one is reported as a provider error rather than crashing the page. */
export function parseJson<T>(text: string): T {
  try { return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')) as T; }
  catch { throw new AppError(502, 'AI_BAD_RESPONSE', 'The AI answer could not be read. Try again.'); }
}
