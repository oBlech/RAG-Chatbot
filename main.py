import logging
from fastapi import FastAPI, logger, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import inngest
import inngest.fast_api
from inngest.experimental import ai
from dotenv import load_dotenv
import uuid
import os
import datetime
import tempfile
import shutil
from typing import List
from pydantic import BaseModel
from data_loader import load_and_chunk_pdf, load_and_chunk_spreadsheet, embed_texts
from vector_db import QdrantStorage
from custom_types import RAGChunkAndSrc, RAGQueryResult, RAGSearchResult, RAGUpsertResult

load_dotenv()

inngest_client = inngest.Inngest(
    app_id="rag_app",
    logger=logging.getLogger("uvicorn"),
    is_production = False,
    serializer=inngest.PydanticSerializer()
)

@inngest_client.create_function(
    fn_id="RAG: Ingest PDF",
    trigger=inngest.TriggerEvent(event="rag/ingest_pdf")
)
async def rag_ingest_pdf(ctx: inngest.Context):
    def _load(ctx: inngest.Context) -> RAGChunkAndSrc:
        doc_path = ctx.event.data.get("doc_path") or ctx.event.data.get("pdf_path")
        source_id = ctx.event.data.get("source_id", doc_path)
        ext = os.path.splitext(doc_path)[1].lower()
        if ext in ['.csv', '.xlsx', '.xls']:
            chunks = load_and_chunk_spreadsheet(doc_path)
        else:
            chunks = load_and_chunk_pdf(doc_path)
        return RAGChunkAndSrc(chunks=chunks, source_id=source_id)

    def _upsert(chunks_and_src: RAGChunkAndSrc) -> RAGUpsertResult:
        chunks = chunks_and_src.chunks
        source_id = chunks_and_src.source_id
        vecs = embed_texts(chunks)
        ids = [str(uuid.uuid5(uuid.NAMESPACE_URL, f"{source_id}:{i}")) for i in range(len(chunks))]
        payloads = [{"source": source_id, "text": chunks[i]} for i in range(len(chunks))]
        QdrantStorage().upsert(ids, vecs, payloads)
        return RAGUpsertResult(ingested=len(chunks))

    chunks_and_src = await ctx.step.run("load-and-chunk", lambda: _load(ctx), output_type=RAGChunkAndSrc)
    ingested = await ctx.step.run("embed-and-upsert", lambda: _upsert(chunks_and_src), output_type=RAGUpsertResult)
    return ingested.model_dump()

@inngest_client.create_function(
    fn_id="RAG: Query PDF",
    trigger=inngest.TriggerEvent(event="rag/query_pdf_ai")
)
async def rag_query_pdf_ai(ctx: inngest.Context):
    def _search(question: str, top_k: int = 15):
        query_vec = embed_texts([question])[0]
        store = QdrantStorage()
        found = store.search(query_vec, top_k)
        return RAGSearchResult(contexts=found["contexts"], sources=found["sources"])

    question = ctx.event.data["question"]
    top_k = int(ctx.event.data.get("top_k", 15))

    found = await ctx.step.run("embed-and-search", lambda: _search(question, top_k), output_type=RAGSearchResult)

    context_block = "\n\n".join(f"- {c}" for c in found.contexts)
    
    system_prompt = (
        "You are an expert AI knowledge assistant. Your goal is to provide comprehensive, "
        "detailed, and highly accurate answers based strictly on the provided context. "
        "Fully utilize all the relevant information from the context to form a complete response. "
        "If the context does not contain the answer, politely state that you do not have enough information."
    )
    
    user_content = (
        "Here is the context I found for you: \n\n"
        f"Context: \n{context_block}\n\n"
        f"Question: {question}"
    )

    adapter = ai.openai.Adapter(
        auth_key=os.getenv("OPENAI_API_KEY"),
        model="gpt-4o-mini"
    )

    res = await ctx.step.ai.infer(
        "llm-answer",
        adapter=adapter,
        body={
            "max_tokens":1024,
            "temperature":0.2,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ]
        }
    )

    answer = res["choices"][0]["message"]["content"].strip()
    return{"answer": answer, "sources": found.sources, "num_contexts": len(found.contexts)}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str
    top_k: int = 15
    history: List[dict] = []

class QueryResponse(BaseModel):
    answer: str
    sources: List[str]
    num_contexts: int

class DocumentResponse(BaseModel):
    source_id: str

