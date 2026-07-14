#!/usr/bin/env node
/**
 * Builds the Expo web app with test Supabase credentials from .env.test.
 * Output goes to dist/ (same as the regular export:web build).
 * Run this before cy:open / cy:run so Cypress hits the test Supabase project.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envTestPath = path.join(__dirname, '..', '.env.test');

if (!fs.existsSync(envTestPath)) {
  console.error('ERROR: .env.test not found.');
  console.error('Create mealPlan/.env.test with your test Supabase credentials:');
  console.error('');
  console.error('  EXPO_PUBLIC_SUPABASE_URL=https://<test-project>.supabase.co');
  console.error('  EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...');
  console.error('  EXPO_PUBLIC_POWERSYNC_URL=<same as .env or empty>');
  console.error('  EXPO_PUBLIC_SPOONACULAR_API_KEY=<same as .env>');
  process.exit(1);
}

const envVars = {};
const content = fs.readFileSync(envTestPath, 'utf8');
for (const line of content.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) continue;
  const key = trimmed.slice(0, eqIndex).trim();
  const value = trimmed.slice(eqIndex + 1).trim();
  envVars[key] = value;
}

const requiredKeys = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];
for (const key of requiredKeys) {
  if (!envVars[key]) {
    console.error(`ERROR: ${key} is missing or empty in .env.test`);
    process.exit(1);
  }
}

const env = { ...process.env, ...envVars };

console.log(`Building with Supabase URL: ${envVars['EXPO_PUBLIC_SUPABASE_URL']}`);
execSync('npx expo export --platform web --clear', { env, stdio: 'inherit', cwd: path.join(__dirname, '..') });
execSync('node scripts/patch-web-dist.js', { env, stdio: 'inherit', cwd: path.join(__dirname, '..') });
console.log('\nTest build complete. Run: npm run cy:open');
