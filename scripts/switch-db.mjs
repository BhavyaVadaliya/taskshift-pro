import fs from 'fs';
import path from 'path';

const target = process.argv[2]; // 'postgres' or 'sqlite'

if (target === 'postgres') {
  fs.copyFileSync(path.resolve('prisma/schema.postgresql.prisma'), path.resolve('prisma/schema.prisma'));
  console.log('✅ Switched prisma/schema.prisma to PostgreSQL target!');
  console.log('👉 Ensure your .env has DATABASE_URL="postgresql://user:pass@host:5432/dbname"');
  console.log('👉 Run "npx prisma db push" or "npx prisma migrate dev" to initialize PostgreSQL.');
} else if (target === 'sqlite') {
  fs.copyFileSync(path.resolve('prisma/schema.sqlite.prisma'), path.resolve('prisma/schema.prisma'));
  console.log('✅ Switched prisma/schema.prisma to SQLite target!');
  console.log('👉 DATABASE_URL="file:./dev.db" in .env');
  console.log('👉 Run "npx prisma db push" to initialize local SQLite database.');
} else {
  console.error('Usage: node scripts/switch-db.mjs [postgres|sqlite]');
  process.exit(1);
}
