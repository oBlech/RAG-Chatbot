# RAG Document Chat

A modern RAG (Retrieval-Augmented Generation) app that lets you upload PDF documents and chat with them. Ask questions, get answers based on your documents - it's like having a conversation with your PDFs!

## What It Does

- 📄 **Upload PDFs**: Drop your documents in the admin panel and they'll be ready to chat with
- 💬 **Ask Questions**: Got a question? Just ask! The AI will find relevant bits from your documents and answer
- 🔍 **Smart Search**: Uses vector embeddings to understand what you're looking for, not just keyword matching
- 🤖 **AI Answers**: Powered by GPT-4o-mini to give you coherent, context-aware responses

## Tech Stack

**Backend:**
- FastAPI for the API
- Inngest for background processing
- Qdrant as the vector database
- OpenAI for embeddings and chat
- LlamaIndex for PDF parsing

**Frontend:**
- React with Vite
- Tailwind CSS for styling
- Axios for API calls

## Getting Started

### Prerequisites

You'll need:
- Python 3.13+ (we use `uv` for package management)
- Node.js and npm (for the frontend)
- Docker (for Qdrant)
- An OpenAI API key

### Step 1: Install Dependencies

First, install the Python dependencies:

```bash
uv sync
```

Then set up your environment variables. Create a `.env` file in the root directory:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### Step 2: Start Qdrant

You need Qdrant running as a vector database. The easiest way is with Docker:

```bash
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

This will start Qdrant on `http://localhost:6333`. The app is already configured to connect to this by default.

### Step 3: Start the Backend

Now start the FastAPI server:

```bash
uv run uvicorn main:app --reload
```

The API will be running at `http://localhost:8000`.

### Step 4: Start Inngest Dev Server

In a separate terminal, start the Inngest dev server:

```bash
npx inngest-cli@latest dev -u http://127.0.0.1:8000/api/inngest --no-discovery
```

This lets Inngest functions run properly in development mode.

### Step 5: Start the Frontend

Open another terminal, navigate to the frontend directory, and start the dev server:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### Quick Start Summary

Once everything is set up, you'll have three terminals running:

1. **Terminal 1** - Qdrant: `docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant`
2. **Terminal 2** - Backend: `uv run uvicorn main:app --reload`
3. **Terminal 3** - Inngest: `npx inngest-cli@latest dev -u http://127.0.0.1:8000/api/inngest --no-discovery`
4. **Terminal 4** - Frontend: `cd frontend && npm run dev`

Then open `http://localhost:3000` in your browser and you're good to go!

## How to Use

1. **Upload Documents**: Head to the "Admin Panel" tab and upload some PDF files. The app will process them in the background.

2. **Ask Questions**: Switch to the "Chat" tab and start asking questions about your documents. The AI will find relevant information and give you answers.

3. **Manage Documents**: You can view all your uploaded documents in the Admin Panel and delete any you don't need anymore.

## API Endpoints

If you want to use the API directly:

- `POST /api/query` - Ask a question about your documents
- `POST /api/upload` - Upload a PDF file
- `GET /api/documents` - List all uploaded documents
- `DELETE /api/documents/{source_id}` - Delete a specific document

## How It Works

- Documents are chunked into smaller pieces using LlamaIndex
- Each chunk gets embedded using OpenAI's `text-embedding-3-large` model (3072 dimensions)
- Embeddings are stored in Qdrant for fast similarity search
- When you ask a question, we find the most relevant chunks and use GPT-4o-mini to generate an answer
- Qdrant data is stored locally in the `qdrant_storage/` directory

## Notes

- The app uses Qdrant locally (either via Docker or embedded mode)
- Make sure you have enough OpenAI API credits - embeddings and chat both use the API
- Large PDFs might take a moment to process, especially the first time
