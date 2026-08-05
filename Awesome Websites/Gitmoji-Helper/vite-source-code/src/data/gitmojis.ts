// Source dataset for gitmoji mappings. Each entry has a rich `text` field
// (used to generate the embedding) plus display fields used in the UI.
// Keep `text` natural-language and specific — that's what drives match quality.

export interface GitmojiEntry {
  emoji: string;
  type: string;
  description: string;
  aliases: string[];
  /** Combined text used to compute the embedding. Not shown in UI. */
  text: string;
}

const raw: Omit<GitmojiEntry, "text">[] = [
  { emoji: "🎨", type: "style", description: "Improve structure or formatting of the code, no logic change.", aliases: ["structure", "formatting", "layout", "organize code", "prettier", "code style pass"] },
  { emoji: "⚡️", type: "perf", description: "Improve performance.", aliases: ["speed up", "optimize", "faster", "performance", "reduce bundle size", "shrink bundle", "smaller payload"] },
  { emoji: "🔥", type: "refactor", description: "Remove code or files.", aliases: ["delete code", "remove files", "cleanup unused code"] },
  { emoji: "🐛", type: "fix", description: "Fix a bug.", aliases: ["bug", "error", "issue", "broken", "repair", "crash", "not working"] },
  { emoji: "🚑️", type: "fix", description: "Critical hotfix.", aliases: ["hotfix", "urgent fix", "critical bug", "production down"] },
  { emoji: "✨", type: "feat", description: "Introduce new features.", aliases: ["new feature", "add capability", "implement", "new page", "new ui option", "dark mode", "add setting"] },
  { emoji: "📝", type: "docs", description: "Add or update documentation.", aliases: ["docs", "readme", "documentation", "comments in docs"] },
  { emoji: "🚀", type: "chore", description: "Deploy or ship stuff.", aliases: ["deploy", "deployment", "release to production", "ship", "deployment pipeline", "publish build"] },
  { emoji: "💄", type: "style", description: "Update the UI or styling, visual/cosmetic changes.", aliases: ["ui", "css", "styling", "visual polish", "colors", "theme"] },
  { emoji: "🎉", type: "chore", description: "Begin a project, initial commit.", aliases: ["initial commit", "project setup", "scaffold project"] },
  { emoji: "✅", type: "test", description: "Add, update, or pass tests.", aliases: ["tests", "unit test", "add test coverage"] },
  { emoji: "🔒️", type: "fix", description: "Fix security or privacy issues.", aliases: ["security fix", "privacy", "vulnerability", "patch security hole"] },
  { emoji: "🔐", type: "chore", description: "Add or update secrets.", aliases: ["secrets", "api keys", "credentials", "env variables"] },
  { emoji: "🔖", type: "chore", description: "Release or version tags.", aliases: ["version bump", "release tag", "changelog version"] },
  { emoji: "🚨", type: "fix", description: "Fix compiler or linter warnings.", aliases: ["linter warnings", "compiler warnings", "eslint errors", "type errors", "resolve warnings"] },
  { emoji: "🚧", type: "wip", description: "Work in progress, not finished yet.", aliases: ["wip", "in progress", "unfinished", "draft commit"] },
  { emoji: "💚", type: "ci", description: "Fix the continuous integration build.", aliases: ["fix ci", "fix build pipeline", "green build"] },
  { emoji: "⬇️", type: "chore", description: "Downgrade dependencies.", aliases: ["downgrade dependency", "revert package version"] },
  { emoji: "⬆️", type: "chore", description: "Upgrade dependencies to newer versions.", aliases: ["upgrade dependency", "bump package version", "update packages", "bump react version", "update to latest major version"] },
  { emoji: "📌", type: "chore", description: "Pin dependencies to a specific version.", aliases: ["pin dependency version", "lock package version"] },
  { emoji: "👷", type: "ci", description: "Add or update CI configuration or build system.", aliases: ["ci config", "github actions", "build pipeline setup"] },
  { emoji: "📈", type: "feat", description: "Add or update analytics or tracking code.", aliases: ["analytics", "tracking", "telemetry", "metrics", "usage metrics"] },
  { emoji: "♻️", type: "refactor", description: "Refactor code without changing behavior.", aliases: ["refactor", "restructure code", "clean up implementation", "simplify logic", "clean up auth flow", "simplify login flow", "reduce nested conditionals", "simplify a function"] },
  { emoji: "➕", type: "chore", description: "Add a dependency.", aliases: ["add dependency", "install package", "add library"] },
  { emoji: "➖", type: "chore", description: "Remove a dependency.", aliases: ["remove dependency", "uninstall package", "drop library"] },
  { emoji: "🔧", type: "chore", description: "Add or update configuration files.", aliases: ["config file", "settings", "tsconfig", "eslint config"] },
  { emoji: "🔨", type: "chore", description: "Add or update development scripts.", aliases: ["dev scripts", "build scripts", "tooling scripts"] },
  { emoji: "🌐", type: "feat", description: "Internationalization and localization.", aliases: ["i18n", "l10n", "translations", "multi-language support"] },
  { emoji: "✏️", type: "docs", description: "Fix typos.", aliases: ["typo", "spelling mistake", "fix text error"] },
  { emoji: "💩", type: "refactor", description: "Improve or rewrite bad code.", aliases: ["bad code", "messy code", "technical debt cleanup"] },
  { emoji: "⏪️", type: "revert", description: "Revert changes.", aliases: ["revert commit", "undo change", "roll back"] },
  { emoji: "🔀", type: "merge", description: "Merge branches.", aliases: ["merge branch", "merge pull request"] },
  { emoji: "📦️", type: "build", description: "Add or update compiled build output or packaged distribution files, not about making the bundle smaller.", aliases: ["build output", "compiled files", "distribution files", "packaged output"] },
  { emoji: "👽️", type: "fix", description: "Update code due to external API changes.", aliases: ["external api change", "third party api update", "breaking upstream change"] },
  { emoji: "🚚", type: "refactor", description: "Move or rename files, paths, or routes.", aliases: ["move file", "rename file", "rename folder", "reorganize files", "change route path"] },
  { emoji: "📄", type: "chore", description: "Add or update license.", aliases: ["license file", "copyright"] },
  { emoji: "💥", type: "feat", description: "Introduce breaking changes.", aliases: ["breaking change", "backwards incompatible", "api break"] },
  { emoji: "🍱", type: "chore", description: "Add or update assets such as images, icons, or fonts.", aliases: ["assets", "images", "icons", "fonts"] },
  { emoji: "♿️", type: "accessibility", description: "Improve accessibility.", aliases: ["accessibility", "a11y", "screen reader support", "aria labels"] },
  { emoji: "💡", type: "docs", description: "Add or update source code comments.", aliases: ["code comments", "inline documentation"] },
  { emoji: "🍻", type: "feat", description: "Write code drunkenly or experimentally, playful coding.", aliases: ["experimental code", "playful hack"] },
  { emoji: "💬", type: "feat", description: "Add or update text and literals, copywriting.", aliases: ["ui text", "copywriting", "strings", "labels"] },
  { emoji: "🗃️", type: "db", description: "Perform database related changes, schema or migrations.", aliases: ["database", "schema change", "migration", "sql", "add index to table", "database performance index"] },
  { emoji: "🔊", type: "chore", description: "Add or update logs.", aliases: ["logging", "add logs", "debug output"] },
  { emoji: "🔇", type: "chore", description: "Remove logs.", aliases: ["remove logging", "remove debug output"] },
  { emoji: "👥", type: "chore", description: "Add or update contributors.", aliases: ["contributors list", "credits"] },
  { emoji: "🚸", type: "ux", description: "Improve user experience or usability flow.", aliases: ["ux", "usability", "user flow", "improve interaction"] },
  { emoji: "🏗️", type: "arch", description: "Make architectural changes.", aliases: ["architecture change", "restructure system design"] },
  { emoji: "📱", type: "style", description: "Work on responsive design.", aliases: ["responsive design", "mobile layout", "media queries"] },
  { emoji: "🤡", type: "test", description: "Add or update mocks.", aliases: ["mock data", "test mocks", "stub"] },
  { emoji: "🥚", type: "feat", description: "Add or update an easter egg.", aliases: ["easter egg", "hidden feature"] },
  { emoji: "🙈", type: "chore", description: "Add or update .gitignore file.", aliases: ["gitignore", "ignore files"] },
  { emoji: "📸", type: "test", description: "Add or update snapshot tests.", aliases: ["snapshot test", "visual regression test"] },
  { emoji: "⚗️", type: "experiment", description: "Perform experiments or prototypes.", aliases: ["experiment", "prototype", "spike", "proof of concept"] },
  { emoji: "🔍️", type: "seo", description: "Improve SEO.", aliases: ["seo", "search engine optimization", "meta tags"] },
  { emoji: "🏷️", type: "types", description: "Add or update types, e.g. TypeScript types.", aliases: ["typescript types", "type definitions", "type annotations"] },
  { emoji: "🌱", type: "db", description: "Add or update seed files for the database.", aliases: ["seed data", "database seed script"] },
  { emoji: "🚩", type: "feat", description: "Add, update, or remove feature flags used to gradually roll out or gate a feature behind a release toggle.", aliases: ["feature flag", "release toggle", "kill switch", "gate a rollout", "a/b test flag"] },
  { emoji: "🥅", type: "fix", description: "Catch errors, add error handling.", aliases: ["error handling", "catch exception", "try catch"] },
  { emoji: "💫", type: "style", description: "Add or update animations and transitions.", aliases: ["animation", "transition", "motion effects"] },
  { emoji: "🗑️", type: "refactor", description: "Deprecate code that needs to be cleaned up.", aliases: ["deprecate", "mark for removal", "obsolete code"] },
  { emoji: "🛂", type: "feat", description: "Work on authorization, roles, and permissions.", aliases: ["auth", "authorization", "roles", "permissions", "access control"] },
  { emoji: "🩹", type: "fix", description: "Apply a simple, non-critical fix.", aliases: ["minor fix", "small patch", "quick fix"] },
  { emoji: "🧐", type: "chore", description: "Data exploration or inspection.", aliases: ["data exploration", "inspect data", "debugging investigation"] },
  { emoji: "⚰️", type: "refactor", description: "Remove dead code.", aliases: ["dead code", "unused code removal"] },
  { emoji: "🧪", type: "test", description: "Add a failing test.", aliases: ["failing test", "red test", "reproduce bug with test"] },
  { emoji: "👔", type: "feat", description: "Add or update business logic.", aliases: ["business logic", "domain rules"] },
  { emoji: "🩺", type: "feat", description: "Add or update health checks.", aliases: ["health check", "readiness probe", "liveness probe"] },
  { emoji: "🧱", type: "infra", description: "Make infrastructure related changes.", aliases: ["infrastructure", "devops", "terraform", "cloud config"] },
  { emoji: "🧑‍💻", type: "dx", description: "Improve developer experience or local development workflow, including onboarding docs for setting up the dev environment.", aliases: ["developer experience", "dx", "tooling improvement", "local dev setup", "onboarding docs", "getting started guide"] },
  { emoji: "💸", type: "feat", description: "Add sponsorships or financial/funding infrastructure.", aliases: ["sponsorship", "funding", "billing", "payments infrastructure"] },
  { emoji: "🧵", type: "refactor", description: "Add or update multithreading or concurrency code.", aliases: ["multithreading", "concurrency", "parallelism", "async workers"] },
  { emoji: "🦺", type: "feat", description: "Add or update validation logic.", aliases: ["validation", "input validation", "form validation", "sanitize input"] },
  { emoji: "✈️", type: "feat", description: "Improve offline support.", aliases: ["offline support", "offline mode", "service worker cache"] },
  { emoji: "🦖", type: "refactor", description: "Add backwards compatibility.", aliases: ["backwards compatibility", "legacy support"] },
];

export const GITMOJIS: GitmojiEntry[] = Array.from(
  new Map(
    raw.map((r) => [
      `${r.emoji}-${r.type}`,
      {
        ...r,
        text: `${r.type}: ${r.description} Examples: ${r.aliases.join(", ")}.`,
      },
    ])
  ).values()
);
