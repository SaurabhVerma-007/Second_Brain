# Second Brain: RAG Knowledge Management System

A personal knowledge management system that uses RAG (Retrieval-Augmented Generation) to capture, store, and retrieve information from your documents. Your "Second Brain" helps you maintain and query your accumulated knowledge over time.

## 🎯 Features

- **📤 Document Upload** - Upload and ingest .txt, .md, and .pdf files
- **💬 Intelligent Chat** - Ask natural language questions about your documents
- **🔍 Smart Search** - Full-text search finds relevant documents for context
- **📚 Knowledge Browser** - View, manage, and delete documents from your collection
- **🤖 AI-Powered Answers** - Uses GPT-4o-mini to generate answers based on your documents
- **📍 Source Attribution** - Always shows which documents were used to answer your question

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (provided by Replit)
- No API keys needed! Uses Replit's built-in OpenAI integration

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Set up the database**
   ```bash
   npm run db:push
   ```

3. **Start the application**
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5000`

## 📖 How to Use

### Uploading Documents

1. Navigate to the **Upload** page
2. Drag and drop files or click "Browse Files" to select documents
3. Supported formats: `.txt`, `.md`, `.pdf` (max 10MB each)
4. Click "Upload & Ingest" to process your documents

The system automatically:
- Extracts text from PDFs
- Chunks documents into manageable pieces (500 tokens with 50-token overlap)
- Stores content in the database for fast retrieval
- Shows a success message when complete

### Asking Questions

1. Go to the **Chat** page
2. Type your question in the input field
3. Press Enter or click the send button
4. The AI will search your documents and generate an answer

The response includes:
- **Answer** - AI-generated response based on your documents
- **Sources** - Click "View Sources" to see which documents were referenced
- **Source Content** - Preview of the relevant text from each document

### Managing Your Knowledge Base

1. Visit the **Knowledge Base** page to see all uploaded documents
2. View statistics: total documents and their types
3. Search documents by filename
4. Delete documents using the trash icon

## 🏗️ Architecture

### How It Works

```
User Query
   ↓
Full-Text Search in PostgreSQL
   ↓
Retrieve Top 5 Relevant Documents
   ↓
Format Context
   ↓
Send to GPT-4o-mini with System Prompt
   ↓
Generate Answer with Source Attribution
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS for styling
- TanStack React Query for data fetching
- React Hook Form for file uploads
- Wouter for routing
- Shadcn UI components

**Backend:**
- Express.js with TypeScript
- PostgreSQL for storage
- Drizzle ORM for database operations
- Multer for file handling
- LangChain for PDF parsing and text chunking
- OpenAI GPT-4o-mini for answer generation

**Infrastructure:**
- Replit AI Integrations (no API key needed)
- Vite for frontend bundling

## 📁 Project Structure

```
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── chat.tsx        # Chat interface
│   │   │   ├── upload.tsx      # File upload
│   │   │   └── knowledge-base.tsx # Document browser
│   │   ├── components/
│   │   │   ├── app-sidebar.tsx # Navigation sidebar
│   │   │   └── layout.tsx      # Layout wrapper
│   │   ├── hooks/
│   │   │   ├── use-chat.ts     # Chat query hook
│   │   │   └── use-documents.ts # Document management
│   │   ├── App.tsx             # Main app component
│   │   └── index.css           # Global styles
├── server/
│   ├── routes.ts              # API endpoints
│   ├── storage.ts             # Database layer
│   ├── index.ts               # Server entry point
│   └── db.ts                  # Database connection
├── shared/
│   ├── schema.ts              # Database schema
│   └── routes.ts              # API contracts
└── package.json
```

## 🔌 API Endpoints

### Documents

**List all documents**
```
GET /api/documents
Response: { filename, fileType, uploadDate }[]
```

**Upload a document**
```
POST /api/documents (multipart/form-data)
Body: { file: File }
Response: { id, filename, message }
```

**Delete a document**
```
DELETE /api/documents/:id
Response: { message }
```

### Chat

**Query your knowledge base**
```
POST /api/chat
Body: { query: string }
Response: {
  answer: string,
  sources: [{ filename, content }, ...]
}
```

