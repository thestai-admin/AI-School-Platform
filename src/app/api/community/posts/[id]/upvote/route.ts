import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/community/posts/[id]/upvote
 * Toggle upvote on a post or comment
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
    const { commentId, value = 1 } = body // value: 1 for upvote, -1 for downvote, 0 to remove

    // Determine if voting on post or comment
    const isCommentVote = !!commentId

    // Check existing vote
    const existingVote = await prisma.communityVote.findFirst({
      where: {
        userId: session.user.id,
        ...(isCommentVote ? { commentId } : { postId }),
      },
    })

    let newVote = null
    let upvoteChange = 0

    if (existingVote) {
      if (value === 0 || existingVote.value === value) {
        // Remove vote
        await prisma.communityVote.delete({
          where: { id: existingVote.id },
        })
        upvoteChange = -existingVote.value
      } else {
        // Change vote
        newVote = await prisma.communityVote.update({
          where: { id: existingVote.id },
          data: { value },
        })
        upvoteChange = value - existingVote.value
      }
    } else if (value !== 0) {
      // Create new vote
      newVote = await prisma.communityVote.create({
        data: {
          userId: session.user.id,
          value,
          ...(isCommentVote ? { commentId } : { postId }),
        },
      })
      upvoteChange = value
    }

    // Update upvote count on post or comment
    if (isCommentVote) {
      await prisma.communityComment.update({
        where: { id: commentId },
        data: { upvotes: { increment: upvoteChange } },
      })
    } else {
      await prisma.communityPost.update({
        where: { id: postId },
        data: { upvotes: { increment: upvoteChange } },
      })
    }

    return NextResponse.json({
      vote: newVote,
      upvoteChange,
      message: newVote ? 'Vote recorded' : 'Vote removed',
    })
  } catch (error) {
    console.error('Error toggling vote:', error)
    return NextResponse.json(
      { error: 'Failed to toggle vote' },
      { status: 500 }
    )
  }
}
