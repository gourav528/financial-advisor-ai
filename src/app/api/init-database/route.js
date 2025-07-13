import { NextResponse } from 'next/server'
import { initializeDatabase } from '../../../lib/database.js'

export async function POST(request) {
  try {
    console.log('Manual database initialization requested...')
    
    await initializeDatabase()
    
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully'
    })
    
  } catch (error) {
    console.error('Database initialization failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      instructions: `
        To fix this, please run the following SQL commands in your Supabase SQL Editor:

        1. Enable pgvector extension:
        CREATE EXTENSION IF NOT EXISTS vector;

        2. Create embeddings table:
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

        3. Create tasks table:
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

        4. Create agent_memory table:
        CREATE TABLE IF NOT EXISTS agent_memory (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255),
          instruction TEXT NOT NULL,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Database initialization endpoint',
    description: 'POST to initialize database tables',
    usage: 'POST /api/init-database'
  })
} 