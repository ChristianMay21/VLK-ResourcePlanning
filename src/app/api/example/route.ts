import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const clickupId = searchParams.get('clickupId')

  if (!clickupId) {
    return NextResponse.json({ error: 'clickupId is required' }, { status: 400 })
  }

  try {
    return NextResponse.json({ example: true })
  } catch (error) {
    console.error('Error fetching tasks for user:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}
