describe('Food Logging', () => {
  before(() => {
    cy.task('seedTestData');
  });

  beforeEach(() => {
    cy.task('cleanFoodLogs');
    cy.login();
    cy.visit('/calendar');
  });

  it('opens the log food form for today', () => {
    cy.contains('Log food').click();
    cy.contains('Log Food').should('be.visible');
  });

  it('logs a manual food entry', () => {
    cy.contains('Log food').click();

    // Switch to manual tab
    cy.contains('Manual').click();

    // Fill in food details
    cy.get('input[placeholder="Food name"]').type('Grilled Chicken');
    cy.get('input[placeholder="Calories"]').type('250');
    cy.get('input[placeholder="Protein (g)"]').type('40');
    cy.get('input[placeholder="Carbs (g)"]').type('0');
    cy.get('input[placeholder="Fat (g)"]').type('6');

    // Save
    cy.contains('Add to Log').click();

    // Entry should appear in the calendar
    cy.contains('Grilled Chicken').should('be.visible');
  });

  it('searches for a food via FatSecret and logs it', () => {
    cy.contains('Log food').click();

    // Search tab should be default
    cy.get('input[placeholder*="Search"]').type('banana');
    cy.contains('banana', { matchCase: false }).should('be.visible');

    // Click first result
    cy.get('[data-testid="food-result"]').first().click();

    // Food detail / serving selection should appear
    cy.contains('Add to Log').click();

    // Should appear in calendar
    cy.contains('banana', { matchCase: false }).should('be.visible');
  });
});
