import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repos = [
  { repo: "Continuo", path: "C:\\Users\\Angel\\Documents\\Continuo" },
  { repo: "Echo", path: "C:\\Users\\Angel\\Documents\\Echo" },
  { repo: "Glimpse", path: "C:\\Users\\Angel\\Documents\\Glimpse 2" },
  { repo: "Tempo", path: "C:\\Users\\Angel\\Documents\\Tempo" },
  { repo: "scriptorium", path: "C:\\Users\\Angel\\Documents\\scriptorium" },
  { repo: "angelgalindez-com", path: rootDir },
  { repo: "elesurvival-shopify", path: "C:\\Users\\Angel\\Documents\\elesurvival-shopify" },
  { repo: "trace-app", path: "C:\\Users\\Angel\\Documents\\Trace\\trace-app" },
];
const siteRootForHook = rootDir.replaceAll("\\", "/");

function createPrePushHookScript() {
  return `#!/bin/sh
# Auto-installed by npm run install-build-log-hook.
# Final safety check for Workshop Build Activity before pushing this site repo.

SITE_ROOT="${siteRootForHook}"
cd "$SITE_ROOT" || exit 1

exec node "scripts/build-log-pre-push.mjs"
`;
}

function createPostCommitHookScript() {
  return `#!/bin/sh
# Auto-installed by npm run install-build-log-hook.
# Keeps the Workshop Build Activity JSON fresh after local commits.

SITE_ROOT="${siteRootForHook}"
cd "$SITE_ROOT" || exit 1

BUILD_LOG_HOOK_CONTEXT=post-commit exec node "scripts/build-log-pre-push.mjs"
`;
}

function installHooks(repoConfig) {
  const gitDir = join(repoConfig.path, ".git");

  if (!existsSync(repoConfig.path) || !existsSync(gitDir)) {
    console.warn(`Skipped ${repoConfig.repo}: .git directory was not found.`);
    return false;
  }

  const hooksDir = join(gitDir, "hooks");
  const prePushHookPath = join(hooksDir, "pre-push");
  const postCommitHookPath = join(hooksDir, "post-commit");

  mkdirSync(hooksDir, { recursive: true });
  writeFileSync(prePushHookPath, createPrePushHookScript(), "utf8");
  writeFileSync(postCommitHookPath, createPostCommitHookScript(), "utf8");

  try {
    chmodSync(prePushHookPath, 0o755);
    chmodSync(postCommitHookPath, 0o755);
  } catch {
    // Windows may ignore POSIX mode bits. Git Bash can still run the hook.
  }

  console.log(`Installed Workshop build log hooks for ${repoConfig.repo}: ${hooksDir}`);
  return true;
}

const installedCount = repos.filter(installHooks).length;

console.log(`Installed Workshop build log hooks in ${installedCount} repo(s).`);
