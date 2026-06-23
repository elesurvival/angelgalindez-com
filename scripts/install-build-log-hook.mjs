import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const hooksDir = join(rootDir, ".git", "hooks");
const prePushHookPath = join(hooksDir, "pre-push");
const postCommitHookPath = join(hooksDir, "post-commit");

if (!existsSync(join(rootDir, ".git"))) {
  console.error("Cannot install hook: .git directory was not found.");
  process.exit(1);
}

mkdirSync(hooksDir, { recursive: true });

const prePushHookScript = `#!/bin/sh
# Auto-installed by npm run install-build-log-hook.
# Final safety check for Workshop Build Activity before pushing this site repo.

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR" || exit 1

exec node "scripts/build-log-pre-push.mjs"
`;

const postCommitHookScript = `#!/bin/sh
# Auto-installed by npm run install-build-log-hook.
# Keeps the Workshop Build Activity JSON fresh after local site commits.

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR" || exit 1

BUILD_LOG_HOOK_CONTEXT=post-commit exec node "scripts/build-log-pre-push.mjs"
`;

writeFileSync(prePushHookPath, prePushHookScript, "utf8");
writeFileSync(postCommitHookPath, postCommitHookScript, "utf8");

try {
  chmodSync(prePushHookPath, 0o755);
  chmodSync(postCommitHookPath, 0o755);
} catch {
  // Windows may ignore POSIX mode bits. Git Bash can still run the hook.
}

console.log(`Installed Workshop build log pre-push hook: ${prePushHookPath}`);
console.log(`Installed Workshop build log post-commit hook: ${postCommitHookPath}`);
