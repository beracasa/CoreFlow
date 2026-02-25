const fs = require('fs');

async function run() {
  const url = 'https://eujtldssxdafrlhllnto.supabase.co/rest/v1/machines?select=id,name,maintenance_plans';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1anRsZHNzeGRhZnJsaGxsbnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODA5MTEsImV4cCI6MjA4NTk1NjkxMX0.yzsR6cycFoONceJJY0jdWAl7pdFGlhgZSEFzIvGOGeY';
  
  const res = await fetch(url, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }});
  const data = await res.json();
  
  data.forEach(m => {
    if (m.maintenance_plans && m.maintenance_plans.length > 0) {
      console.log(`Machine: ${m.name}`);
      console.log(`Plans: ${JSON.stringify(m.maintenance_plans, null, 2)}`);
    }
  });
}

run();
