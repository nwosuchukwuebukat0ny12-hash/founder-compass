
-- RLS policies for milestones
CREATE POLICY "Authenticated users can view milestones"
ON public.milestones FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert milestones"
ON public.milestones FOR INSERT TO authenticated WITH CHECK (true);

-- RLS policies for documents
CREATE POLICY "Authenticated users can view documents"
ON public.documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert documents"
ON public.documents FOR INSERT TO authenticated WITH CHECK (true);

-- Storage policies for test-vault bucket
CREATE POLICY "Authenticated users can upload to test-vault"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'test-vault');

CREATE POLICY "Authenticated users can view test-vault files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'test-vault');
