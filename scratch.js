const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://kbcsmxpxiupjidpqiogk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiY3NteHB4aXVwamlkcHFpb2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjIzNjAsImV4cCI6MjA4NTAzODM2MH0.D2Yak5p_vDlbP9EXjhdKdlxMVS9lHqUv6vUk4FRpyrc'
);

async function run() {
    const { data, error } = await supabase.rpc('get_tables'); // Or just try querying some guessed table names
    
    // Let's just try to query information_schema if possible, but often anon role can't.
    // Instead we can just try to select from 'poll_reactions'
    
    const tryTables = ['poll_reactions', 'reactions', 'debate_reactions'];
    for (const t of tryTables) {
        const { data, error } = await supabase.from(t).select('*').limit(1);
        console.log(t, error ? error.message : 'EXISTS');
    }
}
run();
