# 📁 Bulk File Renamer

A fast, responsive, and privacy-focused web application built with **React**, **TypeScript**, and **Vite** for batch renaming files and folders directly in the browser.

---

## ✨ Features

* 📄 **Batch File & Folder Uploads:** Select multiple files or entire folder hierarchies using standard browser picker APIs.
* 🖼️ **Live Asset Previews:** Instant visual previews for image formats (including static frame extraction for GIFs) and file-type badges for standard documents.
* 🔢 **Flexible Renaming Rules:** Bulk rename with custom prefix patterns, dynamic sequence numbers, and customizable start indices.
* 🔀 **Manual & Automatic Sorting:** Order files by **Name**, **Date Modified**, or drag/shift into a custom order using inline controls.
* 📦 **ZIP Export:** Download all renamed assets cleanly packaged into a single `.zip` file using `jszip`.
* ⚡ **Client-Side Privacy:** All file processing and previews happen locally on your device—zero files are ever uploaded to an external server.

---

## 🛠️ Tech Stack

* **Framework:** [React](https://react.dev/)
* **Build Tool:** [Vite](https://vitejs.dev/)
* **Language:** [TypeScript](https://www.typescriptlang.org/)
* **Libraries:** `jszip` (for ZIP generation)
* **Styling:** Custom CSS with dark mode variables & flexible grid layouts

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Clone the repository:**

   ```bash
   git clone <repo-url>
   cd file-renamer

```

2. **Install dependencies:**
```bash
npm install

```

1. **Start the development server:**

```bash
npm run dev

```

1. Open your browser and navigate to `http://localhost:5173`.

---

## 📜 Available Scripts

In the project directory, you can run:

* `npm run dev`: Starts the local development server with Hot Module Replacement (HMR).
* `npm run build`: Compiles and bundles production-ready static assets into the `dist` directory.
* `npm run preview`: Locally previews the production build.
* `npm run lint`: Runs Oxlint checks against project files.

---

## 📁 Project Structure

```text
file-renamer/
├── public/
├── src/
│   ├── components/
│   │   ├── FileCard.tsx       # Individual card view & layout controls
│   │   └── FilePreview.tsx    # Asset preview loader & cache renderer
│   ├── App.tsx                # Main app layout & state management
│   ├── App.css                # Global styles & theme variables
│   ├── main.tsx               # Application entry point
│   └── types.ts               # Shared TypeScript interfaces & types
├── index.html                 # Main HTML root
├── package.json
├── package-lock.json
├── README.md
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── .oxlintrc.json
└── tsconfig.json
