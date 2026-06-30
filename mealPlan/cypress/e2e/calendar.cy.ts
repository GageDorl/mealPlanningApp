describe('Calendar', () => {
  before(() => {
    cy.task('seedTestData');
  });

  beforeEach(() => {
    cy.login();
    cy.visit('/calendar');
  });

  it('displays the weekly calendar', () => {
    // Should show day headers (Mon–Sun or similar)
    cy.contains('Mon').should('be.visible');
    cy.contains('Today').should('be.visible');
  });

  it('navigates to the next week', () => {
    cy.contains('Today').invoke('text').then((todayLabel) => {
      cy.get('[aria-label="Next week"]').click();
      // Today chip should no longer be visible after navigating forward
      cy.contains('Today').should('not.exist');
      // Navigate back
      cy.get('[aria-label="Previous week"]').click();
      cy.contains('Today').should('be.visible');
    });
  });

  it('shows macros summary for the day', () => {
    cy.contains('Calories').should('be.visible');
  });

  it('shows the home screen dashboard', () => {
    cy.visit('/');
    cy.contains('Good').should('be.visible'); // greeting
    cy.contains('Calories').should('be.visible'); // macro card
  });
});
