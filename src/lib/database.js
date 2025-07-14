import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Initialize database with pgvector extension and required tables
export async function initializeDatabase() {
  try {
    console.log('Initializing database...')
    
    // Check if tables exist and create them if they don't
    await ensureTablesExist()
    
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}

// Ensure all required tables exist
async function ensureTablesExist() {
  try {
    // Check and create embeddings table
    await ensureEmbeddingsTable()
    
    // Check and create tasks table
    await ensureTasksTable()
    
    // Check and create agent_memory table
    await ensureAgentMemoryTable()
    
  } catch (error) {
    console.error('Error ensuring tables exist:', error)
    throw error
  }
}

async function ensureEmbeddingsTable() {
  try {
    // Try to select from embeddings table
    const { error } = await supabase
      .from('embeddings')
      .select('id')
      .limit(1)
    
    if (error && error.code === '42P01') {
      console.log('Creating embeddings table...')
      console.log('Please run this SQL in your Supabase SQL editor:')
      console.log(`
        -- Enable pgvector extension
        CREATE EXTENSION IF NOT EXISTS vector;
        
        -- Create embeddings table
        CREATE TABLE IF NOT EXISTS embeddings (
          id SERIAL PRIMARY KEY,
          content TEXT NOT NULL,
          embedding vector(1536),
          metadata JSONB DEFAULT '{}',
          source VARCHAR(50) NOT NULL,
          source_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `)
      throw new Error('embeddings table does not exist. Please run the SQL commands above in your Supabase SQL editor.')
    }
  } catch (error) {
    console.error('Error checking embeddings table:', error)
    throw error
  }
}

async function ensureTasksTable() {
  try {
    // Try to select from tasks table
    const { error } = await supabase
      .from('tasks')
      .select('id')
      .limit(1)
    
    if (error && error.code === '42P01') {
      console.log('Creating tasks table...')
      console.log('Please run this SQL in your Supabase SQL editor:')
      console.log(`
        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255),
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          due_date TIMESTAMP,
          priority VARCHAR(20) DEFAULT 'medium',
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `)
      throw new Error('tasks table does not exist. Please run the SQL commands above in your Supabase SQL editor.')
    }
  } catch (error) {
    console.error('Error checking tasks table:', error)
    throw error
  }
}

async function ensureAgentMemoryTable() {
  try {
    // Try to select from agent_memory table
    const { error } = await supabase
      .from('agent_memory')
      .select('id')
      .limit(1)
    
    if (error && error.code === '42P01') {
      console.log('Creating agent_memory table...')
      console.log('Please run this SQL in your Supabase SQL editor:')
      console.log(`
        CREATE TABLE IF NOT EXISTS agent_memory (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255),
          instruction TEXT NOT NULL,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `)
      throw new Error('agent_memory table does not exist. Please run the SQL commands above in your Supabase SQL editor.')
    }
  } catch (error) {
    console.error('Error checking agent_memory table:', error)
    throw error
  }
}

// Helper functions for embeddings
export async function insertEmbedding(content, embedding, metadata, source, sourceId) {
  const { data, error } = await supabase
    .from('embeddings')
    .insert({
      content,
      embedding,
      metadata,
      source,
      source_id: sourceId
    })
    .select()

  if (error) throw error
  return data[0]
}

export async function searchEmbeddings(queryEmbedding, limit = 10, filters = {}) {
  try {
    // Use a more efficient approach to avoid URL length issues
    // First, get all embeddings and then filter in memory for small datasets
    // For larger datasets, we'll need to implement a different approach
    
    let query = supabase
      .from('embeddings')
      .select('*')
      .limit(1000) // Get more results to filter from

    // Apply filters
    if (filters.source) {
      query = query.eq('source', filters.source)
    }
    if (filters.sourceId) {
      query = query.eq('source_id', filters.sourceId)
    }

    const { data, error } = await query
    if (error) throw error

    if (!data || data.length === 0) {
      return []
    }

    // Calculate similarities in memory and sort
    const resultsWithSimilarity = data.map(item => {
      // Simple cosine similarity calculation
      const similarity = calculateCosineSimilarity(queryEmbedding, item.embedding)
      return {
        ...item,
        similarity
      }
    })

    // Sort by similarity and return top results
    return resultsWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(({...item }) => item) // Remove similarity from final result

  } catch (error) {
    console.error('Error searching embeddings:', error)
    // Return empty results if search fails
    return []
  }
}

// Helper function to calculate cosine similarity
function calculateCosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    return 0
  }

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i]
    norm1 += vec1[i] * vec1[i]
    norm2 += vec2[i] * vec2[i]
  }

  norm1 = Math.sqrt(norm1)
  norm2 = Math.sqrt(norm2)

  if (norm1 === 0 || norm2 === 0) {
    return 0
  }

  return dotProduct / (norm1 * norm2)
}

// Helper functions for tasks
export async function createTask({ userId, title, description, dueDate, priority, status }) {
  const { data, error } = await supabase
    .from('tasks')
    .insert([{ user_id: userId, title, description, due_date: dueDate, priority, status }])
    .select()
  if (error) throw error
  return data[0]
}

export async function updateTask(id, updates) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
  if (error) throw error
  return data[0]
}

export async function getTasks(userId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true })
  if (error) throw error
  return data
}

// Helper functions for agent memory
export async function addInstruction(instruction) {
  const { data, error } = await supabase
    .from('agent_memory')
    .insert({
      instruction,
      active: true
    })
    .select()

  if (error) throw error
  return data[0]
}

export async function getActiveInstructions() {
  const { data, error } = await supabase
    .from('agent_memory')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
} 

export async function saveAgentMemory({ userId, instruction }) {
  const { data, error } = await supabase
    .from('agent_memory')
    .insert([{ user_id: userId, instruction }])
    .select()
  if (error) throw error
  return data[0]
}

export async function getAgentMemory(userId) {
  const { data, error } = await supabase
    .from('agent_memory')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
} 
