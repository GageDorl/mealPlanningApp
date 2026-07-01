import { Schema, Table, column } from '@powersync/react-native';

// Local-only tables — never synced to Supabase, auto-cleaned after 7 days
const cached_recipes = new Table(
  { data: column.text, cached_at: column.text },
  { localOnly: true },
);

const cached_foods = new Table(
  { data: column.text, cached_at: column.text },
  { localOnly: true },
);

const cached_calendar_events = new Table(
  { data: column.text, cached_at: column.text },
  { localOnly: true },
);

const users = new Table({
  email: column.text,
  display_name: column.text,
  auth_method: column.text,
  theme_preference: column.text,
  onboarding_completed: column.integer,
  tutorial_completed: column.integer,
  tutorial_chapters_completed: column.text,
  tier: column.text,
  notification_meal_reminders: column.integer,
  notification_planning_nudges: column.integer,
  notification_macro_checkins: column.integer,
  notification_macro_adjustment: column.integer,
  selected_calendar_ids: column.text,
  calendar_export_enabled: column.integer,
  weight_logs: column.text,
  weight_goal: column.text,
  planner_sex: column.text,
  planner_dob: column.text,
  planner_height_ft: column.integer,
  planner_height_in: column.integer,
  planner_activity_level: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const recipes = new Table({
  user_id: column.text,
  title: column.text,
  description: column.text,
  image_url: column.text,
  prep_minutes: column.integer,
  cook_minutes: column.integer,
  servings: column.integer,
  difficulty: column.text,
  cuisine_type: column.text,
  source_type: column.text,
  source_url: column.text,
  source_api_id: column.text,
  is_favorited: column.integer,
  is_offline_available: column.integer,
  calories_per_serving: column.real,
  protein_per_serving: column.real,
  carbs_per_serving: column.real,
  fat_per_serving: column.real,
  fiber_per_serving: column.real,
  sugar_per_serving: column.real,
  sodium_per_serving: column.real,
  instructions: column.text,
  dietary_tags: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const recipe_ingredients = new Table({
  recipe_id: column.text,
  ingredient_id: column.text,
  raw_text: column.text,
  name: column.text,
  quantity: column.real,
  unit: column.text,
  display_order: column.integer,
  calories: column.real,
  protein: column.real,
  carbs: column.real,
  fat: column.real,
});

const ingredients = new Table({
  name: column.text,
  category: column.text,
  calories_per_100g: column.real,
  protein_per_100g: column.real,
  carbs_per_100g: column.real,
  fat_per_100g: column.real,
  fiber_per_100g: column.real,
  sugar_per_100g: column.real,
  sodium_per_100g: column.real,
  price: column.real,
  created_at: column.text,
});

const meal_plans = new Table({
  user_id: column.text,
  week_start: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const meal_slots = new Table({
  meal_plan_id: column.text,
  recipe_id: column.text,
  label: column.text,
  date: column.text,
  time_of_day: column.text,
  serving_override: column.integer,
  external_event_id: column.text,
  display_order: column.integer,
  icon: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const meal_slot_recipes = new Table({
  meal_slot_id: column.text,
  recipe_id: column.text,
  servings_eaten: column.real,
  display_order: column.integer,
  created_at: column.text,
  updated_at: column.text,
});

const macro_goals = new Table({
  user_id: column.text,
  macro_name: column.text,
  daily_target: column.real,
  unit: column.text,
  display_order: column.integer,
  is_active: column.integer,
  created_at: column.text,
});

const dietary_preferences = new Table({
  user_id: column.text,
  tag: column.text,
  created_at: column.text,
});

const food_logs = new Table({
  user_id: column.text,
  date: column.text,
  label: column.text,
  time_of_day: column.text,
  icon: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const food_log_items = new Table({
  food_log_id: column.text,
  food_name: column.text,
  brand_name: column.text,
  serving_size_amount: column.real,
  serving_size_unit: column.text,
  servings_eaten: column.real,
  calories: column.real,
  protein: column.real,
  carbs: column.real,
  fat: column.real,
  saturated_fat: column.real,
  trans_fat: column.real,
  cholesterol: column.real,
  sodium: column.real,
  dietary_fiber: column.real,
  total_sugar: column.real,
  added_sugar: column.real,
  source: column.text,
  source_id: column.text,
  display_order: column.integer,
  created_at: column.text,
  updated_at: column.text,
});

const personal_foods = new Table({
  user_id: column.text,
  food_name: column.text,
  brand_name: column.text,
  barcode: column.text,
  serving_size_amount: column.real,
  serving_size_unit: column.text,
  calories: column.real,
  protein: column.real,
  carbs: column.real,
  fat: column.real,
  saturated_fat: column.real,
  trans_fat: column.real,
  cholesterol: column.real,
  sodium: column.real,
  dietary_fiber: column.real,
  total_sugar: column.real,
  added_sugar: column.real,
  fatsecret_id: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const pantry_staples = new Table({
  user_id: column.text,
  ingredient_name: column.text,
  quantity: column.real,
  unit: column.text,
  created_at: column.text,
});

const grocery_lists = new Table({
  user_id: column.text,
  meal_plan_id: column.text,
  generated_at: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const grocery_items = new Table({
  grocery_list_id: column.text,
  ingredient_id: column.text,
  name: column.text,
  quantity: column.real,
  unit: column.text,
  category: column.text,
  is_checked: column.integer,
  deficit_note: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const popular_recipes = new Table({
  recipe_id: column.text,
  display_order: column.integer,
  added_by: column.text,
  created_at: column.text,
});

const profiles = new Table({
  user_id: column.text,
  role: column.text,
  created_at: column.text,
  updated_at: column.text,
});

export const AppSchema = new Schema({
  users,
  recipes,
  recipe_ingredients,
  ingredients,
  meal_plans,
  meal_slots,
  meal_slot_recipes,
  macro_goals,
  dietary_preferences,
  food_logs,
  food_log_items,
  personal_foods,
  pantry_staples,
  grocery_lists,
  grocery_items,
  popular_recipes,
  profiles,
  cached_recipes,
  cached_foods,
  cached_calendar_events,
});

export type Database = (typeof AppSchema)['types'];
