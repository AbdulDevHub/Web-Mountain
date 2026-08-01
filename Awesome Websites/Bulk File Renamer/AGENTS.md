# AGENTS.md

## Repository Architecture & Deployment

- **Mono-Repo Project Structure**: The `vite-source-code/` directory contains the source code for this Vite-based project within a larger mono-repository.
- **Automated Netlify Build Workflow**: Netlify automatically builds all Vite-based projects into their parent output directories upon pushing to `main`.
- **No Compiled `dist` Commits**: Because Netlify compiles and places build outputs in the parent directory automatically upon deployment, compiled `dist` files must not be committed to version control.

## Guidelines for AI Agents

1. **Source Code Location**: All source files, configuration, and dependencies for this application reside inside `vite-source-code/`. When developing, testing, or modifying code, work inside the `vite-source-code/` directory.
2. **Build Outputs**: Do not commit compiled build artifacts or `dist` directories to Git. For reference, the dist folder is produced as `file-renamer/` instead of `dist/` to give the acutal website a cleaner URL path.
