from openai import OpenAI
from llama_index.readers.file import PDFReader
from llama_index.core.node_parser import SentenceSplitter
from dotenv import load_dotenv
import pandas as pd

load_dotenv()

client = OpenAI()
EMBED_MODEL = "text-embedding-3-large"
EMBED_DIM = 3072

splitter = SentenceSplitter(chunk_size=1000, chunk_overlap=200)

def load_and_chunk_pdf(path: str):
    docs = PDFReader().load_data(file=path)
    texts = [d.text for d in docs if getattr(d, "text", None)]
    chunks = []
    for t in texts:
        chunks.extend(splitter.split_text(t))
    return chunks

def load_and_chunk_spreadsheet(path: str):
    if path.endswith('.csv'):
        df = pd.read_csv(path)
    elif path.endswith(('.xls', '.xlsx')):
        df = pd.read_excel(path)
    else:
        raise ValueError("Unsupported spreadsheet format")
    
    # Fill NaN values to avoid ugly "nan" strings
    df = df.fillna("")
    
    # Create chunks by grouping rows to fit within the chunk size limit
    chunks = []
    current_chunk = []
    current_length = 0
    
    # We want to ensure the column headers give context to the data
    columns = df.columns.tolist()
    
    for index, row in df.iterrows():
        # Format the row as "Column1: Value, Column2: Value"
        row_str = " | ".join([f"{col}: {str(row[col])}" for col in columns if str(row[col]).strip() != ""])
        
        # Approximate token length by character count (rough heuristic for 1000 char chunks)
        row_len = len(row_str)
        
        if current_length + row_len > 1000 and current_chunk:
            # Current chunk is full, save it and start a new one
            chunks.append("\n".join(current_chunk))
            current_chunk = [row_str]
            current_length = row_len
        else:
            current_chunk.append(row_str)
            current_length += row_len + 1 # +1 for newline
            
    # Add the last chunk if it exists
    if current_chunk:
        chunks.append("\n".join(current_chunk))
        
    return chunks

def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    embeddings = []
    for i in range(0, len(texts), 2000):
        batch = texts[i:i + 2000]
        response = client.embeddings.create(
            model=EMBED_MODEL,
            input = batch,
        )
        embeddings.extend([item.embedding for item in response.data])
    return embeddings