// Pressable renders as <div role="button"> in React Native Web.
// Use cy.contains('[role="button"]', text) to avoid matching page title text.
describe('Authentication', () => {
  before(() => {
    cy.task('seedTestData');
  });

  it('shows the marketing page for unauthenticated users', () => {
    cy.visit('/');
    cy.contains('Prepd').should('be.visible');
    cy.contains('[role="button"]', 'Sign In').should('be.visible');
    cy.contains('[role="button"]', 'Get Started').should('be.visible');
  });

  it('navigates to sign-in screen', () => {
    cy.visit('/about');
    cy.contains('[role="button"]', 'Sign In').click();
    cy.url().should('include', 'sign-in');
    cy.get('input[placeholder="Email"]').should('be.visible');
    cy.get('input[placeholder="Password"]').should('be.visible');
  });

  it('shows an error for invalid credentials', () => {
    cy.visit('/sign-in');
    cy.get('input[placeholder="Email"]').type('notreal@example.com');
    cy.get('input[placeholder="Password"]').type('wrongpassword', { log: false });
    cy.contains('[role="button"]', 'Sign in').click();
    cy.contains('Invalid login credentials').should('be.visible');
  });

  it('signs in successfully and lands on the home screen', () => {
    cy.visit('/sign-in');
    cy.env(['TEST_USER_EMAIL', 'TEST_USER_PASSWORD']).then(({ TEST_USER_EMAIL, TEST_USER_PASSWORD }) => {
      cy.get('input[placeholder="Email"]').type(TEST_USER_EMAIL as string);
      cy.get('input[placeholder="Password"]').type(TEST_USER_PASSWORD as string, { log: false });
      cy.contains('[role="button"]', 'Sign in').click();
      cy.url().should('not.include', 'sign-in', { timeout: 30000 });
      cy.contains('Good').should('be.visible');
    });
  });

  it('navigates to sign-up screen', () => {
    cy.visit('/about');
    cy.contains('[role="button"]', 'Get Started').click();
    cy.url().should('include', 'sign-up');
  });
});
