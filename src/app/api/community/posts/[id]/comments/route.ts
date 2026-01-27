import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/community/posts/[id]/comments
 * Get comments for a post
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: postId } = await params

  try {
    const comments = await prisma.communityComment.findMany({
      where: {
        postId,
        parentId: null, // Top-level comments only
      },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, role: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ isAnswer: 'desc' }, { upvotes: 'desc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/community/posts/[id]/comments
 * Add a comment to a post
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'community_full')
    if (featureError) return featureError
  }

  const { id: postId } = await params

  try {
    const body = await request.json()
    const { content, parentId } = body

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Verify post exists
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // If replying, verify parent comment exists
    if (parentId) {
      const parentComment = await prisma.communityComment.findUnique({
        where: { id: parentId },
      })

      if (!parentComment || parentComment.postId !== postId) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        )
      }
    }

    const comment = await prisma.communityComment.create({
      data: {
        content,
        postId,
        authorId: session.user.id,
        parentId,
      },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    })

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
