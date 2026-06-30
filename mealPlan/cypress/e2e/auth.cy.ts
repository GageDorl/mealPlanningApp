describe('Authentication', () => {
  it('shows the marketing page for unauthenticated users', () => {
    cy.visit('/');
    cy.contains('Prepd').should('be.visible');
    cy.contains('Sign In').should('be.visible');
    cy.contains('Get Started').should('be.visible');
  });

  it('navigates to sign-in screen', () => {
    cy.visit('/about');
    cy.contains('Sign In').click();
    cy.url().should('include', 'sign-in');
    cy.get('input[placeholder="Email"]').should('be.visible');
    cy.get('input[placeholder="Password"]').should('be.visible');
  });

  it('shows an error for invalid credentials', () => {
    cy.visit('/sign-in');
    cy.get('input[placeholder="Email"]').type('notreal@example.com');
    cy.get('input[placeholder="Password"]').type('wrongpassword');
    cy.contains('Sign in').click();
    cy.contains('Invalid').should('be.visible');
  });

  it('signs in successfully and lands on the home screen', () => {
    cy.visit('/sign-in');
    cy.get('input[placeholder="Email"]').type(Cypress.env('TEST_USER_EMAIL'));
    cy.get('input[placeholder="Password"]').type(Cypress.env('TEST_USER_PASSWORD'));
    cy.contains('Sign in').click();
    cy.url().should('not.include', 'sign-in');
    cy.contains('Good').should('be.visible'); // greeting: "Good morning/afternoon/evening,"
  });

  it('navigates to sign-up screen', () => {
    cy.visit('/about');
    cy.contains('Get Started').click();
    cy.url().should('include', 'sign-up');
  });
});
