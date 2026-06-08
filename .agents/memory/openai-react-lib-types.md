---
name: OpenAI React lib type resolution
description: Why @types/react must be a local devDependency in lib/integrations-openai-ai-react
---

Root `tsconfig.base.json` sets `"types": []`, which disables automatic `@types/*` discovery for all packages in the workspace. This means any workspace lib that imports from `'react'` cannot rely on hoisting — it must declare `@types/react` (and `@types/node` if needed) as its own `devDependencies` and install them explicitly.

**Why:** pnpm's strict isolation + TypeScript's `types: []` base setting means no ambient type auto-include from parent node_modules.

**How to apply:** When copying the `ai-integrations-openai-ai-react` template, always add to its `package.json`:
```json
"devDependencies": {
  "@types/node": "catalog:",
  "@types/react": "catalog:"
}
```
Also set `"jsx": "react-jsx"` in that lib's tsconfig compilerOptions. Do NOT add `"types": ["react", "node"]` to the tsconfig — that re-enables the lookup restriction and fails the same way. Let module resolution find them normally.
