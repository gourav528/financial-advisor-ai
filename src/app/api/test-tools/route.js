import { NextResponse } from 'next/server'
import { tools } from '../../../lib/tools.js'

export async function GET() {
  try {
    // Validate tools format
    const validationErrors = []
    
    tools.forEach((tool, index) => {
      if (!tool.type) {
        validationErrors.push(`Tool ${index}: Missing 'type' field`)
      }
      if (tool.type !== 'function') {
        validationErrors.push(`Tool ${index}: Type should be 'function', got '${tool.type}'`)
      }
      if (!tool.function) {
        validationErrors.push(`Tool ${index}: Missing 'function' object`)
      }
      if (!tool.function.name) {
        validationErrors.push(`Tool ${index}: Missing function name`)
      }
      if (!tool.function.description) {
        validationErrors.push(`Tool ${index}: Missing function description`)
      }
      if (!tool.function.parameters) {
        validationErrors.push(`Tool ${index}: Missing parameters`)
      }
    })

    return NextResponse.json({
      success: validationErrors.length === 0,
      tools: tools,
      validationErrors,
      toolCount: tools.length
    })

  } catch (error) {
    console.error('Error testing tools:', error)
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