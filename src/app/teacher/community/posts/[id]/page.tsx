'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Author {
  id: string
  name: string
  role: string
}

interface Comment {
  id: string
  content: string
  upvotes: number
  isAnswer: boolean
  createdAt: string
  author: Author
  replies: Comment[]
  userVote: number
}

interface Post {
  id: string
  title: string
  content: string
  type: 'QUESTION' | 'DISCUSSION' | 'RESOURCE' | 'TIP' | 'ANNOUNCEMENT'
  subject: string | null
  tags: string[]
  upvotes: number
  viewCount: number
  isPinned: boolean
  isResolved: boolean
  createdAt: string
  author: Author
  comments: Comment[]
  userVote: number
}

const typeColors = {
  QUESTION: 'bg-purple-100 text-purple-800',
  DISCUSSION: 'bg-blue-100 text-blue-800',
  RESOURCE: 'bg-green-100 text-green-800',
  TIP: 'bg-yellow-100 text-yellow-800',
  ANNOUNCEMENT: 'bg-red-100 text-red-800',
}

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession()
  const { id } = use(params)

  const [post, setPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchPost()
  }, [id])

  async function fetchPost() {
    try {
      const res = await fetch(`/api/community/posts/${id}`)
      if (!res.ok) {
        if (res.status === 403) {
          setError('This feature is not available with your current subscription')
        } else if (res.status === 404) {
          setError('Post not found')
        } else {
          setError('Failed to load post')
        }
        return
      }
      const data = await res.json()
      setPost(data.post)
    } catch {
      setError('Failed to load post')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVote(postId: string, currentVote: number, commentId?: string) {
    const newValue = currentVote === 1 ? 0 : 1

    try {
      const res = await fetch(`/api/community/posts/${postId}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newValue, commentId }),
      })

      if (res.ok) {
        const data = await res.json()

        if (commentId) {
          setPost((prev) => {
            if (!prev) return prev
            const updateComments = (comments: Comment[]): Comment[] =>
              comments.map((c) => {
                if (c.id === commentId) {
                  return {
                    ...c,
                    upvotes: c.upvotes + data.upvoteChange,
                    userVote: newValue,
                  }
                }
                return { ...c, replies: updateComments(c.replies) }
              })
            return { ...prev, comments: updateComments(prev.comments) }
          })
        } else {
          setPost((prev) =>
            prev
              ? {
                  ...prev,
                  upvotes: prev.upvotes + data.upvoteChange,
                  userVote: newValue,
                }
              : prev
          )
        }
      }
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  async function handleComment(parentId?: string) {
    const content = parentId ? replyContent : newComment
    if (!content.trim()) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/community/posts/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), parentId }),
      })

      if (res.ok) {
        setNewComment('')
        setReplyContent('')
        setReplyingTo(null)
        fetchPost() // Refresh to get new comment
      }
    } catch (error) {
      console.error('Error commenting:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {error || 'Post not found'}
        </h2>
        <Link href="/teacher/community">
          <Button variant="primary">← Back to Community</Button>
        </Link>
      </div>
    )
  }

  return (
    <div data-testid="page-post-detail" className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/teacher/community"
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block"
      >
        ← Back to Community
      </Link>

      {/* Post */}
      <Card variant="bordered" className="mb-6">
        <CardContent className="p-6">
          <div className="flex gap-4">
            {/* Vote column */}
            <div className="flex flex-col items-center gap-1 text-gray-500">
              <button
                onClick={() => handleVote(post.id, post.userVote)}
                className={`p-2 rounded hover:bg-gray-100 ${
                  post.userVote === 1 ? 'text-blue-600' : ''
                }`}
              >
                <svg className="w-6 h-6" fill={post.userVote === 1 ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <span className={`text-xl font-bold ${post.userVote === 1 ? 'text-blue-600' : ''}`}>
                {post.upvotes}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-sm px-3 py-1 rounded-full ${typeColors[post.type]}`}>
                  {post.type}
                </span>
                {post.isResolved && (
                  <span className="text-sm px-3 py-1 bg-green-100 text-green-800 rounded-full">
                    ✓ Resolved
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h1>

              <div className="prose max-w-none mb-4">
                <p className="whitespace-pre-wrap">{post.content}</p>
              </div>

              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t">
                <span className="font-medium text-gray-700">{post.author.name}</span>
                <span>{formatDate(post.createdAt)}</span>
                <span>{post.viewCount} views</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {post.comments.length} {post.comments.length === 1 ? 'Comment' : 'Comments'}
        </h2>

        {/* New Comment Form */}
        <Card variant="bordered" className="mb-6">
          <CardContent className="p-4">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
            />
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => handleComment()}
                disabled={isSubmitting || !newComment.trim()}
              >
                {isSubmitting ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comments List */}
        <div className="space-y-4">
          {post.comments.map((comment) => (
            <Card key={comment.id} variant="bordered" className={comment.isAnswer ? 'border-green-300 bg-green-50' : ''}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {/* Vote */}
                  <div className="flex flex-col items-center gap-1 text-gray-400">
                    <button
                      onClick={() => handleVote(post.id, comment.userVote, comment.id)}
                      className={`p-1 rounded hover:bg-gray-100 ${
                        comment.userVote === 1 ? 'text-blue-600' : ''
                      }`}
                    >
                      <svg className="w-4 h-4" fill={comment.userVote === 1 ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <span className="text-sm">{comment.upvotes}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    {comment.isAnswer && (
                      <span className="text-xs px-2 py-0.5 bg-green-200 text-green-800 rounded mb-2 inline-block">
                        ✓ Accepted Answer
                      </span>
                    )}
                    <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="font-medium">{comment.author.name}</span>
                      <span>{formatDate(comment.createdAt)}</span>
                      <button
                        onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                        className="text-blue-600 hover:underline"
                      >
                        Reply
                      </button>
                    </div>

                    {/* Reply form */}
                    {replyingTo === comment.id && (
                      <div className="mt-3 pl-4 border-l-2 border-gray-200">
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Write a reply..."
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleComment(comment.id)}
                            disabled={isSubmitting || !replyContent.trim()}
                          >
                            Reply
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReplyingTo(null)
                              setReplyContent('')
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Replies */}
                    {comment.replies.length > 0 && (
                      <div className="mt-4 pl-4 border-l-2 border-gray-200 space-y-3">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="pt-3">
                            <p className="text-gray-700 text-sm whitespace-pre-wrap">
                              {reply.content}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                              <span className="font-medium">{reply.author.name}</span>
                              <span>{formatDate(reply.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
