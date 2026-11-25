/**
 * Run store service-log imports from CSVs written under tmp/service-log-sync/.
 *
 * Expected files (from data/service-log-sources.json csvName):
 *   moultrie-wo-live.csv, live-oak-wo-live.csv, fitzgerald-wo-live.csv,
 *   unadilla-wo-live.csv, rbia-wo-live.csv
 *
 * Usage: node scripts/sync-service-logs.cjs
 * Optional: node scripts/sync-service-logs.cjs --store=Moultrie
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "service-log-sources.json"), "utf8"));
const SYNC_DIR = path.join(ROOT, "tmp", "service-log-sync");
const STATE_PATH = path.join(SYNC_DIR, "last-run.json");

const onlyStore = (process.argv.find((arg) => arg.startsWith("--store=")) || "").slice("--store=".length);

function runImport(source) {
  const csvPath = path.join(SYNC_DIR, source.csvName);
  if (!fs.existsSync(csvPath)) {
    return { store: source.store, skipped: true, reason: `missing ${source.csvName}` };
  }
  const script = path.join(ROOT, "scripts", source.importScript);
  const result = spawnSync(process.execPath, [script, csvPath], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  });
  return {
    store: source.store,
    skipped: false,
    status: result.status,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function main() {
  fs.mkdirSync(SYNC_DIR, { recursive: true });
  const sources = CONFIG.sources.filter((source) => !onlyStore || source.store === onlyStore);
  const results = sources.map(runImport);
  const summary = {
    ranAt: new Date().toISOString(),
    results: results.map((row) => ({
      store: row.store,
      skipped: row.skipped,
      reason: row.reason || null,
      status: row.status ?? null,
      log: row.stdout || row.stderr || null,
    })),
  };
  fs.writeFileSync(STATE_PATH, JSON.stringify(summary, null, 2));
  for (const row of results) {
    if (row.skipped) {
      console.log(`${row.store}: skipped (${row.reason})`);
      continue;
    }
    console.log(`\n=== ${row.store} (exit ${row.status}) ===`);
    if (row.stdout) console.log(row.stdout);
    if (row.stderr) console.error(row.stderr);
  }
  const failed = results.filter((row) => !row.skipped && row.status !== 0);
  if (failed.length) process.exit(1);
}

main();
