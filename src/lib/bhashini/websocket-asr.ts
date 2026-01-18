/**
 * BHASHINI WebSocket ASR Client
 * Real-time speech-to-text streaming
 */

import type {
  BhashiniLanguageCode,
  WebSocketASRConfig,
  WebSocketASRMessage,
  WebSocketASRResult,
} from './types'
import { createMockStreamingASR, shouldUseMock } from './mock'

export type ASREventCallback = (result: WebSocketASRResult) => void
export type ConnectionStatusCallback = (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void

export interface StreamingASROptions {
  language: BhashiniLanguageCode
  samplingRate?: number
  onPartialResult?: ASREventCallback
  onFinalResult?: ASREventCallback
  onStatusChange?: ConnectionStatusCallback
  onError?: (error: Error) => void
}

export class StreamingASRClient {
  private ws: WebSocket | null = null
  private options: Required<StreamingASROptions>
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private mockClient: ReturnType<typeof createMockStreamingASR> | null = null

  constructor(options: StreamingASROptions) {
    this.options = {
      samplingRate: 16000,
      onPartialResult: () => {},
      onFinalResult: () => {},
      onStatusChange: () => {},
      onError: () => {},
      ...options,
    }
  }

  /**
   * Connect to BHASHINI WebSocket ASR service
   */
  async connect(wsUrl: string, apiKey: string): Promise<void> {
    // Use mock in development
    if (shouldUseMock()) {
      this.mockClient = createMockStreamingASR(
        this.options.language,
        (text) => {
          this.options.onPartialResult({
            type: 'partial',
            transcript: text,
            isFinal: false,
          })
        },
        (text, confidence) => {
          this.options.onFinalResult({
            type: 'final',
            transcript: text,
            confidence,
            isFinal: true,
          })
        }
      )
      this.isConnected = true
      this.options.onStatusChange('connected')
      return
    }

    return new Promise((resolve, reject) => {
      this.options.onStatusChange('connecting')

      try {
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          this.isConnected = true
          this.reconnectAttempts = 0
          this.options.onStatusChange('connected')

          // Send initial config
          const startMessage: WebSocketASRMessage = {
            type: 'start',
            config: {
              language: this.options.language,
              serviceId: '', // Will be set by server based on config
              samplingRate: this.options.samplingRate,
              audioFormat: 'wav',
            },
          }

          this.ws?.send(JSON.stringify(startMessage))
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as WebSocketASRResult
            if (data.isFinal) {
              this.options.onFinalResult(data)
            } else {
              this.options.onPartialResult(data)
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.options.onStatusChange('error')
          this.options.onError(new Error('WebSocket connection error'))
        }

        this.ws.onclose = () => {
          this.isConnected = false
          this.options.onStatusChange('disconnected')

          // Attempt reconnect
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            setTimeout(() => {
              this.connect(wsUrl, apiKey)
            }, Math.pow(2, this.reconnectAttempts) * 1000)
          }
        }
      } catch (error) {
        this.options.onStatusChange('error')
        reject(error)
      }
    })
  }

  /**
   * Send audio chunk for transcription
   */
  sendAudio(audioChunk: ArrayBuffer | string): void {
    if (this.mockClient) {
      const base64 = typeof audioChunk === 'string' ? audioChunk : this.arrayBufferToBase64(audioChunk)
      this.mockClient.sendAudio(base64)
      return
    }

    if (!this.ws || !this.isConnected) {
      console.warn('WebSocket not connected')
      return
    }

    const base64Audio =
      typeof audioChunk === 'string' ? audioChunk : this.arrayBufferToBase64(audioChunk)

    const message: WebSocketASRMessage = {
      type: 'audio',
      audio: base64Audio,
    }

    this.ws.send(JSON.stringify(message))
  }

  /**
   * Stop streaming and close connection
   */
  stop(): void {
    if (this.mockClient) {
      this.mockClient.stop()
      this.mockClient = null
      this.isConnected = false
      this.options.onStatusChange('disconnected')
      return
    }

    if (this.ws) {
      // Send stop message
      const stopMessage: WebSocketASRMessage = {
        type: 'stop',
      }
      this.ws.send(JSON.stringify(stopMessage))

      // Close connection after a short delay to allow final results
      setTimeout(() => {
        this.ws?.close()
        this.ws = null
      }, 500)
    }

    this.isConnected = false
  }

  /**
   * Check if client is connected
   */
  getIsConnected(): boolean {
    return this.isConnected
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }
}

/**
 * Create a streaming ASR client
 */
export function createStreamingASRClient(options: StreamingASROptions): StreamingASRClient {
  return new StreamingASRClient(options)
}
