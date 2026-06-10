-- Allow moderators and admins to read all public_foods rows (including unapproved)
CREATE POLICY "public_foods_moderator_select" ON public_foods
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('moderator', 'admin')
    )
  );
