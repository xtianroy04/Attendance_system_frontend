import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const file = resolve(process.cwd(), name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const username = process.env.SEED_ADMIN_USERNAME || 'admin';
const password = process.env.SEED_ADMIN_PASSWORD || 'admin123';
const email = process.env.SEED_ADMIN_EMAIL || 'admin@users.attendance.local';

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: existing } = await admin.from('profiles').select('id').ilike('username', username).maybeSingle();
if (existing) {
  console.log(`Admin username "${username}" already exists.`);
  process.exit(0);
}

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { username, role: 'admin' },
});
if (createError || !created.user) {
  console.error(createError?.message || 'Could not create auth user');
  process.exit(1);
}

const { error: profileError } = await admin.from('profiles').insert({
  id: created.user.id,
  username,
  first_name: 'Admin',
  last_name: '',
  email,
  role: 'admin',
  is_active: true,
});
if (profileError) {
  await admin.auth.admin.deleteUser(created.user.id);
  console.error(profileError.message);
  process.exit(1);
}

console.log(`Created admin "${username}" / ${password}`);
console.log('Change this password after first login.');
