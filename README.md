# tinyChat

> A lightweight real-time AI chat backend powered by PocketBase and FastAPI.

`tinyChat` is a compact chat backend that separates real-time data handling from AI business logic. PocketBase manages the chat data layer, collections, authentication, and real-time updates, while a Python FastAPI service receives webhooks, generates AI responses, and writes messages back through the PocketBase REST API.

The project is designed to be small, clear, and easy to extend. With a single Docker Compose command, you can run a local development environment and start building chatbot workflows, LLM integrations, RAG pipelines, internal support assistants, or automation-driven chat experiences.

## Architecture

```text
Client / PocketBase UI
        |
        v
PocketBase
  - realtime database
  - auth / collections
  - message records
        |
        | webhook: message created
        v
FastAPI AI Engine
  - webhook receiver
  - AI response logic
  - PocketBase REST write-back
        |
        v
PocketBase messages collection
```

## Tech Stack

| Layer | Technology | Role |
| --- | --- | --- |
| Real-time backend | PocketBase | Chat data, collections, authentication, real-time events |
| AI service | FastAPI | Webhook handling, AI response generation, business logic |
| HTTP client | httpx | PocketBase REST API requests |
| HTTPS Tunneling | Cloudflare Tunnel | Exposes PocketBase securely to HTTPS clients (e.g. GitHub Pages) |
| Runtime | Docker Compose | Local service orchestration |
| Python | 3.11 slim | Lightweight AI service runtime |

## Project Structure

```text
tinyChat/
├── docker-compose.yml      # PocketBase + FastAPI service definition
├── chroma_data/            # Local persistent vector store data
├── pb_chatbot/
│   └── main.py             # FastAPI AI webhook server
├── pb_data/                # Local PocketBase data
├── pb_hooks/
│   └── webhooks.pb.js      # PocketBase JS hooks for triggering webhooks
├── pb_public/              # PocketBase public assets
└── README.md
```

## Quick Start

### 1. Run the services

```bash
docker compose up -d
```

### 2. Open the services

| Service | URL |
| --- | --- |
| PocketBase | http://localhost:8090 |
| FastAPI AI server | http://localhost:8000 |
| FastAPI health check | http://localhost:8000/ |
| Cloudflare Tunnel | Check dynamic URL using `docker logs LINGS-chat-tunnel` |

### 3. Check the server status

```bash
curl http://localhost:8000/
```

Expected response:

```json
{
  "status": "AI Server is running"
}
```

## How It Works

1. A user creates a chat message in the PocketBase `messages` collection.
2. A PocketBase message webhook calls the FastAPI `/webhook/messages` endpoint.
3. FastAPI parses the message text, sender ID, and room ID from the webhook payload and immediately returns a success status to prevent webhook blocking.
4. Messages sent by the bot itself are ignored to prevent infinite response loops.
5. The AI service routes chat requests through a background task, which retrieves relevant context from ChromaDB (RAG) and prepares message history.
6. The AI response is streamed back to PocketBase chunk-by-chunk, updating a placeholder message record to create a real-time typing effect on the frontend.
7. File or document events can be routed separately to `/webhook/documents`, where `ingest_document()` runs in the background, extracting text from files (like PDFs) and indexing them into ChromaDB for future RAG queries.

If `AI_MODEL_URL` is configured, FastAPI forwards the user message through a provider-aware LLM adapter (OpenAI or Ollama via HTTP streaming) and uses the returned text as the bot response.

## API

### `GET /`

Returns the FastAPI server status.

```json
{
  "status": "AI Server is running"
}
```

### `POST /webhook`

Legacy compatibility endpoint. It inspects the incoming event and dispatches it to either the message or document handler.

### `POST /webhook/messages`

Receives PocketBase message creation events.

Expected payload shape:

```json
{
  "record": {
    "text": "Hello",
    "user_id": "user_record_id",
    "room": "general"
  }
}
```

Example success response:

```json
{
  "status": "success",
  "pocketbase_response": 200
}
```

### `POST /webhook/documents`

