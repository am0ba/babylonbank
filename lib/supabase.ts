import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fcwlypuanoiysafawyec.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjd2x5cHVhbm9peXNhZmF3eWVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ2MDgwNiwiZXhwIjoyMDkzMDM2ODA2fQ.amKL5fL4WsTyJYrGN0z_Zr2Ddv9tpPZRs2LN5ivztfs';

export const supabase = createClient(supabaseUrl, supabaseKey);
