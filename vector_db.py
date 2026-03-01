from typing import Any
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct

class QdrantStorage:
    def __init__(self, url="http://localhost:6333", collection="docs", dim=3072):
        self.client = QdrantClient(url=url, timeout=30)
        self.collection = collection
        if not self.client.collection_exists(self.collection):
            self.client.create_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
            )

    def upsert(self, ids, vectors, payloads):
        if not ids:
            return
        points = [PointStruct(id=ids[i], vector=vectors[i], payload=payloads[i]) for i in range(len(ids))]
        self.client.upsert(self.collection, points=points)
    
    def search(self, query_vector, top_k: int = 5):
        results=self.client.search(
            collection_name=self.collection,
            query_vector=query_vector,
            with_payload=True,
            limit=top_k
        )
        contexts = []
        sources = set()

        for r in results:
            payload = getattr(r, "payload", None) or {}
            text = payload.get("text", "")
            source = payload.get("source", "")
            if text:
                contexts.append(text)
                sources.add(source)

        return {"contexts": contexts, "sources": list(sources)}
    
    def list_sources(self):
        """List all unique sources in the collection."""
        sources = set()
        offset = None
        while True:
            result = self.client.scroll(
                collection_name=self.collection,
                limit=100,
                offset=offset,
                with_payload=True,
                with_vectors=False
            )
            points, next_offset = result
            if not points:
                break
            for point in points:
                payload = getattr(point, "payload", None) or {}
                source = payload.get("source", "")
                if source:
                    sources.add(source)
            if next_offset is None:
                break
            offset = next_offset
        return list(sources)
    
    def delete_by_source(self, source_id: str):
        """Delete all points with a specific source_id."""
        ids_to_delete = []
        offset = None
        while True:
            result = self.client.scroll(
                collection_name=self.collection,
                limit=100,
                offset=offset,
                with_payload=True,
                with_vectors=False
            )
            points, next_offset = result
            if not points:
                break
            for point in points:
                payload = getattr(point, "payload", None) or {}
                source = payload.get("source", "")
                if source == source_id:
                    ids_to_delete.append(point.id)
            if next_offset is None:
                break
            offset = next_offset
        
        if ids_to_delete:
            self.client.delete(
                collection_name=self.collection,
                points_selector=ids_to_delete
            )
        return len(ids_to_delete)