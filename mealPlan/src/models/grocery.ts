export interface GroceryItem {
  id: string;
  listId: string;
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  checked: boolean;
  isPantryStaple: boolean;
  assignedRecipeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroceryList {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface PantryStaple {
  id: string;
  userId: string;
  name: string;
  category?: string;
  quantity: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

export const groceryTable = {
  name: 'groceries',
  columns: {
    id: 'text',
    listId: 'text',
    userId: 'text',
    name: 'text',
    quantity: 'real',
    unit: 'text',
    category: 'text',
    checked: 'boolean',
    isPantryStaple: 'boolean',
    assignedRecipeId: 'text',
    createdAt: 'text',
    updatedAt: 'text',
  },
  primaryKey: 'id',
} as const;
