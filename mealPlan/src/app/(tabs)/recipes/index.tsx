import { Redirect } from 'expo-router';

export default function RecipesIndex() {
  return <Redirect href="/recipes/saved" />;
}
