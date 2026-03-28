---
name: vector-search
description: "Vector database setup and semantic search implementation with Pinecone, pgvector, Qdrant, and embedding pipelines."
version: 1.0.0
category: data
parent: mega-data
tags: [mega-data, vector-search, embeddings, semantic-search]
disable-model-invocation: true
---

# Vector Search

## What This Does

Sets up vector databases and implements semantic search — enabling search by meaning rather than keywords. Covers embedding generation, vector database selection and configuration, indexing pipelines, hybrid search (vector + keyword), and relevance tuning. Supports Pinecone, pgvector, Qdrant, Weaviate, and ChromaDB.

## Instructions

1. **Assess the use case.** Clarify:
   - What content is being searched? (documents, products, code, images)
   - How much content? (thousands, millions, billions of vectors)
   - What's the query pattern? (natural language, similar items, recommendations)
   - Latency requirements? (real-time search, batch processing)
   - Do you need filtering? (search within a category, date range, etc.)

2. **Choose the vector database.**

   | Database | Best For | Hosting | Filtering | Cost |
   |----------|----------|---------|-----------|------|
   | pgvector | Already on Postgres, < 1M vectors | Self-managed | SQL WHERE clauses | Free (extension) |
   | Pinecone | Managed service, production scale | Cloud | Metadata filtering | Pay per vector |
   | Qdrant | Self-hosted, high performance | Self or cloud | Rich filtering | Free (open source) |
   | Weaviate | Multi-modal, GraphQL API | Self or cloud | GraphQL filters | Free (open source) |
   | ChromaDB | Prototyping, Python-native | In-process | Basic filtering | Free (open source) |

   **Recommendation:** pgvector if you already have Postgres, Qdrant for self-hosted production, Pinecone for fully managed.

3. **Choose the embedding model.**

   | Model | Dimensions | Best For | Cost |
   |-------|-----------|----------|------|
   | OpenAI text-embedding-3-small | 1536 | General text, good quality/cost balance | $0.02/1M tokens |
   | OpenAI text-embedding-3-large | 3072 | Highest quality text embeddings | $0.13/1M tokens |
   | Cohere embed-v3 | 1024 | Multilingual, search-optimized | $0.10/1M tokens |
   | Voyage AI voyage-3 | 1024 | Code and technical content | $0.06/1M tokens |
   | sentence-transformers (local) | 384-768 | Free, private, offline | Free (CPU/GPU) |

4. **Set up pgvector.**
   ```sql
   -- Enable extension
   CREATE EXTENSION IF NOT EXISTS vector;

   -- Create table with vector column
   CREATE TABLE documents (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       content TEXT NOT NULL,
       metadata JSONB DEFAULT '{}',
       embedding vector(1536),  -- match your model's dimensions
       created_at TIMESTAMPTZ DEFAULT now()
   );

   -- Create HNSW index (recommended for production)
   CREATE INDEX ON documents
     USING hnsw (embedding vector_cosine_ops)
     WITH (m = 16, ef_construction = 64);

   -- Semantic search query
   SELECT id, content, metadata,
          1 - (embedding <=> $1::vector) AS similarity
   FROM documents
   WHERE metadata->>'category' = 'tech'  -- pre-filter
   ORDER BY embedding <=> $1::vector
   LIMIT 10;
   ```

5. **Set up Qdrant.**
   ```typescript
   import { QdrantClient } from '@qdrant/js-client-rest';

   const client = new QdrantClient({ url: 'http://localhost:6333' });

   // Create collection
   await client.createCollection('documents', {
     vectors: {
       size: 1536,
       distance: 'Cosine',
     },
     optimizers_config: {
       default_segment_number: 2,
     },
   });

   // Create payload index for filtering
   await client.createPayloadIndex('documents', {
     field_name: 'category',
     field_schema: 'keyword',
   });

   // Upsert vectors
   await client.upsert('documents', {
     points: documents.map((doc, i) => ({
       id: doc.id,
       vector: doc.embedding,
       payload: {
         content: doc.content,
         category: doc.category,
         created_at: doc.createdAt,
       },
     })),
   });

   // Search with filter
   const results = await client.search('documents', {
     vector: queryEmbedding,
     filter: {
       must: [{ key: 'category', match: { value: 'tech' } }],
     },
     limit: 10,
     with_payload: true,
   });
   ```

