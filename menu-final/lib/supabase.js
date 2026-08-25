import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrhaxhfxpzukcrvjxhwk.supabase.co';
const supabaseKey = 'sb_publishable_5Psbvdz2Aq-P73MpoHMxTQ_8VpusSq5';

export const supabase = createClient(supabaseUrl, supabaseKey);
