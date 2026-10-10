# CoffeeStock Frontend

This repository contains the React + TypeScript foundation for the CoffeeStock user interface.

## Project purpose and current status

The frontend is intentionally limited to the foundation stage of the application. It includes:

- a Vite + React + TypeScript app shell
- a typed API client for the Symfony backend
- environment-based configuration
- a real backend health-check integration
- CI checks for linting, type-checking, tests, and production build

The following are intentionally not implemented in this repository yet:

- inventory workflows and stock movements
- supplier or ingredient management screens
- orders, reporting, dashboards, or authentication
- business-domain logic beyond the API health foundation

## Technology stack

- React 19
- TypeScript
- Vite
- Axios for HTTP requests
- React Router for route structure
- Vitest + Testing Library for automated tests
- ESLint + Prettier for quality gates

## Prerequisites

- Node.js 20 LTS or newer
- npm 10 or newer
- a running Symfony backend on `http://localhost:8000`

## Fresh clone setup

From a fresh clone:

```bash
cd coffeestock-frontend
npm install
```

Create the local environment file from the example:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

## Environment variables

The frontend reads its backend base URL from the `VITE_API_BASE_URL` variable.

Example `.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

If this variable is not set, the application falls back to `http://localhost:8000/api` in the shared API client.

## Local development

Start the frontend development server:

```bash
npm run dev
```

The app is available at:

- `http://localhost:5173`

The backend health endpoint used by the UI is:

- `GET http://localhost:8000/api/health`

## Available commands

```bash
npm run dev
npm run build
npm run lint
npm run format
npm run format:check
npm run type-check
npm run test
npm run preview
```

## Frontend directory structure

```text
coffeestock-frontend/
├── .github/workflows/ci.yml
├── .env.example
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── prettier.config.js
├── README.md
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   └── App.test.tsx
│   ├── services/
│   │   ├── api.ts
│   │   └── health.ts
│   ├── styles/
│   │   └── global.css
│   ├── test/
│   │   └── setup.ts
│   ├── main.tsx
│   └── App.tsx
└── public/
```

## Architectural conventions

- Keep the app shell and route-level UI separate from feature logic.
- Use typed service modules for backend communication.
- Keep API URLs centralized through `src/services/api.ts`.
- Prefer React state and service composition over ad-hoc fetch calls in components.
- Keep the health status screen as a lightweight integration check rather than a business feature.

## Communication with the Symfony API

The frontend uses a centralized Axios client in [src/services/api.ts](./src/services/api.ts). The client reads `VITE_API_BASE_URL` and sets a default base URL of `http://localhost:8000/api`.

The app health screen calls the Symfony backend endpoint:

- `GET /api/health`

The backend response is displayed on the UI and is the current integration proof that the frontend and API are connected locally.

## Troubleshooting

### Backend is not reachable

- Confirm the backend is running on `http://localhost:8000`.
- Open `http://localhost:8000/api/health` directly in a browser or curl.
- Verify `VITE_API_BASE_URL` in `.env`.
- Check that backend CORS allows `http://localhost:5173`.

### Dependency or install issues

- Reinstall dependencies: `rm -rf node_modules package-lock.json && npm install`
- Confirm you are using a supported Node.js version.
- If npm is outdated, update npm before retrying.

### Build or test issues

- Run lint: `npm run lint`
- Run type-check: `npm run type-check`
- Run tests: `npm run test`
- If a test fails unexpectedly, inspect the app shell and health service rather than modifying backend behavior.

### CORS or API connectivity errors

- Verify the backend is listening on port `8000`.
- Check `CORS_ALLOW_ORIGIN` in the backend environment.
- Confirm the frontend uses the correct base URL and that the port is not already occupied by another service.

## GitHub Actions CI

The repository includes a CI workflow at `.github/workflows/ci.yml` that runs:

- `npm ci`
- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build`

## Shared documentation

This repository is intentionally self-contained, but the parent workspace also contains shared documents for the wider CoffeeStock foundation:

- `../README.md`
- `../docs/architecture.md`
- `../docs/api-baseline.md`

Those files are supplemental; the instructions in this README are the required standalone setup guide for this repository.

## Implemented functionality vs planned features

Implemented in the current foundation:

- Vite React app shell
- TypeScript configuration
- API client and error handling
- health endpoint integration
- basic frontend quality gates and automated checks

Planned for later phases:

- inventory pages and stock workflows
- supplier and product management
- order and reporting flows
- authentication and access control
- domain-specific feature modules
