-- Allow admins to insert notifications for any founder/user so they can dispatch nudges
CREATE POLICY "Admins can create notifications for any user" 
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
  );