Receives PocketBase document or attachment events and queues ingestion work in the background.

Expected payload shape:

```json
{
  "collection": "documents",
  "record": {
    "id": "document_record_id",
    "room": "general",
    "files": ["example.pdf"]
  }
}
```

Current ingestion behavior:

- marks the document as `processing`
- downloads the PocketBase file and extracts text (supports PDFs and raw text)
- chunks the extracted text and embeds it into a local ChromaDB collection isolated by `room_id`
- finalizes the record as `completed` and updates `chunk_count`

Example queued response:

```json
{
  "status": "queued",
  "document_id": "document_record_id",
  "room_id": "general",
  "file_count": 1
}
```

## Configuration

The FastAPI service uses the following environment variables.

| Variable | Default | Description |
| --- | --- | --- |
| `POCKETBASE_URL` | `http://pocketbase:8090` | Internal PocketBase URL used inside the Docker network |
| `AI_MODEL_URL` | empty | External AI model endpoint URL called by FastAPI |
| `AI_MODEL_TIMEOUT` | `30` | Timeout in seconds for the AI model HTTP request |
| `LLM_PROVIDER` | `auto` | `ollama`, `openai`, or `generic`; `auto` infers from the URL |
| `LLM_MODEL` | empty | Model name used for Ollama or OpenAI-compatible chat requests |
| `LLM_API_KEY` | empty | Bearer token used for OpenAI-compatible APIs |
| `LLM_SYSTEM_PROMPT` | built-in default | System prompt sent to the model provider |
| `LLM_TEMPERATURE` | `0.2` | Sampling temperature |
| `LLM_MAX_TOKENS` | `512` | Output token budget or nearest provider equivalent |
| `MEMORY_WINDOW_SIZE` | `8` | Number of recent room messages loaded from PocketBase as short-term memory |
| `BOT_USER_ID` | `bot_user_id_placeholder` | Bot user ID written back to the `messages` collection |
| `CHROMA_PERSIST_DIR` | `/data/chroma` | Persistent local directory for Chroma vector data |
| `PORT` | `8000` | FastAPI container listening port |
| `FASTAPI_HOST_PORT` | `8000` | Host port mapped to the FastAPI container |
| `TUNNEL_TOKEN` | empty | Cloudflare Zero Trust Named Tunnel token for secure HTTPS routing |
| `DEFAULT_LANGUAGE` | `en` | Default language for AI bot messages and system errors (`en`, `ko`, `zh`, `ja`) |

The values can be configured in Docker Compose or an `.env` file:

```yaml
environment:
  - POCKETBASE_URL=http://pocketbase:8090
  - AI_MODEL_URL=http://host.docker.internal:11434/api/chat
  - AI_MODEL_TIMEOUT=30
  - LLM_PROVIDER=ollama
  - LLM_MODEL=qwen2.5:7b-instruct
  - MEMORY_WINDOW_SIZE=8
  - BOT_USER_ID=your_bot_user_id
  - CHROMA_PERSIST_DIR=/data/chroma
  - PORT=8000
  - DEFAULT_LANGUAGE=en
```

Example `.env` file:

```env
AI_MODEL_URL=http://host.docker.internal:11434/api/chat
AI_MODEL_TIMEOUT=30
LLM_PROVIDER=ollama
LLM_MODEL=qwen2.5:7b-instruct
MEMORY_WINDOW_SIZE=8
BOT_USER_ID=your_bot_user_id
CHROMA_PERSIST_DIR=/data/chroma
PORT=8000
FASTAPI_HOST_PORT=8000
TUNNEL_TOKEN=your_cloudflare_tunnel_token_here
DEFAULT_LANGUAGE=en
```

### Multi-language Support (i18n)

tinyChat supports multiple languages for system messages and error logs. You can change the language by setting `DEFAULT_LANGUAGE` to one of the supported locales: `en` (English), `ko` (Korean), `zh` (Chinese), or `ja` (Japanese). Language files are located in `pb_chatbot/locales/`.

