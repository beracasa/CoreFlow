const fs = require('fs');

async function check() {
  const url = 'https://eujtldssxdafrlhllnto.supabase.co/rest/v1/machines?select=id,name,maintenance_plans';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1anRsZHNzeGRhZnJsaGxsbnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODA5MTEsImV4cCI6MjA4NTk1NjkxMX0.yzsR6cycFoONceJJY0jdWAl7pdFGlhgZSEFzIvGOGeY';
  
  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  
  const data = await res.json();
  const cortadora = data.find(m => m.name.includes('Cortadora'));
  
  if (cortadora) {
    console.log("Found Cortadora: ", cortadora.name);
    console.log("Maintenance Plans length: ", cortadora.maintenance_plans?.length || 0);
    if (cortadora.maintenance_plans && cortadora.maintenance_plans.length > 0) {
       console.log("Plan JSON: ", JSON.stringify(cortadora.maintenance_plans, null, 2));
    }
  } else {
    console.log("Cortadora not found");
  }
}

check().catch(console.error);
