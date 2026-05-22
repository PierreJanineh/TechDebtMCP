---
title: Custom Rules
outline: deep
---

# Custom Rules

Custom rules let you define project-specific regex patterns without forking the server. They live in `.techdebtrc.json` at your project root.

## Schema

```json
{
  "rules": [
    {
      "id": "no-fixme-tickets",
      "name": "FIXME without ticket reference",
      "pattern": "FIXME(?!\\s*\\[[A-Z]+-\\d+\\])",
      "flags": "g",
      "severity": "medium",
      "category": "code-quality",
      "description": "Every FIXME must reference a ticket like FIXME [TEC-42].",
      "suggestion": "Add a ticket reference: FIXME [TEC-42] ...",
      "effort": "trivial",
      "tags": ["process"],
      "include": ["src/**/*.ts"],
      "exclude": ["src/**/__tests__/**"]
    }
  ]
}
```

## Field reference

| Field        | Required | Notes                                                                 |
| ------------ | -------- | --------------------------------------------------------------------- |
| `id`         | ✅       | Stable identifier; must be unique within the file.                    |
| `name`       | ✅       | Short title shown in issue output.                                    |
| `pattern`    | ✅       | Regex string, max **1,000 chars**. Use `escapeRegExp` if interpolating user data. |
| `flags`      | —        | Subset of `dgimsuvy`. `u` and `v` are mutually exclusive.             |
| `severity`   | ✅       | `critical` \| `high` \| `medium` \| `low`.                            |
| `category`   | ✅       | One of the eight categories — see below.                              |
| `effort`     | —        | `trivial` \| `small` \| `medium` \| `large` \| `xlarge`.              |
| `include`    | —        | Glob array — file paths the rule applies to.                          |
| `exclude`    | —        | Glob array — file paths the rule skips.                               |

### Categories

`dependency` · `code-quality` · `architecture` · `documentation` · `testing` · `security` · `performance` · `maintainability`

## Inline suppression

Suppress false positives at the source — no need to disable the rule globally.

```ts
// techdebt-ignore-next-line debugger
debugger;
```

For blocks:

```ts
// techdebt-ignore-start no-fixme-tickets
// ...
// techdebt-ignore-end no-fixme-tickets
```

**Always name the rule** — bare `// techdebt-ignore-next-line` silences every check on that line and hides real issues.

## Validating a pattern

Don't commit a rule blind — validate the regex first via the `validate_custom_pattern` MCP tool. See its [reference page](/tools/validate-custom-pattern).

## Running custom rules

The `execute_custom_rules` tool runs every rule from `.techdebtrc.json` over a project root. See the [tool reference](/tools/execute-custom-rules).

## Security limits

Custom rules carry guardrails to prevent ReDoS and runaway scans:

- Patterns capped at **1,000 chars** (`MAX_PATTERN_LENGTH`).
- Code chunks capped at **500,000 chars** (`MAX_CODE_LENGTH`).
- Files larger than **500,000 bytes** (`MAX_FILE_SIZE_BYTES`) are skipped.

See [Security Model](/security) for the full threat surface.
