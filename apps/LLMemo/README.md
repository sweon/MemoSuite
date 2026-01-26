# 🧠 LLMemo (Local LLM Memory)

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Dexie](https://img.shields.io/badge/Dexie.js-local--first-blue)](https://dexie.org/)
[![PWA](https://img.shields.io/badge/PWA-Installable-hotpink)](https://web.dev/progressive-web-apps/)

**LLMemo** is a Local-first Progressive Web App (PWA) designed to systematically log, manage, and store your LLM interaction results and knowledge. All data is kept securely within your own browser with threading support and seamless device-to-device synchronization.

---

## ✨ Key Features

### 📂 Smart Organization
- **Threads**: Group multiple logs into a single conversation thread using intuitive drag-and-drop.
- **Smart Deletion**: When deleting a thread header, choose between deleting the entire thread or just the specific log.
- **Tags**: Instantly find logs using tags or specific models (tag:tag or tag:model).

### 🔄 Seamless Sync & Privacy
- **Direct Peer-to-Peer Sync**: Synchronize your data directly between your own devices without relying on central servers, through a secure P2P mechanism.
- **Local-first Architecture**: All data is stored in the browser's IndexedDB (via Dexie.js). Your logs stay private and never leave your control.
- **Offline Capable**: Fully functional without an internet connection. Install it as a standalone app on both desktop and mobile.

### 🎨 Premium UX/UI
- **Theme Support**: Includes both Dark and Light modes with global font-size adjustments.
- **Bilingual Interface**: Fully localized support for both English and Korean.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- npm or yarn

### Installation
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/sweon/LLMemo.git
    cd LLMemo
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start development server:**
    ```bash
    npm run dev
    ```

4.  **Build for production:**
    ```bash
    npm run build
    ```

---

## 🛠 Tech Stack
- **Frontend**: React (TypeScript), Vite
- **Styling**: Styled-components
- **Database**: Dexie.js (IndexedDB)
- **Drag & Drop**: @hello-pangea/dnd
- **Icons**: React-icons (Feather)
- **Date Handling**: date-fns

---

## 📜 Deployment
This project is configured for automatic deployment to GitHub Pages via GitHub Actions. Simply push your changes, and they will be built and deployed as an updated PWA.

---

## ⚖️ License
Distributed under the **GPL v3 License**.

---
*Developed with ❤️ regarding Privacy & Productivity.*
