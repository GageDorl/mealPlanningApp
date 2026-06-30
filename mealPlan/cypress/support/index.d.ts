export {};

declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>;
    }
    interface Env {
      TEST_USER_EMAIL: string;
      TEST_USER_PASSWORD: string;
      BASE_URL: string;
    }
  }
}
