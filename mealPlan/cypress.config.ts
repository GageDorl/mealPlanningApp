import { defineConfig } from 'cypress';
import { seedTestData, cleanFoodLogs } from './cypress/tasks/seed';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8081',
    viewportWidth: 1280,
    viewportHeight: 800,
    defaultCommandTimeout: 10000,
    setupNodeEvents(on) {
      on('task', {
        seedTestData,
        cleanFoodLogs,
      });
    },
  },
});
