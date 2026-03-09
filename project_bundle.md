# PulseMap - Project Bundle for Claude AI

This document contains the source code and configuration for the PulseMap project.

## Project Structure
```text
C:\Users\onurc\Downloads\pulsemap-fixed\pulsemap_fixed\
├── .env.example
├── package.json
├── server.ts
├── vite.config.ts
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── index.css
    ├── components/
    │   ├── AuthModal.tsx
    │   ├── BreakingAlertSystem.tsx
    │   ├── CommandPalette.tsx
    │   ├── DashboardPortal.tsx
    │   ├── EmailPreviewModal.tsx
    │   ├── EmptyState.tsx
    │   ├── ErrorBoundary.tsx
    │   ├── EventCard.tsx
    │   ├── ExportMenu.tsx
    │   ├── GlobalActivityLog.tsx
    │   ├── HeatmapLayer.tsx
    │   ├── Map.tsx
    │   ├── OnboardingTour.tsx
    │   ├── RegionPreferencesModal.tsx
    │   ├── RegionSelectionModal.tsx
    │   ├── RiskMatrix.tsx
    │   ├── SEOHead.tsx
    │   ├── Sidebar.tsx
    │   ├── TimelineView.tsx
    │   ├── TutorialOverlay.tsx
    │   └── admin/
    │       ├── EventModal.tsx
    │       └── NotificationsPanel.tsx
    ├── hooks/
    │   └── useSocket.ts
    ├── i18n/
    │   ├── config.ts
    │   └── locales/
    │       ├── en/translation.json
    │       └── tr/translation.json
    ├── lib/
    │   ├── alerts.ts
    │   ├── analytics.ts
    │   ├── anomalyScore.ts
    │   ├── auth.tsx
    │   ├── exportUtils.ts
    │   ├── notifications.ts
    │   ├── queryClient.ts
    │   ├── sentry.ts
    │   └── supabase.ts
    ├── mocks/
    │   ├── browser.ts
    │   └── handlers.ts
    ├── pages/
    │   ├── Landing.tsx
    │   ├── MapApplication.tsx
    │   └── admin/
    │       ├── Dashboard.tsx
    │       └── Login.tsx
    └── store/
        ├── activityStore.ts
        ├── alertStore.ts
        ├── authStore.ts
        ├── filterStore.ts
        └── mapStore.ts
```

---

## File: package.json
```json
{
  "name": "react-example",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "start": "cross-env NODE_ENV=production tsx server.ts",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist",
    "lint": "eslint . && tsc --noEmit",
    "format": "prettier --write .",
    "test": "vitest",
    "test:e2e": "playwright test",
    "prepare": "husky"
  },
  "dependencies": {
    "@sentry/react": "^10.42.0",
    "@supabase/supabase-js": "^2.98.0",
    "@tailwindcss/vite": "^4.1.14",
    "@tanstack/react-query": "^5.90.21",
    "@tanstack/react-query-devtools": "^5.91.3",
    "express": "^4.21.2",
    "leaflet": "^1.9.4",
    "react": "^19.0.0",
    "socket.io": "^4.8.3",
    "vite": "^6.2.0",
    "zustand": "^5.0.11"
  }
}
```

---

## File: server.ts (Partial)
```typescript
import 'dotenv/config';
import express from 'express';
import Parser from 'rss-parser';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const PORT = 3000;
const httpServer = createServer(app);
const io = new Server(httpServer, { ... });

// News feeds and intelligence gathering logic...
```

---

## File: vite.config.ts
```typescript
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({ ... })
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, '.') },
    }
  };
});
```

---

## File: .env.example
```text
APP_URL="MY_APP_URL"
NEWSAPI_KEY="YOUR_NEWSAPI_KEY"
```

---

> [!NOTE]
> This bundle contains all core logic for the PulseMap Tactical Intelligence System.
