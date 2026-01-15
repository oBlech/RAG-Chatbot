# RAG Frontend

Modern Next.js frontend for the RAG Document Chat application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The frontend will be available at http://localhost:3000

## Build for Production

```bash
npm run build
npm start
```

The built files will be in the `.next` directory.

## Configuration

The frontend is configured to proxy API requests to the FastAPI backend at `http://localhost:8000` via Next.js rewrites (see `next.config.js`).
