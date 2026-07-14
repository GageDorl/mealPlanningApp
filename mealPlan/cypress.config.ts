import { defineConfig } from 'cypress';
import { seedTestData, cleanFoodLogs } from './cypress/tasks/seed';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 800,
    defaultCommandTimeout: 20000,
    pageLoadTimeout: 60000,
    setupNodeEvents(on, config) {
      // Bridge cypress.env.json into process.env so tasks can read CYPRESS_* vars.
      for (const [key, value] of Object.entries(config.env)) {
        process.env[`CYPRESS_${key}`] = String(value);
      }
      on('task', {
        seedTestData,
        cleanFoodLogs,
      });
    },
  },
});
