# Temporary workaround for https://github.com/sxzz/rolldown-plugin-dts/issues/95#issuecomment-3350067001
find lib -name "*.d.ts" -o -name "*.d.mts" | xargs sed -i '' 's/import { Octokit } from "@octokit\/rest" with { "resolution-mode": "import" };/import type { Octokit } from "@octokit\/rest" with { "resolution-mode": "import" };/g'
