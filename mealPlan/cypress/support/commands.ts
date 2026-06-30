declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>;
    }
  }
}

// Logs in via the UI and caches the session so subsequent specs skip the flow
Cypress.Commands.add('login', () => {
  cy.session(
    'testUser',
    () => {
      cy.visit('/sign-in');
      cy.get('input[placeholder="Email"]').type(Cypress.env('TEST_USER_EMAIL'));
      cy.get('input[placeholder="Password"]').type(Cypress.env('TEST_USER_PASSWORD'));
      cy.contains('Sign in').click();
      // Wait until we've left the sign-in screen
      cy.url().should('not.include', 'sign-in');
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
