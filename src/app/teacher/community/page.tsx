'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

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
  author: {
    id: string
    name: string
    role: string
  }
  commentCount: number
  userVote: number
}

const typeColors = {
  QUESTION: 'bg-purple-100 text-purple-800',
  DISCUSSION: 'bg-blue-100 text-blue-800',
  RESOURCE: 'bg-green-100 text-green-800',
  TIP: 'bg-yellow-100 text-yellow-800',
  ANNOUNCEMENT: 'bg-red-100 text-red-800',
}

const typeIcons = {
  QUESTION: '?',
  DISCUSSION: '💬',
  RESOURCE: '📚',
  TIP: '💡',
  ANNOUNCEMENT: '📢',
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [sortBy, setSortBy] = useState('recent')

  useEffect(() => {
    fetchPosts()
  }, [selectedType, sortBy])

  async function fetchPosts() {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedType) params.append('type', selectedType)
      params.append('sortBy', sortBy)

      const res = await fetch(`/api/community/posts?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!search.trim()) {
      fetchPosts()
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/community/search?q=${encodeURIComponent(search)}`)
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts)
      }
    } catch (error) {
      console.error('Error searching:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVote(postId: string, currentVote: number) {
    const newValue = currentVote === 1 ? 0 : 1

    try {
      const res = await fetch(`/api/community/posts/${postId}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newValue }),
      })

      if (res.ok) {
        const data = await res.json()
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  upvotes: p.upvotes + data.upvoteChange,
                  userVote: newValue,
                }
              : p
          )
        )
      }
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div data-testid="page-community">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teacher Community</h1>
          <p className="text-gray-600 mt-1">
            Share knowledge, ask questions, and connect with fellow teachers
          </p>
        </div>
        <Link href="/teacher/community/posts/new">
          <Button variant="primary">+ New Post</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card variant="bordered" className="mb-6">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                type="text"
                placeholder="Search posts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'QUESTION', label: 'Questions' },
                  { value: 'DISCUSSION', label: 'Discussions' },
                  { value: 'RESOURCE', label: 'Resources' },
                  { value: 'TIP', label: 'Tips' },
                  { value: 'ANNOUNCEMENT', label: 'Announcements' },
                ]}
              />
            </div>
            <div className="w-36">
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                options={[
                  { value: 'recent', label: 'Recent' },
                  { value: 'popular', label: 'Popular' },
                  { value: 'trending', label: 'Trending' },
                ]}
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Posts List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-500 mb-4">Be the first to start a discussion!</p>
            <Link href="/teacher/community/posts/new">
              <Button variant="primary">Create Post</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} variant="bordered" className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Vote column */}
                  <div className="flex flex-col items-center gap-1 text-gray-500">
                    <button
                      onClick={() => handleVote(post.id, post.userVote)}
                      className={`p-1 rounded hover:bg-gray-100 ${
                        post.userVote === 1 ? 'text-blue-600' : ''
                      }`}
                    >
                      <svg className="w-5 h-5" fill={post.userVote === 1 ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <span className={`font-medium ${post.userVote === 1 ? 'text-blue-600' : ''}`}>
                      {post.upvotes}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {post.isPinned && (
                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full">
                          Pinned
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[post.type]}`}>
                        {typeIcons[post.type]} {post.type}
                      </span>
                      {post.type === 'QUESTION' && post.isResolved && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                          ✓ Resolved
                        </span>
                      )}
                    </div>

                    <Link href={`/teacher/community/posts/${post.id}`}>
                      <h3 className="font-semibold text-gray-900 hover:text-blue-600 mb-1">
                        {post.title}
                      </h3>
                    </Link>

                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {post.content}
                    </p>

                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {post.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{post.author.name}</span>
                      <span>{formatDate(post.createdAt)}</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {post.commentCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {post.viewCount}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
