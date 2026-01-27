import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'
import { UserRole } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/community/posts/[id]
 * Get a specific post with comments
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'community_read')
    if (featureError) return featureError
  }

  const { id } = await params

  try {
    const post = await prisma.communityPost.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
        comments: {
          where: { parentId: null }, // Top-level comments only
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
        },
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check access to school-specific posts
    if (post.schoolId && post.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Increment view count
    await prisma.communityPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    })

    // Get user's vote for this post
    const userVote = await prisma.communityVote.findUnique({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId: id,
        },
      },
    })

    // Get user's votes for comments
    const commentIds = post.comments.flatMap((c) => [
      c.id,
      ...c.replies.map((r) => r.id),
    ])

    const commentVotes = await prisma.communityVote.findMany({
      where: {
        userId: session.user.id,
        commentId: { in: commentIds },
      },
    })

    const commentVotesMap = new Map(commentVotes.map((v) => [v.commentId, v.value]))

    const commentsWithVotes = post.comments.map((comment) => ({
      ...comment,
      userVote: commentVotesMap.get(comment.id) || 0,
      replies: comment.replies.map((reply) => ({
        ...reply,
        userVote: commentVotesMap.get(reply.id) || 0,
      })),
    }))

    return NextResponse.json({
      post: {
        ...post,
        comments: commentsWithVotes,
        userVote: userVote?.value || 0,
      },
    })
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/community/posts/[id]
 * Update a post (author only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const existingPost = await prisma.communityPost.findUnique({
      where: { id },
    })

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Only author or admin can edit
    if (
      existingPost.authorId !== session.user.id &&
      session.user.role !== UserRole.ADMIN
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, subject, tags, isResolved } = body

    const post = await prisma.communityPost.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(subject !== undefined && { subject }),
        ...(tags !== undefined && { tags }),
        ...(isResolved !== undefined && { isResolved }),
      },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    })

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error updating post:', error)
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/community/posts/[id]
 * Delete a post (author or admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const existingPost = await prisma.communityPost.findUnique({
      where: { id },
    })

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Only author or admin can delete
    if (
      existingPost.authorId !== session.user.id &&
      session.user.role !== UserRole.ADMIN
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await prisma.communityPost.delete({ where: { id } })

    return NextResponse.json({ message: 'Post deleted' })
  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    )
  }
}
