import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { MongoRateLimitStore } from '../../shared/rate-limit-store.js';
import { PlannerRequestModel } from '../../models/planner-request.model.js';
import { listPublishedListings } from '../listings/listing.service.js';
import { generate } from './ai-client.js';

export const aiRouter = Router();

const chatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().trim().min(1).max(1000) }).strict()).min(1).max(30),
}).strict();

/** The real catalogue, so the assistant only ever recommends what can be booked. */
async function catalogueForChat() {
  const groups = await Promise.all((['hotel', 'homestay', 'car', 'tour'] as const).map((type) => listPublishedListings({ type, page: 1, limit: 40, sort: 'recommended' } as any)));
  return groups.flatMap((group: any) => group.data).map((item: any) => `${item.id} | ${item.type} | ${item.title} | ${item.location} | PKR ${item.price} ${item.type === 'car' ? 'per day' : item.type === 'tour' ? 'per person' : 'per night'}`).join('\n');
}

const CHAT_RULES = `You are the GBBookings trip assistant, for travel in Gilgit-Baltistan, Pakistan. You chat like a friendly local travel expert.
How to talk:
- Short messages: 1 to 3 sentences, plain text, no markdown, no headings.
- Ask one question at a time. Before suggesting a plan, find out where or what they like, dates or how many days, how many people and their budget. Skip anything they already told you.
- When you know enough, give a short day-by-day plan and recommend places from the catalogue.
- Reply in the language the traveller uses (English, Urdu or Roman Urdu).
- Stay on travel. Politely decline anything else.
Recommending listings:
- Only recommend listings from the catalogue below, and put the id in double square brackets right after the name, like: Hunza Serena [[lst_example]]. The site shows it as a card.
- Never invent a place to stay, a price, or availability. Prices are starting prices; availability is confirmed when they pick dates on the listing.
- If nothing in the catalogue fits, say so.
Catalogue (id | type | title | location | price):
`;

const chatLimit = (windowMs: number, limit: number, prefix: string, message: string, keyGenerator?: () => string) => rateLimit({
  windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false, store: new MongoRateLimitStore(prefix), passOnStoreError: false,
  message: { error: { code: 'AI_RATE_LIMITED', message } },
  ...(keyGenerator ? { keyGenerator } : {}),
});
const perVisitor = chatLimit(60 * 60_000, 40, 'ai:', 'You have sent a lot of messages. Please try again in an hour.');
// Rotating addresses cannot empty the Gemini quota: this one is shared by everybody.
const perDay = chatLimit(24 * 60 * 60_000, 1_000, 'ai-day:', 'The trip assistant is resting for today. Please try again tomorrow.', () => 'all');

aiRouter.post('/chat', perVisitor, perDay, validate('body', chatSchema), asyncHandler(async (request, response) => {
  const reply = await generate('trip-planner', undefined, {
    system: CHAT_RULES + await catalogueForChat(), temperature: 0.6,
    contents: request.body.messages.map((message: { role: string; text: string }) => ({ role: message.role === 'assistant' ? 'model' as const : 'user' as const, text: message.text })),
  });
  // Saved for the Super Admin's AI planner page. Best effort: a failed save never breaks the guest's chat.
  const firstQuestion = request.body.messages.find((message: { role: string }) => message.role === 'user')?.text ?? '';
  PlannerRequestModel.create({
    request: firstQuestion.slice(0, 1_000), reply: reply.slice(0, 500),
    listings: [...reply.matchAll(/\[\[(lst_[0-9a-f-]+)\]\]/gi)].map((match) => match[1]),
  }).catch(() => undefined);
  response.json({ reply });
}));
