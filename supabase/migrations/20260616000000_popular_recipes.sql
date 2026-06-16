-- App-wide configuration (single row, admin-managed)
CREATE TABLE IF NOT EXISTS app_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  popular_recipes_max INT NOT NULL DEFAULT 20,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_config (id, popular_recipes_max) VALUES (1, 20)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config_select" ON app_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "app_config_update" ON app_config
  FOR UPDATE TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Hand-curated popular recipes list (mods pick, admins set the cap)
CREATE TABLE IF NOT EXISTS popular_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (recipe_id)
);

ALTER TABLE popular_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "popular_recipes_select" ON popular_recipes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "popular_recipes_insert" ON popular_recipes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')));

CREATE POLICY "popular_recipes_update" ON popular_recipes
  FOR UPDATE TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')));

CREATE POLICY "popular_recipes_delete" ON popular_recipes
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')));
