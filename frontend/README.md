# ResearchReel web app

Next.js frontend for ResearchReel. See the [project README](../README.md) for
setup; in short:

```bash
cp .env.example .env.local   # point NEXT_PUBLIC_API_URL at the API
npm install
npm run dev                  # http://localhost:3000
```

- `src/app/` — routes (App Router)
- `src/lib/api/` — typed client for the backend API; all data comes from here
- `src/components/` — shared UI
- `src/lib/routes.ts` — which pages are public and which need a session