6. **Build the embedding pipeline.**
   ```typescript
   import OpenAI from 'openai';

   const openai = new OpenAI();

   // Generate embeddings
   async function embed(texts: string[]): Promise<number[][]> {
     const response = await openai.embeddings.create({
       model: 'text-embedding-3-small',
       input: texts,
     });
     return response.data.map(d => d.embedding);
   }

   // Chunking strategy for long documents
   function chunkDocument(text: string, maxTokens: number = 500): string[] {
     const sentences = text.split(/[.!?]+\s/);
     const chunks: string[] = [];
     let current = '';

     for (const sentence of sentences) {
       if (estimateTokens(current + sentence) > maxTokens) {
         if (current) chunks.push(current.trim());
         current = sentence;
       } else {
         current += (current ? '. ' : '') + sentence;
       }
     }
     if (current) chunks.push(current.trim());
     return chunks;
   }

   // Index a document
   async function indexDocument(doc: Document) {
     const chunks = chunkDocument(doc.content);
     const embeddings = await embed(chunks);

     await vectorDB.upsert(
       chunks.map((chunk, i) => ({
         id: `${doc.id}-${i}`,
         vector: embeddings[i],
         payload: {
           content: chunk,
           document_id: doc.id,
           chunk_index: i,
           total_chunks: chunks.length,
         },
       }))
     );
   }
   ```

7. **Implement hybrid search (vector + keyword).**
   ```sql
   -- pgvector + pg_trgm hybrid search
   WITH semantic AS (
       SELECT id, content, 1 - (embedding <=> $1::vector) AS semantic_score
       FROM documents
       ORDER BY embedding <=> $1::vector
       LIMIT 20
   ),
   keyword AS (
       SELECT id, content, ts_rank(to_tsvector(content), plainto_tsquery($2)) AS keyword_score
       FROM documents
       WHERE to_tsvector(content) @@ plainto_tsquery($2)
       LIMIT 20
   )
   SELECT
       COALESCE(s.id, k.id) AS id,
       COALESCE(s.content, k.content) AS content,
       COALESCE(s.semantic_score, 0) * 0.7 + COALESCE(k.keyword_score, 0) * 0.3 AS combined_score
   FROM semantic s
   FULL OUTER JOIN keyword k ON s.id = k.id
   ORDER BY combined_score DESC
   LIMIT 10;
   ```

## Output Format

```markdown
# Vector Search Setup: {Application}

## Architecture
| Component | Choice | Reason |
|-----------|--------|--------|
| Vector DB | {database} | {why} |
| Embedding model | {model} | {why} |
| Dimensions | {n} | {matches model} |
| Index type | {HNSW/IVFFlat} | {why} |

## Schema
{Table/collection definition}

## Indexing Pipeline
{How documents are chunked, embedded, and stored}

## Search API
{Query interface with example requests/responses}

## Performance
- Index size: {estimated}
- Query latency: {p50, p99}
- Recall@10: {estimated}
```

## Tips

- pgvector is good enough for most applications under 1M vectors — don't over-engineer with a dedicated vector DB
- HNSW index is slower to build but faster to query than IVFFlat — use HNSW for production
- Chunking strategy matters more than embedding model choice — experiment with chunk sizes (200-500 tokens)
- Hybrid search (vector + keyword) almost always outperforms either alone
- Include document metadata in vector payload for post-retrieval context
- For RAG applications, return the top 5-10 chunks, not just top 1 — let the LLM synthesize
- Re-index when you change embedding models — vectors from different models are incompatible
- Monitor search quality with user feedback (thumbs up/down) and relevance scoring
