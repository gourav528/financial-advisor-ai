import { NextResponse } from 'next/server'
import { importTestData, testRAGQueries } from '../../../lib/import-test-data.js'

export async function POST(request) {
  try {
    const { action } = await request.json()
    
    if (action === 'import') {
      const result = await importTestData()
      return NextResponse.json(result)
    } else if (action === 'test') {
      const result = await testRAGQueries()
      return NextResponse.json({ success: true, message: 'RAG test completed' })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "import" or "test"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error in import test data API:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Import test data API',
    endpoints: {
      'POST /api/import-test-data': 'Import test data or run RAG tests',
      body: {
        action: 'import' | 'test'
      }
    }
  })
} 