#!/usr/bin/env node
/**
 * Database tooling for the two Supabase projects (same workflow as SwypeCast).
 *
 *   node scripts/db.mjs push [staging|production]    apply supabase/migrations
 *   node scripts/db.mjs types [staging|production]   regenerate src/lib/supabase/types.ts
 *
 * Default target is staging (SUPABASE_STAGING_DB_URL / SUPABASE_STAGING_REF from .env.local).
 * Production migrations normally run in CI on a push to `release`; by hand only in an emergency
 * (SUPABASE_PRODUCTION_DB_URL / SUPABASE_PRODUCTION_REF).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";

if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
const [cmd, targetArg = "staging"] = process.argv.slice(2);
const target = targetArg === "prod" ? "production" : targetArg;
if (!["push", "types"].includes(cmd) || !["staging", "production"].includes(target)) {
  console.error("usage: node scripts/db.mjs <push|types> [staging|production]");
  process.exit(2);
}
const prefix = target === "staging" ? "SUPABASE_STAGING" : "SUPABASE_PRODUCTION";
const dbUrl = process.env[`${prefix}_DB_URL`];
const ref = process.env[`${prefix}_REF`];
if ((cmd === "push" && !dbUrl) || (cmd === "types" && !ref)) {
  console.error(`${prefix}_DB_URL / ${prefix}_REF missing in .env.local`);
  process.exit(2);
}
const run = (args) => {
  console.log(`→ supabase ${args.join(" ").replace(/postgres(ql)?:\/\/[^\s]+/, "postgresql://***")}`);
  const r = spawnSync("npx", ["supabase", ...args], { stdio: cmd === "types" ? ["inherit", "pipe", "inherit"] : "inherit", encoding: "utf8" });
  if (r.status !== 0) process.exit(r.status ?? 1);
  return r.stdout;
};
if (cmd === "push") run(["db", "push", "--db-url", dbUrl, "--yes"]);
else fs.writeFileSync("src/lib/supabase/types.ts", run(["gen", "types", "typescript", "--project-id", ref, "--schema", "public"]));
console.log(`done: ${cmd} → ${target}`);
