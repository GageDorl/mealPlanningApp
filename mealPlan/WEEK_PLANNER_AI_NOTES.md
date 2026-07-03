# Week Planner — AI Suggestion Engine

Notes on `supabase/functions/suggest-weekly-meals/index.ts`. Kept separate from feature-planning docs so it doesn't go stale the way `WEEK_PLANNER_PLAN.md` did — update this file directly when the edge function's model, chunking, or prompt rules change; don't let a plan doc describe behavior the code has since moved past.

## Model

`claude-haiku-4-5`. Sonnet 5 was tried after real-usage testing surfaced quality failures (see below), and it did fix them — but at Sonnet's per-call cost, 2 concurrent chunk calls per "Get Suggestions" tap worked out to roughly 10-20 cents/tap. Once the prompt was tightened with explicit hard rules (not just "be sensible"), Haiku was retested against the same rules and held up — the original failures were more about missing explicit constraints than raw model capability. Revisit Sonnet only if Haiku's output quality regresses against the current prompt.

## Single call, not chunked

The week is generated in one call, not split into concurrent day-range chunks. Chunking existed originally to stay under Supabase's 150s edge function request-idle timeout, and went through several iterations (7 chunks → 4 → 3 → 2) chasing repeated "failed" reports. Those failures turned out to be a **client-side 15s fetch abort** (`fetchWithTimeout` in `services/supabase.ts`, which wraps every Supabase client call including `functions.invoke()`), not the server-side 150s limit — fixed by having `fetchWeeklySuggestions` (`services/week-planner-service.ts`) bypass the shared client with its own `fetch()` and a 90s timeout. With that fixed, the real 150s server constraint has plenty of headroom for a single full-week call, which also avoids the cross-chunk problem where one chunk can't see what another picked (repetition) and halves the number of paid API calls per tap.

## Prompt rules (why they exist)

Real usage surfaced concrete failures, each fixed with an explicit rule rather than a vague quality instruction:
- **Mixed restaurants in one meal** (e.g. Taco Bell + McDonald's for one Lunch) → rule: if a slot's "buy" items are restaurant orders, they must all come from the same restaurant.
- **Repeating the exact same restaurant order many days in a row** → added a `restaurant: boolean` field per "buy" item. Restaurant/fast-food items are capped at 2 repeats/week; grocery/convenience staples (a daily protein bar + shake) are explicitly fine to repeat — these are different failure modes and needed different rules, not one blanket "don't repeat" instruction.
- **Labeling a home-style dish as a "buy" item** (e.g. "Baked Salmon with Quinoa and Roasted Vegetables" — not a real purchasable product) → hard requirement that "buy" items name a real, purchasable product or restaurant menu item; anything that can't be named that specifically must be a "cook" item instead.

## Output schema is intentionally lean

`reason` is optional and instructed to be a short phrase, not a sentence, included only when non-obvious (repeats a known staple, tight on budget, uses a pantry item) — most meals omit it. Output tokens are the dominant cost driver for this call (macros + cost per item, up to ~3 items per slot, up to 42 slots), so schema verbosity matters more here than the `max_tokens` ceiling does.

## Pantry integration

Pantry staples are fetched **client-side** from local PowerSync state (`getPantryStaples`) and sent in the request body — deliberately not queried server-side from Postgres, since the user may edit their pantry in the same session and a server-side read could lag behind a local edit that hasn't finished syncing yet. The AI uses pantry contents to avoid suggesting a "buy" item that duplicates something already on hand, and as inspiration for "cook" dishes.

The `restaurant` flag also drives `meal_slot_foods.is_grocery_item` — restaurant orders and "cook" items (no ingredient breakdown) are excluded from the grocery list; grocery-purchasable "buy" items are included and flow into `grocery-service.ts`'s `generateList()` alongside recipe ingredients.

## Known gaps

- "Cook" items still have no ingredient breakdown, so they can't appear on the grocery list even though they're real food that needs shopping for. Extending them would mean either asking Claude for a per-dish ingredient list, or promoting them to real saved `Recipe`s.
- FatSecret auto-match for AI "buy" items is silent — the top search result is used with no confirmation step. If mismatches (wrong flavor/brand/size) turn out to be common, consider routing AI "buy" items through `AddFoodItemModal` pre-filled with a search query instead of auto-picking.
