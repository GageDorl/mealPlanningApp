// Flow: FAB → Step 1 "Log Food" → Step 2 type label → "Add Food →" → LogFoodForm
// Pressable elements are disabled by GestureHandlerRootView on web.
// Fix: removeAttr('disabled') before clicking any Pressable.
// TextInput/Input renders as <input> and is not affected.

describe('Food Logging', () => {
  before(() => {
    cy.task('seedTestData');
  });

  beforeEach(() => {
    cy.task('cleanFoodLogs');
    cy.login();
    cy.visit('/calendar');
  });

  // Helper: remove RNGH disabled attributes then click
  function pressButton(subject: Cypress.Chainable) {
    return subject
      .invoke('removeAttr', 'disabled')
      .invoke('removeAttr', 'aria-disabled')
      .click();
  }

  function openLogFoodForm() {
    // FAB is a Pressable — remove disabled before click
    pressButton(cy.get('[data-testid="calendar-add-fab"]'));
    // Step 1: Log Food card
    pressButton(cy.contains('Log Food'));
    // Step 2: type a label (chips are Pressables too; use the text input instead)
    cy.get('input[placeholder="Custom label…"]').type('Lunch');
    // "Add Food →" — enabled once label is non-empty
    pressButton(cy.contains('[role="button"]', 'Add Food →'));
  }

  it('opens the log food form', () => {
    openLogFoodForm();
    // Default tab is Search — search input should be visible
    cy.get('input[placeholder="Search foods, brands…"]').should('be.visible');
  });

  it('can switch to the manual entry tab', () => {
    openLogFoodForm();
    // "Manual" tab is also a Pressable
    pressButton(cy.contains('Manual'));
    cy.get('input[placeholder="Food name *"]').should('be.visible');
  });

  it('fills in and submits a manual food entry', () => {
    openLogFoodForm();
    pressButton(cy.contains('Manual'));

    // Only food_name is required for canSubmit
    cy.get('input[placeholder="Food name *"]').type('Grilled Chicken');

    // Macro inputs all share placeholder "–"; find by sibling label text
    cy.contains('Calories (kcal)').parent().find('input[placeholder="–"]').type('250');
    cy.contains('Protein (g)').parent().find('input[placeholder="–"]').type('40');

    // "Log Food" button — enabled because food_name is filled
    pressButton(cy.contains('[role="button"]', 'Log Food'));

    // Form dismisses — search input no longer exists
    cy.get('input[placeholder="Food name *"]').should('not.exist');
  });
});
