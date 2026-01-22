'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

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

  // Use refs to store callbacks - persists across renders and can be modified
  const onlineCallbacksRef = useRef(new Set<() => void>())
  const offlineCallbacksRef = useRef(new Set<() => void>())

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setWasOffline(true)
      onlineCallbacksRef.current.forEach((cb) => cb())
    }

    const handleOffline = () => {
      setIsOnline(false)
      offlineCallbacksRef.current.forEach((cb) => cb())
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Subscribe to online events
  const onOnline = useCallback((callback: () => void) => {
    onlineCallbacksRef.current.add(callback)
    return () => {
      onlineCallbacksRef.current.delete(callback)
    }
  }, [])

  // Subscribe to offline events
  const onOffline = useCallback((callback: () => void) => {
    offlineCallbacksRef.current.add(callback)
    return () => {
      offlineCallbacksRef.current.delete(callback)
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