@app.post("/api/query", response_model=QueryResponse)
async def query_rag(request: QueryRequest):

    try:
        store = QdrantStorage()
        query_vec = embed_texts([request.question])[0]
        found = store.search(query_vec, request.top_k)

        if not found["contexts"]:
            await inngest_client.send(
                inngest.Event(
                    name="rag/query.executed",
                    data={"question": request.question, "num_contexts": 0, "found_answer": False}
                )
            )
            return QueryResponse(
                answer="I couldn't find any relevant information in the documents to answer your question.",
                sources=[],
                num_contexts=0
            )

        context_block = "\n\n".join(f"- {c}" for c in found["contexts"])

        system_prompt = (
            "You are an expert AI knowledge assistant. Your goal is to provide comprehensive, "
            "detailed, and highly accurate answers based strictly on the provided context. "
            "Fully utilize all the relevant information from the context to form a complete response. "
            "CRITICAL INSTRUCTION: If the user asks you to calculate a sum, count, or average across the dataset, "
            "be aware that you only have a *partial* snapshot of the data (the top search results). "
            "You MUST state that your calculation is only based on the visible search results and may not reflect the entire document. "
            "Do not hallucinate or make up math. "
            "If the context does not contain the answer, politely state that you do not have enough information."
        )

        user_content = (
            "Here is the context I found for you: \n\n"
            f"Context: \n{context_block}\n\n"
            f"Current Question: {request.question}"
        )

        # Build the message chain
        messages = [{"role": "system", "content": system_prompt}]

        # Append history to give the model memory of the conversation
        for msg in request.history:
            # ensure only valid roles are passed
            if msg.get("role") in ["user", "assistant"]:
                messages.append({"role": msg["role"], "content": msg.get("content", "")})

        # Append the current prompt with context
        messages.append({"role": "user", "content": user_content})

        from openai import OpenAI
        openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=1024,
            temperature=0.2
        )        
        answer = response.choices[0].message.content.strip()
        
        await inngest_client.send(
            inngest.Event(
                name="rag/query.executed",
                data={
                    "question": request.question,
                    "num_contexts": len(found["contexts"]),
                    "sources": found["sources"],
                    "found_answer": True
                }
            )
        )
        
        return QueryResponse(
            answer=answer,
            sources=found["sources"],
            num_contexts=len(found["contexts"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing")
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.pdf', '.csv', '.xlsx', '.xls']:
        raise HTTPException(status_code=400, detail="Only PDF, CSV, and Excel files are supported")
    
    temp_file = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            shutil.copyfileobj(file.file, tmp)
            temp_file = tmp.name
        
        if ext == '.pdf':
            chunks = load_and_chunk_pdf(temp_file)
        else:
            chunks = load_and_chunk_spreadsheet(temp_file)
            
        source_id = os.path.basename(file.filename)
        
        vecs = embed_texts(chunks)
        ids = [str(uuid.uuid5(uuid.NAMESPACE_URL, f"{source_id}:{i}")) for i in range(len(chunks))]
        payloads = [{"source": source_id, "text": chunks[i]} for i in range(len(chunks))]
        
        store = QdrantStorage()
        store.upsert(ids, vecs, payloads)
        
        await inngest_client.send(
            inngest.Event(
                name="rag/document.uploaded",
                data={
                    "source_id": source_id,
                    "chunks_ingested": len(chunks),
                    "file_type": ext
                }
            )
        )
        
        return {"message": f"Successfully uploaded {source_id}", "chunks_ingested": len(chunks), "source_id": source_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_file and os.path.exists(temp_file):
            os.remove(temp_file)

@app.get("/api/documents", response_model=List[DocumentResponse])
async def list_documents():
    
    try:
        store = QdrantStorage()
        sources = store.list_sources()
        return [DocumentResponse(source_id=source) for source in sources]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/documents/{source_id}")
async def delete_document(source_id: str):
    
    try:
        store = QdrantStorage()
        deleted_count = store.delete_by_source(source_id)
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail=f"Document {source_id} not found")
        
        await inngest_client.send(
            inngest.Event(
                name="rag/document.deleted",
                data={
                    "source_id": source_id,
                    "points_deleted": deleted_count
                }
            )
        )
        
        return {"message": f"Successfully deleted {source_id}", "points_deleted": deleted_count}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

inngest.fast_api.serve(app, inngest_client, [rag_ingest_pdf, rag_query_pdf_ai])