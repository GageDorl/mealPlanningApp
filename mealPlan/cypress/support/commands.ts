/// <reference path="./index.d.ts" />

// Logs in via the UI and caches the session so subsequent specs skip the flow
Cypress.Commands.add('login', () => {
  cy.session(
    'testUser',
    () => {
      cy.visit('/sign-in');
      cy.env(['TEST_USER_EMAIL', 'TEST_USER_PASSWORD']).then(({ TEST_USER_EMAIL, TEST_USER_PASSWORD }) => {
        cy.get('input[placeholder="Email"]').type(TEST_USER_EMAIL as string);
        cy.get('input[placeholder="Password"]').type(TEST_USER_PASSWORD as string, { log: false });
        cy.contains('[role="button"]', 'Sign in').click();
        // Wait until we've left the sign-in screen
        cy.url().should('not.include', 'sign-in', { timeout: 30000 });
      });
    },
    {
      validate() {
        // Session is still valid if we can reach the home screen without redirect
        cy.visit('/');
        cy.url().should('not.include', 'about').and('not.include', 'sign-in');
      },
    },
  );
});

export {};
