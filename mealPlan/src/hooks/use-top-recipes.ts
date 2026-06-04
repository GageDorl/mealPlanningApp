import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { getTopRecipes } from '@/services/recipe-service';
import type { Recipe } from '@/models/recipe';

export function useTopRecipes(limit = 4) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) { setLoading(false); return; }
      try {
        const result = await getTopRecipes(userId, limit);
        if (!cancelled) setRecipes(result);
      } catch {
        // empty array is fine for a dashboard card
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [limit]);

  return { recipes, loading };
}
