import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'

/**
 * GET /api/community/search
 * Search community posts
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'community_read')
    if (featureError) return featureError
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Search query must be at least 2 characters' },
      { status: 400 }
    )
  }

  try {
    const posts = await prisma.communityPost.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } },
        ],
        AND: [
          {
            OR: [
              { schoolId: session.user.schoolId },
              { schoolId: null },
            ],
          },
        ],
      },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: [{ upvotes: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    })

    const total = await prisma.communityPost.count({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } },
        ],
        AND: [
          {
            OR: [
              { schoolId: session.user.schoolId },
              { schoolId: null },
            ],
          },
        ],
      },
    })

    const postsWithMeta = posts.map((post) => ({
      ...post,
      commentCount: post._count.comments,
    }))

    return NextResponse.json({
      posts: postsWithMeta,
      query,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + posts.length < total,
      },
    })
  } catch (error) {
    console.error('Error searching posts:', error)
    return NextResponse.json(
      { error: 'Failed to search posts' },
      { status: 500 }
    )
  }
}
