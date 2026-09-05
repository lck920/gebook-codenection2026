import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";

const provider = createOpenAICompatible({
  name: process.env.AI_PROVIDER!, baseURL: process.env.AI_BASE_URL!, apiKey: process.env.AI_API_KEY!,
});
const model = provider(process.env.AI_MODEL!);

// 21 tools, matching what the app actually sends — the token cost that matters.
const filler = Object.fromEntries(
  ["checkWeather","placeNearby","placeDetail","routeCompute","routeMatrix","reviewLookup",
   "airbnbSearch","airbnbListingDetails","readTripMedia","renameTrip","addDay","deleteDay",
   "updateDay","reorderDays","updateStop","moveStop","appendStopNote","addExpense","updateExpense"]
   .map((n) => [n, tool({
     description: `Tool ${n} for the OpenTrip planning agent.`,
     inputSchema: z.object({ day: z.number().optional(), name: z.string().optional(), query: z.string().optional(), lat: z.number().optional(), lng: z.number().optional() }),
     execute: async () => ({ ok: true }),
   })]),
);

let searches = 0, inserts = 0;
const tools = {
  ...filler,
  placeSearch: tool({
    description: "Search for real places by name, biased near a coordinate.",
    inputSchema: z.object({ query: z.string(), lat: z.number().optional(), lng: z.number().optional() }),
    execute: async ({ query }) => { searches++; return { results: [{ id: "p1", name: query, lat: 40.758, lng: -73.9855, label: `${query}, New York, USA` }] }; },
  }),
  insertStop: tool({
    description: "Insert a stop into a day of the trip.",
    inputSchema: z.object({ day: z.number(), index: z.number(), name: z.string(), time: z.string(), lat: z.number().optional(), lng: z.number().optional() }),
    execute: async ({ name }) => { inserts++; return { ok: true, stop: { name } }; },
  }),
};

for (const run of [1, 2]) {
  searches = 0; inserts = 0;
  const t0 = Date.now();
  try {
    const r = await generateText({
      model,
      system: `You are the OpenTrip trip agent in a write-capable chat.
Research with placeSearch before inventing coordinates, then call insertStop for each planned stop.
Trip "USA trip", 5 days from 2026-09-11, 0 stops, 2 people.`,
      messages: [{ role: "user", content: "Jane Doe: @agent plan day 1 in New York for me — add 3 stops with times." }],
      tools,
      stopWhen: stepCountIs(8),
    });
    console.log(`run ${run}: ${((Date.now()-t0)/1000).toFixed(1)}s | steps ${r.steps.length} | placeSearch ${searches} | insertStop ${inserts} | ${r.finishReason}`);
  } catch (e) {
    console.log(`run ${run}: FAILED after ${((Date.now()-t0)/1000).toFixed(1)}s -> ${(e as Error).message.slice(0, 160)}`);
  }
}
