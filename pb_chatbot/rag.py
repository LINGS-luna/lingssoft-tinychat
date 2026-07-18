import os
import httpx
import logging
from typing import List
import chromadb
from chromadb.utils import embedding_functions
from io import BytesIO
from pypdf import PdfReader

logger = logging.getLogger("tinychat.rag")

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "/data/chroma")
chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)

# Using default embedding function (all-MiniLM-L6-v2) for local processing.
ef = embedding_functions.DefaultEmbeddingFunction()

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

async def download_file(url: str) -> bytes:
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content

def extract_text(filename: str, content: bytes) -> str:
    text = ""
    if filename.lower().endswith('.pdf'):
        try:
            reader = PdfReader(BytesIO(content))
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        except Exception as e:
            logger.error(f"Error parsing PDF {filename}: {e}")
    else:
        # Default text fallback for txt, md, etc.
        try:
            text = content.decode('utf-8')
        except:
            pass
    return text

async def ingest_document_chunks(document_id: str, room_id: str, file_urls: List[str]) -> int:
    # Use room_id to create an isolated collection per chat room
    collection_name = f"room_{room_id}".replace("-", "_") # chromadb doesn't like hyphens in names sometimes
    collection = chroma_client.get_or_create_collection(name=collection_name, embedding_function=ef)
    
    total_chunks = 0
    for url in file_urls:
        filename = url.split('/')[-1]
        try:
            content = await download_file(url)
            text = extract_text(filename, content)
            if not text.strip():
                continue
                
            chunks = chunk_text(text)
            if not chunks:
                continue
                
            ids = [f"{document_id}_{filename}_{i}" for i in range(len(chunks))]
            metadatas = [{"document_id": document_id, "filename": filename, "room_id": room_id} for _ in chunks]
            
            collection.add(
                documents=chunks,
                metadatas=metadatas,
                ids=ids
            )
            total_chunks += len(chunks)
        except Exception as e:
            logger.error(f"Failed to ingest {url}: {e}")
            raise e
            
    return total_chunks

def retrieve_context(query: str, room_id: str, n_results: int = 3) -> str:
    collection_name = f"room_{room_id}".replace("-", "_")
    try:
        collection = chroma_client.get_collection(name=collection_name, embedding_function=ef)
        results = collection.query(
            query_texts=[query],
            n_results=n_results
        )
        documents = results.get("documents", [[]])[0]
        if documents:
            return "\n\n---\n\n".join(documents)
    except Exception as e:
        logger.debug(f"No collection or error for room {room_id}: {e}")
    return ""
