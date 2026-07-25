// Boots `next dev` against the isolated Supabase test branch (.env.test.local)
// instead of the production database in .env.local, for manual UAT.
require('dotenv').config({ path: '.env.test.local' });
const { spawn } = require('child_process');

const child = spawn('npx', ['next', 'dev'], { stdio: 'inherit', env: process.env, shell: true });
child.on('exit', code => process.exit(code ?? 0));
