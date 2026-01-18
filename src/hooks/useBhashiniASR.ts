'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import { useBhashiniStore } from '@/stores/bhashini-store'
import type { BhashiniLanguageCode } from '@/lib/bhashini/types'
import { createStreamingASRClient, StreamingASRClient } from '@/lib/bhashini/websocket-asr'

interface UseBhashiniASROptions {
  language?: BhashiniLanguageCode
  onTranscript?: (text: string, isFinal: boolean) => void
  onError?: (error: Error) => void
  autoStart?: boolean
}

interface UseBhashiniASRReturn {
  isRecording: boolean
  hasPermission: boolean
  transcript: string
  partialTranscript: string
  confidence: number
  startRecording: () => Promise<void>
  stopRecording: () => void
  requestMicrophonePermission: () => Promise<boolean>
  error: string | null
}

const SAMPLE_RATE = 16000
const BUFFER_SIZE = 4096

export function useBhashiniASR(options: UseBhashiniASROptions = {}): UseBhashiniASRReturn {
  const {
    language,
    onTranscript,
    onError,
    autoStart = false,
  } = options

  const store = useBhashiniStore()

  // Refs for audio handling
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null)
  const asrClientRef = useRef<StreamingASRClient | null>(null)

  // Local error state
  const [error, setError] = useState<string | null>(null)

  // Use language from options or store
  const sourceLanguage = language || store.preferredSourceLanguage

  // Request microphone permission
  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      store.setMicrophonePermission(true)
      return true
    } catch (err) {
      console.error('Microphone permission denied:', err)
      store.setMicrophonePermission(false)
      setError('Microphone permission denied')
      return false
    }
  }, [store])

  // Convert Float32Array to base64 PCM
  const float32ToBase64 = useCallback((buffer: Float32Array): string => {
    // Convert float32 (-1 to 1) to int16 (-32768 to 32767)
    const int16Buffer = new Int16Array(buffer.length)
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]))
      int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }

    // Convert to base64
    const bytes = new Uint8Array(int16Buffer.buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }, [])

  // Downsample audio to target sample rate
  const downsample = useCallback(
    (buffer: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array => {
      if (inputSampleRate === outputSampleRate) {
        return buffer
      }

      const ratio = inputSampleRate / outputSampleRate
      const newLength = Math.round(buffer.length / ratio)
      const result = new Float32Array(newLength)

      for (let i = 0; i < newLength; i++) {
        const index = Math.round(i * ratio)
        result[i] = buffer[index]
      }

      return result
    },
    []
  )

  // Start recording
  const startRecording = useCallback(async () => {
    if (store.isRecording) {
      return
    }

    setError(null)

    // Check/request permission
    if (!store.isMicrophonePermissionGranted) {
      const granted = await requestMicrophonePermission()
      if (!granted) {
        return
      }
    }

    try {
      // Create ASR client
      asrClientRef.current = createStreamingASRClient({
        language: sourceLanguage,
        samplingRate: SAMPLE_RATE,
        onPartialResult: (result) => {
          store.setPartialTranscript(result.transcript)
          onTranscript?.(result.transcript, false)
        },
        onFinalResult: (result) => {
          store.setCurrentTranscript(result.transcript, result.confidence)
          onTranscript?.(result.transcript, true)
        },
        onStatusChange: (status) => {
          store.setConnectionStatus(status)
        },
        onError: (err) => {
          setError(err.message)
          onError?.(err)
        },
      })

      // In mock mode, we don't need actual WebSocket connection
      // The mock client handles everything internally
      await asrClientRef.current.connect('', '')

      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      mediaStreamRef.current = stream

      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE })
      const source = audioContextRef.current.createMediaStreamSource(stream)

      // Create processor node for capturing audio
      processorNodeRef.current = audioContextRef.current.createScriptProcessor(
        BUFFER_SIZE,
        1,
        1
      )

      processorNodeRef.current.onaudioprocess = (event) => {
        if (!asrClientRef.current?.getIsConnected()) {
          return
        }

        const inputBuffer = event.inputBuffer.getChannelData(0)

        // Downsample if necessary
        const downsampledBuffer = downsample(
          inputBuffer,
          audioContextRef.current?.sampleRate || 44100,
          SAMPLE_RATE
        )

        // Convert to base64 and send
        const base64Audio = float32ToBase64(downsampledBuffer)
        asrClientRef.current.sendAudio(base64Audio)
      }

      source.connect(processorNodeRef.current)
      processorNodeRef.current.connect(audioContextRef.current.destination)

      store.setIsRecording(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording'
      setError(errorMessage)
      onError?.(new Error(errorMessage))
      console.error('Failed to start recording:', err)
    }
  }, [
    store,
    sourceLanguage,
    requestMicrophonePermission,
    onTranscript,
    onError,
    downsample,
    float32ToBase64,
  ])

  // Stop recording
  const stopRecording = useCallback(() => {
    // Stop ASR client
    if (asrClientRef.current) {
      asrClientRef.current.stop()
      asrClientRef.current = null
    }

    // Disconnect audio nodes
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect()
      processorNodeRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    store.setIsRecording(false)
    store.setConnectionStatus('disconnected')
  }, [store])

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart) {
      startRecording()
    }

    // Cleanup on unmount
    return () => {
      stopRecording()
    }
  }, []) // Only run on mount/unmount

  return {
    isRecording: store.isRecording,
    hasPermission: store.isMicrophonePermissionGranted,
    transcript: store.currentTranscript,
    partialTranscript: store.partialTranscript,
    confidence: store.transcriptConfidence,
    startRecording,
    stopRecording,
    requestMicrophonePermission,
    error,
  }
}
