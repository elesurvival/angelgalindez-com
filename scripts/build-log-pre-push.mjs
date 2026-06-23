import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const buildLogPath = "assets/data/build-log.json";
const buildLogFullPath = join(rootDir, buildLogPath);
const commitMessage = "Update Workshop build activity";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const hookContext = process.env.BUILD_LOG_HOOK_CONTEXT || "pre-push";

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    shell: process.platform === "win32" && command.endsWith(".cmd"),
    stdio: options.stdio || ["ignore", "pipe", "pipe"],
  });
}

function hasBuildLogChanges() {
  const status = run("git", ["status", "--porcelain=v1", "--", buildLogPath]);
  return status.trim().length > 0;
}

function readBuildLog() {
  if (!existsSync(buildLogFullPath)) {
    return null;
  }

  return readFileSync(buildLogFullPath, "utf8");
}

function parseItems(jsonText) {
  if (!jsonText) {
    return null;
  }

  try {
    return JSON.parse(jsonText).items || [];
  } catch {
    return null;
  }
}

function sameItems(beforeText, afterText) {
  const beforeItems = parseItems(beforeText);
  const afterItems = parseItems(afterText);

  if (!beforeItems || !afterItems) {
    return false;
  }

  return JSON.stringify(beforeItems) === JSON.stringify(afterItems);
}

function commitBuildLog() {
  run("git", ["add", "--", buildLogPath], { stdio: "inherit" });
  run("git", ["commit", "--only", "-m", commitMessage, "--", buildLogPath], { stdio: "inherit" });
}

function latestCommitSubject() {
  return run("git", ["log", "-1", "--pretty=%s"]).trim();
}

try {
  if (hookContext === "post-commit" && latestCommitSubject() === commitMessage) {
    process.exit(0);
  }

  const previousBuildLog = readBuildLog();

  console.log("Refreshing Workshop build activity...");
  run(npmCommand, ["run", "refresh-build-log"], { stdio: "inherit" });

  const nextBuildLog = readBuildLog();
  if (previousBuildLog && nextBuildLog && sameItems(previousBuildLog, nextBuildLog)) {
    writeFileSync(buildLogFullPath, previousBuildLog, "utf8");
  }

  if (!hasBuildLogChanges()) {
    console.log("Workshop build activity is already current.");
    process.exit(0);
  }

  commitBuildLog();
  console.log("Committed refreshed Workshop build activity.");

  if (hookContext === "pre-push") {
    console.warn("A build-log commit was created during pre-push.");
    console.warn("If this push does not include it, run git push once more.");
  }
} catch (error) {
  console.error(`Workshop build activity ${hookContext} hook failed.`);
  console.error(error.message);
  process.exit(1);
}
