import type { TutorialChapter } from '@/types/tutorial';

export const TUTORIAL_CHAPTERS: TutorialChapter[] = [
  {
    id: 'welcome',
    title: 'Welcome to Bento',
    icon: '👋',
    estimatedMinutes: 1,
    slides: [
      {
        type: 'info',
        illustrationKey: 'welcome-splash',
        title: 'Welcome to Bento',
        body: 'Bento helps you plan meals, track macros, and build a grocery list — all in one place.',
      },
      {
        type: 'info',
        illustrationKey: 'feature-grid',
        title: 'Everything in one place',
        body: 'From meal planning and recipes to nutrition tracking and shopping, Bento connects every part of your food routine.',
      },
      {
        type: 'info',
        illustrationKey: 'chapter-list',
        title: "Here's what we'll cover",
        body: "We'll walk you through the key features so you can hit the ground running. Each chapter takes about a minute.",
      },
    ],
  },
  {
    id: 'macros',
    title: 'Macros & Nutrition',
    icon: '🥗',
    estimatedMinutes: 2,
    slides: [
      {
        type: 'info',
        illustrationKey: 'macro-breakdown',
        title: 'What are macros?',
        body: 'Macros — protein, carbs, and fat — are the three nutrients that make up every calorie you eat. Tracking them helps you reach your body goals faster.',
      },
      {
        type: 'info',
        illustrationKey: 'macro-dashboard',
        title: 'Your daily dashboard',
        body: 'Bento shows your calorie ring and macro bars each day so you can see exactly how your meals stack up against your goals.',
      },
      {
        type: 'action',
        componentKey: 'macro-goals',
        title: 'Set your macro goals',
        body: 'Tell Bento about your body and goals — it will calculate your daily calorie and macro targets automatically.',
        skippable: true,
      },
      {
        type: 'action',
        componentKey: 'dietary-prefs',
        title: 'Your food preferences',
        body: 'Select any dietary styles you follow. Bento uses these to filter recipes and give better suggestions.',
        skippable: true,
      },
      {
        type: 'info',
        illustrationKey: 'food-log',
        title: 'Logging food',
        body: 'Tap any time slot on the Calendar to log a meal. Search by food name, scan a barcode, or enter manually. Recipes you plan to the calendar already count toward your daily totals.',
      },
      {
        type: 'info',
        illustrationKey: 'recalibration',
        title: 'Adaptive recalibration',
        body: 'After 7 days of data, Bento can suggest adjustments to your targets based on your actual eating patterns.',
      },
    ],
  },
  {
    id: 'meal-planning',
    title: 'Meal Planning',
    icon: '📅',
    estimatedMinutes: 2,
    slides: [
      {
        type: 'info',
        illustrationKey: 'weekly-calendar',
        title: 'Your weekly planner',
        body: 'The Calendar tab shows a full week at a glance. Swipe left or right to move between weeks, and pinch to zoom the time grid.',
      },
      {
        type: 'info',
        illustrationKey: 'add-meal-slot',
        title: 'Adding meal slots',
        body: 'Tap any time slot to create a meal — give it a name, set a time, and pick an icon. You can add as many meals per day as you like.',
      },
      {
        type: 'info',
        illustrationKey: 'assign-recipe',
        title: 'Assign a recipe',
        body: 'Tap a meal slot to assign a recipe from your library. Bento pulls the macros automatically so your daily totals stay accurate.',
      },
      {
        type: 'info',
        illustrationKey: 'adjust-servings',
        title: 'Adjust servings',
        body: 'Each meal slot lets you change the serving count. Scale a recipe up or down and the macros update instantly.',
      },
      {
        type: 'action',
        componentKey: 'calendar-connect',
        title: 'Sync with your calendar',
        body: 'Connect your device calendar to see meal plans alongside your existing events and reminders.',
        skippable: true,
      },
      {
        type: 'info',
        illustrationKey: 'calendar-sync',
        title: 'How sync works',
        body: 'Meal slots create calendar events automatically. Events from your calendar show up on the Bento grid so nothing overlaps.',
      },
    ],
  },
  {
    id: 'recipes',
    title: 'Recipes',
    icon: '📖',
    estimatedMinutes: 1,
    slides: [
      {
        type: 'info',
        illustrationKey: 'recipe-library',
        title: 'Your recipe library',
        body: 'The Recipes tab holds every recipe you have saved, imported, or created. Search by name or filter by favorites.',
      },
      {
        type: 'info',
        illustrationKey: 'recipe-search',
        title: 'Search millions of recipes',
        body: 'Find inspiration from a huge database. Filter by cuisine, diet type, or prep time to narrow things down fast.',
      },
      {
        type: 'info',
        illustrationKey: 'recipe-import',
        title: 'Import from any website',
        body: 'Found a recipe online? Paste the URL and Bento uses AI to extract the full ingredient list, steps, and nutrition info.',
      },
      {
        type: 'info',
        illustrationKey: 'recipe-builder',
        title: 'Create your own',
        body: 'Build a recipe from scratch. Add ingredients one by one — Bento looks up the macros per ingredient and totals them for each serving.',
      },
    ],
  },
  {
    id: 'grocery',
    title: 'Grocery List',
    icon: '🛒',
    estimatedMinutes: 1,
    slides: [
      {
        type: 'info',
        illustrationKey: 'grocery-generated',
        title: 'Auto-built from your meal plan',
        body: 'Bento reads your planned meals for the week and builds a shopping list automatically — no manual entry needed.',
      },
      {
        type: 'info',
        illustrationKey: 'grocery-pantry',
        title: 'Pantry staples',
        body: 'Mark ingredients you always keep at home. Bento skips those when generating your list so you only buy what you actually need.',
      },
      {
        type: 'info',
        illustrationKey: 'grocery-checklist',
        title: 'Checking off items',
        body: 'Items are grouped by category. Check them off as you shop and watch the progress bar fill up.',
      },
      {
        type: 'info',
        illustrationKey: 'grocery-regenerate',
        title: 'Always up to date',
        body: 'Change your meal plan and tap regenerate — your grocery list updates to match whatever is on your calendar for the week.',
      },
    ],
  },
];

export const CHAPTER_COUNT = TUTORIAL_CHAPTERS.length;

export function getChapterById(id: string): TutorialChapter | undefined {
  return TUTORIAL_CHAPTERS.find((c) => c.id === id);
}

export function getChapterIndex(id: string): number {
  return TUTORIAL_CHAPTERS.findIndex((c) => c.id === id);
}

export function getNextChapterId(id: string): string | null {
  const index = getChapterIndex(id);
  if (index === -1 || index === TUTORIAL_CHAPTERS.length - 1) return null;
  return TUTORIAL_CHAPTERS[index + 1].id;
}