The FastAPI container mounts `./chroma_data` to `/data/chroma`, so local vector data survives container restarts. This path is used by ChromaDB to store document embeddings for the RAG pipeline.

### Lightweight memory

For each incoming user message, FastAPI fetches up to `MEMORY_WINDOW_SIZE` recent records from the same `room` in PocketBase and includes them in the LLM request.

- `openai`: the recent messages are appended as prior chat turns in `messages`
- `ollama`: the recent messages are embedded into the prompt as `recent_conversation`
- `generic`: the recent messages are passed in `conversation_history`

This gives you a small working memory without introducing a heavier memory service.

### Provider modes

`ollama`

- Typical URL: `http://host.docker.internal:11434/api/chat`
- Requires: `LLM_MODEL`
- Response parsing: `message.content` or `response`

`openai`

- Typical URL: `https://api.openai.com/v1/chat/completions`
- Requires: `LLM_MODEL`
- Usually also requires: `LLM_API_KEY`
- Response parsing: `choices[0].message.content`

`generic`

- Uses the legacy raw payload and looks for `response`, `text`, `answer`, or `message`

The generic request payload looks like this:

```json
{
  "text": "Hello",
  "sender_id": "user_record_id",
  "room_id": "general",
  "document_id": "document_record_id",
  "attachment_ids": ["attachment_record_id"],
  "conversation_history": [
    {"role": "user", "content": "Hi"},
    {"role": "assistant", "content": "Hello, how can I help?"}
  ],
  "metadata": {}
}
```

Example OpenAI-compatible `.env` values:

```env
AI_MODEL_URL=https://api.openai.com/v1/chat/completions
LLM_PROVIDER=openai
LLM_MODEL=gpt-4.1-mini
LLM_API_KEY=your_api_key
```

## PocketBase Setup Notes

At minimum, PocketBase should include the following collections.

| Collection | Purpose | Key fields |
| --- | --- | --- |
| `messages` | User and bot chat messages | `text`, `user_id`, `room`, `message_type`, `processing_status`, `document_id`, `attachments` |
| `documents` | Uploaded files and RAG ingestion lifecycle | `title`, `room`, `uploaded_by`, `source_message`, `processing_status`, `file`, `chunk_count`, `last_error` |
| `attachments` | Multiple file references linked to messages and documents | `message_id`, `document_id`, `file`, `file_name`, `mime_type`, `processing_status` |

Detailed field guidance is documented in [pocketbase/schema-reference.md](/Users/nenji/Docker/LINGSSOFT/tinyChat/pocketbase/schema-reference.md).

For the webhook flow used by this project:

- New user messages should be created with `message_type = user` and `processing_status = pending`.
- Bot responses are written by FastAPI with `message_type = bot` and `processing_status = completed`.
- New documents should start with `processing_status = pending`.
- The document webhook moves documents to `queued` before ingestion begins.

For a complete walkthrough on accessing the PocketBase Admin UI, creating the initial admin account, and configuring the required Bot User, please refer to the [Admin Setup Guide](pocketbase/admin-setup.md).

## Development

The FastAPI container mounts `pb_chatbot` into `/app` and runs with `uvicorn --reload`. Changes to `pb_chatbot/main.py` are automatically picked up by the development server.

The `chroma_data/` directory is kept out of git and is intended to hold local persisted embeddings and vector index files.

```bash
docker compose logs -f fastapi-ai
```

Stop the services:

```bash
docker compose down
```

To reset local PocketBase data, remove `pb_data/`. This deletes local database state, so back it up first if the data matters.

## Roadmap

- [x] OpenAI or local LLM integration
- [x] RAG-based document retrieval responses (ChromaDB)
- [x] Streaming responses and typing/status events
- [x] Bot user ID configuration through environment variables
- [x] PocketBase admin setup documentation
- [x] Automated `messages` collection schema setup
- [ ] Room-specific system prompts
- [ ] Authenticated webhook verification

## License

No license has been specified yet. Add a license that matches your intended usage before publishing or distributing this project.
