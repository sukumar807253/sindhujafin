import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dhcswkonpypbrmzmqeca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoY3N3a29ucHlwYnJtem1xZWNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTI2NDkyMiwiZXhwIjoyMDgwODQwOTIyfQ.WQF8yoS4aN3CZyEXr7jQT68FF-O6txACA4e1APwtlkw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