## 🔧 Configuration

### Environment Variables

The application uses Replit's built-in OpenAI integration. These are automatically configured:

- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key (set by Replit)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI API endpoint (set by Replit)
- `DATABASE_URL` - PostgreSQL connection string (set by Replit)

No additional setup required!

### Chunk Configuration

Modify these values in `server/routes.ts` if needed:

```typescript
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,        // Tokens per chunk
  chunkOverlap: 50,      // Overlap between chunks
});
```

## 📊 Database Schema

### Documents Table
```sql
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  fileType TEXT NOT NULL,
  content TEXT NOT NULL,
  uploadDate TIMESTAMP DEFAULT NOW()
);
```

Stores metadata and full content of uploaded documents for fast full-text search.

## 🎨 UI/UX Features

- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Real-time Loading States** - Visual feedback during uploads and searches
- **Dark Mode Support** - Built-in light/dark theme toggle
- **Accessible Components** - Keyboard navigation and screen reader support
- **Error Handling** - Clear error messages and graceful fallbacks

## ⚡ Performance Notes

- **Full-Text Search** - Efficient PostgreSQL text search for fast document retrieval
- **Chunking** - Documents split into manageable pieces for better context
- **Caching** - React Query caches documents and chat responses
- **Streaming** - Backend optimized for quick response times

## 🔒 Security & Privacy

- **No External API Keys** - Uses Replit's managed OpenAI integration
- **Local Database** - All data stored in your Replit PostgreSQL
- **File Upload Security** - Only supports text, markdown, and PDF files
- **No Data Tracking** - Queries and documents never leave your instance

## 🚀 Deployment

### Publish to Production

1. Click the **Publish** button in Replit
2. Your app gets a public URL at `https://your-replit-name.replit.dev`
3. All data persists in your PostgreSQL database

### Scaling Considerations

- Current setup handles thousands of documents efficiently
- For millions of documents, consider:
  - Vector embeddings (requires paid OpenAI API)
  - Database indexing optimization
  - Caching layer (Redis)

## 📝 Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run db:push  # Sync database schema
npm run check    # TypeScript type checking
```

### Adding New Features

#### Adding a New Document Type
1. Update `api.documents.upload.path` validation
2. Add parser in `server/routes.ts`
3. Handle in `client/src/pages/upload.tsx`

#### Modifying AI Behavior
1. Edit system prompt in `server/routes.ts`
2. Adjust GPT parameters (model, temperature, tokens)
3. Test in chat interface

#### Database Changes
1. Update schema in `shared/schema.ts`
2. Run `npm run db:push`
3. Update storage layer in `server/storage.ts`

## 🐛 Troubleshooting

### "OPENAI_API_KEY is not configured"
- Ensure you're using Replit's OpenAI integration (already set up)
- Try restarting the workflow
- Check Environment Variables section above

### "Failed to process document"
- Ensure file format is supported (.txt, .md, .pdf)
- Check file size is under 10MB
- Try uploading a smaller file first

### Chat returns no results
- Upload documents first
- Try simpler search queries
- Check documents are in the knowledge base

### Slow queries
- Reduce chunk overlap
- Archive old documents
- Consider document filtering by date

## 🎯 Future Enhancements

Potential additions for v2:

- **Batch Upload** - Upload multiple files at once
- **Document Tagging** - Organize documents with tags
- **Advanced Filters** - Filter by date, type, content
- **Export** - Download knowledge base as JSON
- **Search History** - View past queries
- **Collaborative** - Multi-user support with shared knowledge bases
- **Conversation Memory** - Remember context across chats
- **Voice Input** - Ask questions using voice
- **Document Versioning** - Track document changes over time

## 📄 License

MIT

## 🤝 Contributing

This is a personal project. Feel free to fork and customize for your needs!

## 📧 Support

For issues, questions, or suggestions:
1. Check the Troubleshooting section above
2. Review your document format and content
3. Check Replit logs for detailed error messages

---

**Happy learning! Your Second Brain is ready to store and retrieve your knowledge.** 🧠✨
