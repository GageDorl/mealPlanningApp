const env = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  POWERSYNC_URL: process.env.EXPO_PUBLIC_POWERSYNC_URL ?? '',
  SPOONACULAR_API_KEY: process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY ?? '',
  USDA_API_KEY: process.env.EXPO_PUBLIC_USDA_API_KEY ?? '',
  RECAL_API_KEY: process.env.RECAL_API_KEY ?? '',
} as const;

export default env;
