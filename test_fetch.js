import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eujtldssxdafrlhllnto.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1anRsZHNzeGRhZnJsaGxsbnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODA5MTEsImV4cCI6MjA4NTk1NjkxMX0.yzsR6cycFoONceJJY0jdWAl7pdFGlhgZSEFzIvGOGeY'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.from('work_orders').select('*').limit(1)
  if (error) console.error(error)
  else console.log(JSON.stringify(data, null, 2))
}
run()
