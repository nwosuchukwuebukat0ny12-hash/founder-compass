-- Allow admins to view all profiles so they can resolve founder user IDs for alerts and nudges
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
