# 🧠 Second Brain — RAG Knowledge Management System

A personal knowledge management system powered by a full **3-model NVIDIA NIM RAG pipeline**. Upload your documents and ask questions — get intelligent, source-cited answers backed by semantic search.

**Live Demo:** [second-brain-w40t.onrender.com](https://second-brain-w40t.onrender.com)

---

## ✨ Features

- **📤 Document Upload** — Upload `.txt`, `.md`, and `.pdf` files (up to 10MB)
- **🔢 Semantic Embeddings** — Documents embedded using NVIDIA NIM for true semantic search
- **🎯 Smart Reranking** — Results reranked by relevance before answer generation
- **💬 Intelligent Chat** — Ask natural language questions about your documents
- **📚 Knowledge Base** — Browse, search, and delete uploaded documents
- **📍 Source Attribution** — Every answer cites the exact document it came from
- **🌙 Dark Mode** — Built-in light/dark theme toggle

---

## 🤖 RAG Pipeline

```
📤 UPLOAD TIME
──────────────────────────────────────────
Your Document
      ↓
llama-3.2-nemoretriever-300m-embed-v1   ← converts text → 2048-dim vector
      ↓
Stored in Supabase (pgvector)

💬 QUERY TIME
──────────────────────────────────────────
User Question
      ↓
llama-3.2-nemoretriever-300m-embed-v1   ← embeds the question
      ↓
Supabase pgvector cosine similarity search (top 10)
      ↓
rerank-qa-mistral-4b                    ← reranks by true relevance (top 5)
      ↓
qwen3.5-122b-a10b                       ← generates the final answer
      ↓
Answer + Sources shown to user ✅
```

All 3 models are **free endpoints** on NVIDIA NIM — one API key covers everything.

---

## 🏗️ Tech Stack

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS v4
- TanStack React Query
- Shadcn UI components
- Wouter for routing

**Backend:**
- Python 3.11 + FastAPI
- SQLAlchemy ORM
- pgvector for vector similarity search
- pypdf for PDF parsing

**Infrastructure:**
- Supabase (free PostgreSQL + pgvector)
- NVIDIA NIM (free AI API — embed + rerank + answer)
- Render (deployment)

---

## 📁 Project Structure

```
second-brain/
├── client/                     # React frontend
│   └── src/
│       ├── pages/
│       │   ├── chat.tsx         # Chat interface
│       │   ├── upload.tsx       # File upload
│       │   └── knowledge-base.tsx
│       ├── hooks/
│       │   ├── use-chat.ts
│       │   └── use-documents.ts
│       └── components/
├── server/                     # Python FastAPI backend
│   ├── main.py                 # App entry point
│   ├── routes.py               # API endpoints + RAG pipeline
│   ├── storage.py              # Database operations
│   ├── db.py                   # Supabase connection
│   ├── models.py               # SQLAlchemy models
│   └── requirements.txt
├── shared/
│   └── routes.ts               # API contract (frontend only)
├── render.yaml                 # Render deployment config
└── package.json                # Frontend build scripts
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Supabase account (free)
- NVIDIA NIM API key (free)

### 1. Clone the repo
```bash
git clone https://github.com/SaurabhVerma-007/Second_Brain.git
cd Second_Brain
```

### 2. Set up environment variables
```bash
cp .env.example .env
```

Fill in `.env`:
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
PORT=8000
```

**Get your keys:**
- `DATABASE_URL` → [supabase.com](https://supabase.com) → Project → Settings → Database → URI
- `NVIDIA_API_KEY` → [build.nvidia.com](https://build.nvidia.com) → API Keys → Generate (free)

### 3. Enable pgvector in Supabase
In Supabase SQL Editor, run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4. Install dependencies
```bash
# Python backend
pip install -r server/requirements.txt

# Frontend
npm install
```

### 5. Build frontend & start server
```bash
npm run build
python -m server.main
```

App runs at `http://localhost:8000`

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/documents` | List all documents |
| `POST` | `/api/documents` | Upload and ingest a document |
| `DELETE` | `/api/documents/:id` | Delete a document |
| `POST` | `/api/chat` | Query the knowledge base |

### Chat request/response
```json
// POST /api/chat
{ "query": "What are the assignment deadlines?" }

// Response
{
  "answer": "Based on [Source: doc.pdf], all assignments...",
  "sources": [{ "filename": "doc.pdf", "content": "..." }]
}
```

---

## ☁️ Deploying to Render

1. Push to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set **Runtime** to `Python 3`
4. Set **Build Command:**
   ```
   pip install -r server/requirements.txt && npm install --include=dev && npm run build
   ```
5. Set **Start Command:**
   ```
   uvicorn server.main:app --host 0.0.0.0 --port $PORT
   ```
6. Add environment variables:
   ```
   DATABASE_URL     = your Supabase URI
   NVIDIA_API_KEY   = nvapi-...
   PYTHON_VERSION   = 3.11.9
   NODE_ENV         = production
   ```

---

## 📊 Database Schema

```sql
CREATE TABLE documents (
  id          SERIAL PRIMARY KEY,
  filename    TEXT NOT NULL,
  "fileType"  TEXT NOT NULL,
  content     TEXT NOT NULL,
  embedding   vector(2048),          -- NVIDIA NIM embedding
  "uploadDate" TIMESTAMP DEFAULT NOW()
);
```

---

## 🔒 Security & Privacy

- All data stored in your own Supabase instance
- API keys never exposed to frontend
- No data sharing between users
- File uploads processed server-side and immediately discarded

---

## 🐛 Troubleshooting

**`NVIDIA_API_KEY must be set`**
→ Check your `.env` file exists in the project root with the correct key

**`vector type does not exist`**
→ Run `CREATE EXTENSION IF NOT EXISTS vector;` in Supabase SQL Editor

**Upload fails with `expected 2048 dimensions`**
→ Your documents table has wrong vector size. Run `npm run db:push` after updating schema

**Chat returns no results**
→ Upload documents first. Check Knowledge Base page to confirm they appear

---

## 📄 License

MIT

## 🤝 Contributing

Feel free to fork and customize for your needs!
