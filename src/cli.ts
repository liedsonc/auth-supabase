#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import { execSync, spawnSync } from 'child_process';

const SQL_FILE = '001_initial_schema.sql';

function getSqlPath(): string {
  const pkgRoot = path.join(__dirname, '..');
  return path.join(pkgRoot, 'sql', SQL_FILE);
}

function hasSupabaseCli(): boolean {
  try {
    execSync('supabase --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function runViaSupabaseCli(sqlPath: string): boolean {
  const result = spawnSync('supabase', ['db', 'execute', '-f', sqlPath], {
    stdio: 'inherit',
    shell: true,
  });
  return result.status === 0;
}

function printSqlAndInstructions(sqlPath: string): void {
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('\nSupabase CLI not found or not linked. Run this SQL in your Supabase SQL Editor:\n');
  console.log('  https://supabase.com/dashboard/project/_/sql/new\n');
  console.log('--- SQL (copy below) ---\n');
  console.log(sql);
  console.log('\n--- end SQL ---\n');
}

function main(): void {
  const sqlPath = getSqlPath();
  if (!fs.existsSync(sqlPath)) {
    console.error('Migration file not found:', sqlPath);
    process.exit(1);
  }

  if (hasSupabaseCli()) {
    console.log('Running migration via Supabase CLI...');
    if (runViaSupabaseCli(sqlPath)) {
      console.log('Migration completed successfully.');
    } else {
      console.log('Supabase CLI failed. Falling back to manual instructions.\n');
      printSqlAndInstructions(sqlPath);
    }
  } else {
    printSqlAndInstructions(sqlPath);
  }
}

main();
