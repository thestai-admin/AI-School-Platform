'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseOfflineStatusReturn {
  isOnline: boolean
  isOffline: boolean
  wasOffline: boolean
  onOnline: (callback: () => void) => () => void
  onOffline: (callback: () => void) => () => void
}

export function useOfflineStatus(): UseOfflineStatusReturn {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [wasOffline, setWasOffline] = useState(false)

  // Callback refs for event handlers
  const onlineCallbacks = new Set<() => void>()
  const offlineCallbacks = new Set<() => void>()

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (!isOnline) {
        setWasOffline(true)
      }
      onlineCallbacks.forEach((cb) => cb())
    }

    const handleOffline = () => {
      setIsOnline(false)
      offlineCallbacks.forEach((cb) => cb())
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isOnline])

  // Subscribe to online events
  const onOnline = useCallback((callback: () => void) => {
    onlineCallbacks.add(callback)
    return () => {
      onlineCallbacks.delete(callback)
    }
  }, [])

  // Subscribe to offline events
  const onOffline = useCallback((callback: () => void) => {
    offlineCallbacks.add(callback)
    return () => {
      offlineCallbacks.delete(callback)
    }
  }, [])

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
    onOnline,
    onOffline,
  }
}

// Connection quality check using ping
export function useConnectionQuality() {
  const [latency, setLatency] = useState<number | null>(null)
  const [quality, setQuality] = useState<'good' | 'fair' | 'poor' | 'unknown'>('unknown')

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const start = performance.now()
        await fetch('/api/health', { method: 'HEAD' })
        const end = performance.now()
        const pingTime = end - start

        setLatency(pingTime)

        if (pingTime < 100) {
          setQuality('good')
        } else if (pingTime < 300) {
          setQuality('fair')
        } else {
          setQuality('poor')
        }
      } catch {
        setLatency(null)
        setQuality('poor')
      }
    }

    // Initial check
    checkConnection()

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000)

    return () => clearInterval(interval)
  }, [])

  return { latency, quality }
}
