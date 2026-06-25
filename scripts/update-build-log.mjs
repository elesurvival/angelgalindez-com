import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(rootDir, "assets", "data", "build-log.json");
const buildLogLimit = 100;
const commitsPerRepo = 100;
const ignoredSubjects = new Set([
  "Update Workshop build activity",
]);

const repos = [
  { project: "Continuo", repo: "Continuo", path: "C:\\Users\\Angel\\Documents\\Continuo" },
  { project: "Echo", repo: "Echo", path: "C:\\Users\\Angel\\Documents\\Echo" },
  { project: "Glimpse", repo: "Glimpse", path: "C:\\Users\\Angel\\Documents\\Glimpse 2" },
  { project: "Tempo", repo: "Tempo", path: "C:\\Users\\Angel\\Documents\\Tempo" },
  { project: "Scriptorium", repo: "scriptorium", path: "C:\\Users\\Angel\\Documents\\scriptorium" },
  {
    project: "AngelGalindez.com",
    repo: "angelgalindez-com",
    path: "C:\\Users\\Angel\\Documents\\angelgalindez-com 2",
  },
  {
    project: "ELE Survival Shopify",
    repo: "elesurvival-shopify",
    path: "C:\\Users\\Angel\\Documents\\elesurvival-shopify",
  },
];

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function formatDate(timestamp) {
  return dateFormatter.format(new Date(timestamp));
}

function formatTime(timestamp) {
  return timeFormatter.format(new Date(timestamp));
}

function resolveLogRef() {
  return "HEAD";
}

function readCommits(repoConfig) {
  const gitDir = join(repoConfig.path, ".git");

  if (!existsSync(repoConfig.path) || !existsSync(gitDir)) {
    return { skipped: true, commits: [] };
  }

  const logRef = resolveLogRef(repoConfig.path);
  const output = execFileSync(
    "git",
    ["log", logRef, `-${commitsPerRepo}`, "--pretty=format:%h%x1f%cI%x1f%s"],
    {
      cwd: repoConfig.path,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  ).trim();

  if (!output) {
    return { skipped: false, commits: [] };
  }

  const commits = output.split(/\r?\n/).flatMap((line) => {
    const [hash, timestamp, message] = line.split("\x1f");

    if (ignoredSubjects.has(message)) {
      return [];
    }

    return [{
      project: repoConfig.project,
      repo: repoConfig.repo,
      hash,
      message,
      date: formatDate(timestamp),
      time: formatTime(timestamp),
      timestamp,
    }];
  });

  return { skipped: false, commits };
}

const scanned = [];
const skipped = [];
const allCommits = [];

for (const repoConfig of repos) {
  try {
    const result = readCommits(repoConfig);

    if (result.skipped) {
      skipped.push(repoConfig.repo);
      console.warn(`Skipped missing repo: ${repoConfig.repo}`);
      continue;
    }

    scanned.push(repoConfig.repo);
    allCommits.push(...result.commits);
  } catch (error) {
    skipped.push(repoConfig.repo);
    console.warn(`Skipped unreadable repo: ${repoConfig.repo} (${error.message})`);
  }
}

const items = allCommits
  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  .slice(0, buildLogLimit);

const buildLog = {
  updated_at: new Date().toISOString(),
  items,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(buildLog, null, 2)}\n`, "utf8");

console.log(`Repos scanned: ${scanned.length}${scanned.length ? ` (${scanned.join(", ")})` : ""}`);
console.log(`Repos skipped: ${skipped.length}${skipped.length ? ` (${skipped.join(", ")})` : ""}`);
console.log(`Commits written: ${items.length}`);
