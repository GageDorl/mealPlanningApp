export const DietaryTags = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'keto',
  'paleo',
  'pescatarian',
  'halal',
  'kosher',
  'low-carb',
  'low-fat',
  'high-protein',
  'whole30',
  'mediterranean',
] as const;

export type DietaryTag = (typeof DietaryTags)[number];

export const DietaryTagLabels: Record<DietaryTag, string> = {
  'vegetarian': 'Vegetarian',
  'vegan': 'Vegan',
  'gluten-free': 'Gluten Free',
  'dairy-free': 'Dairy Free',
  'nut-free': 'Nut Free',
  'keto': 'Keto',
  'paleo': 'Paleo',
  'pescatarian': 'Pescatarian',
  'halal': 'Halal',
  'kosher': 'Kosher',
  'low-carb': 'Low Carb',
  'low-fat': 'Low Fat',
  'high-protein': 'High Protein',
  'whole30': 'Whole30',
  'mediterranean': 'Mediterranean',
};
