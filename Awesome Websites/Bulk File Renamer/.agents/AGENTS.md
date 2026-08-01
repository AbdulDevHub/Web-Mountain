# Project-Scoped Agent Rules

- **Mono-Repo Structure**: The `vite-source-code/` directory contains the source code for this project.
- **Automated Netlify Deployment**: Netlify automatically builds all Vite-based projects into their parent output directories upon pushing to `main`.
- **No `dist` Commits**: Do not commit compiled build artifacts or `dist` files to source control.
- **Development Location**: Ensure all source edits and project commands target the `vite-source-code/` directory.
