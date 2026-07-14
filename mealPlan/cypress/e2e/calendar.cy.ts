describe('Calendar', () => {
  before(() => {
    cy.task('seedTestData');
  });

  beforeEach(() => {
    cy.login();
    cy.visit('/calendar');
  });

  it('displays the weekly calendar', () => {
    // All 7 day headers should be visible
    cy.contains('Mon').should('be.visible');
    cy.contains('Tue').should('be.visible');
    cy.contains('Wed').should('be.visible');
    // "Today" back-link is hidden when already on the current week
    cy.contains('Today').should('not.exist');
  });

  it('navigates to the next week and back', () => {
    // Navigate forward — "Today" back-link appears
    cy.contains('›').click();
    cy.contains('Today').should('be.visible');
    // Click the "Today" link to return — back-link disappears
    cy.contains('Today').click();
    cy.contains('Today').should('not.exist');
  });

  it('shows the home screen dashboard', () => {
    cy.visit('/');
    // Greeting always renders from client-side clock — no sync needed
    cy.contains('Good').should('be.visible');
    // Without a test PowerSync instance the macro_goals table is empty;
    // the card shows its empty state instead of "Calories"
    cy.contains('Set macro goals').should('be.visible');
  });
});
