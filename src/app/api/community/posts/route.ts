import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'
import { CommunityPostType } from '@prisma/client'

/**
 * GET /api/community/posts
 * List community posts with filters
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
  const type = searchParams.get('type') as CommunityPostType | null
  const subject = searchParams.get('subject')
  const tag = searchParams.get('tag')
  const authorId = searchParams.get('authorId')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')
  const sortBy = searchParams.get('sortBy') || 'recent' // recent, popular, trending

  try {
    const orderBy =
      sortBy === 'popular'
        ? [{ upvotes: 'desc' as const }, { createdAt: 'desc' as const }]
        : sortBy === 'trending'
        ? [{ viewCount: 'desc' as const }, { createdAt: 'desc' as const }]
        : [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }]

    const posts = await prisma.communityPost.findMany({
      where: {
        ...(type && { type }),
        ...(subject && { subject: { contains: subject, mode: 'insensitive' } }),
        ...(tag && { tags: { has: tag } }),
        ...(authorId && { authorId }),
        // Show posts from user's school or global posts
        OR: [
          { schoolId: session.user.schoolId },
          { schoolId: null },
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
      orderBy,
      take: limit,
      skip: offset,
    })

    const total = await prisma.communityPost.count({
      where: {
        ...(type && { type }),
        ...(subject && { subject: { contains: subject, mode: 'insensitive' } }),
        ...(tag && { tags: { has: tag } }),
        ...(authorId && { authorId }),
        OR: [
          { schoolId: session.user.schoolId },
          { schoolId: null },
        ],
      },
    })

    // Get user's votes for these posts
    const userVotes = await prisma.communityVote.findMany({
      where: {
        userId: session.user.id,
        postId: { in: posts.map((p) => p.id) },
      },
      select: { postId: true, value: true },
    })

    const votesMap = new Map(userVotes.map((v) => [v.postId, v.value]))

    const postsWithVotes = posts.map((post) => ({
      ...post,
      commentCount: post._count.comments,
      userVote: votesMap.get(post.id) || 0,
    }))

    return NextResponse.json({
      posts: postsWithVotes,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + posts.length < total,
      },
    })
  } catch (error) {
    console.error('Error fetching community posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/community/posts
 * Create a new community post
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access - requires full community access to post
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'community_full')
    if (featureError) return featureError
  }

  try {
    const body = await request.json()
    const {
      title,
      content,
      type = 'DISCUSSION',
      subject,
      tags = [],
      schoolOnly = false,
    } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const post = await prisma.communityPost.create({
      data: {
        title,
        content,
        type: type as CommunityPostType,
        subject,
        tags,
        authorId: session.user.id,
        schoolId: schoolOnly ? session.user.schoolId : null,
      },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    })

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    console.error('Error creating community post:', error)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
}
