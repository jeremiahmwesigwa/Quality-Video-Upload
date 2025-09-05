// Video Export Engine
// Handles video processing and export with social media optimization

export interface ExportSettings {
  resolution: { width: number; height: number }
  frameRate: number
  bitrate: number // in Mbps
  format: "mp4" | "mov" | "webm"
  codec: "h264" | "h265" | "vp9"
  colorSpace: "rec709" | "rec2020" | "srgb"
  audioCodec: "aac" | "mp3" | "opus"
  audioBitrate: number // in kbps
  audioSampleRate: number // in Hz
  platform: "tiktok" | "instagram" | "whatsapp" | "custom"
}

export interface ExportProgress {
  stage: "analyzing" | "processing" | "encoding" | "finalizing" | "complete" | "error"
  progress: number // 0-100
  currentFrame?: number
  totalFrames?: number
  timeRemaining?: number // in seconds
  message?: string
}

export const PLATFORM_PRESETS: Record<string, ExportSettings> = {
  tiktok: {
    resolution: { width: 1080, height: 1920 },
    frameRate: 30,
    bitrate: 12,
    format: "mp4",
    codec: "h264",
    colorSpace: "rec709",
    audioCodec: "aac",
    audioBitrate: 192,
    audioSampleRate: 44100,
    platform: "tiktok",
  },
  instagram: {
    resolution: { width: 1080, height: 1920 },
    frameRate: 30,
    bitrate: 10,
    format: "mp4",
    codec: "h264",
    colorSpace: "rec709",
    audioCodec: "aac",
    audioBitrate: 128,
    audioSampleRate: 44100,
    platform: "instagram",
  },
  whatsapp: {
    resolution: { width: 720, height: 1280 },
    frameRate: 30,
    bitrate: 8,
    format: "mp4",
    codec: "h264",
    colorSpace: "rec709",
    audioCodec: "aac",
    audioBitrate: 128,
    audioSampleRate: 44100,
    platform: "whatsapp",
  },
  custom: {
    resolution: { width: 1080, height: 1920 },
    frameRate: 30,
    bitrate: 12,
    format: "mp4",
    codec: "h264",
    colorSpace: "rec709",
    audioCodec: "aac",
    audioBitrate: 192,
    audioSampleRate: 44100,
    platform: "custom",
  },
}

export class VideoExportEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private video: HTMLVideoElement
  private audioVideo: HTMLVideoElement // Separate video element for audio preservation
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private isProcessing = false
  private processingStartTime = 0

  constructor() {
    this.canvas = document.createElement("canvas")
    this.ctx = this.canvas.getContext("2d")!
    this.video = document.createElement("video")
    this.video.preload = "metadata"
    this.video.muted = true // Prevent audio issues during processing

    this.audioVideo = document.createElement("video")
    this.audioVideo.preload = "metadata"
    this.audioVideo.muted = false // Keep audio for export
  }

  // Export video with enhancements and platform optimization
  async exportVideo(
    videoUrl: string,
    enhancementSettings: any,
    exportSettings: ExportSettings,
    onProgress?: (progress: ExportProgress) => void,
  ): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      try {
        this.processingStartTime = Date.now()
        this.isProcessing = true

        onProgress?.({
          stage: "analyzing",
          progress: 0,
          message: "Analyzing video properties...",
        })

        // Setup both video elements
        this.video.src = videoUrl
        this.video.crossOrigin = "anonymous"
        this.audioVideo.src = videoUrl // Setup audio video with same source
        this.audioVideo.crossOrigin = "anonymous"

        await Promise.all([
          new Promise((videoResolve, videoReject) => {
            this.video.onloadedmetadata = () => videoResolve(void 0)
            this.video.onerror = () => videoReject(new Error("Failed to load video"))
            setTimeout(() => videoReject(new Error("Video loading timeout")), 10000)
          }),
          new Promise((audioResolve, audioReject) => {
            this.audioVideo.onloadedmetadata = () => audioResolve(void 0)
            this.audioVideo.onerror = () => audioReject(new Error("Failed to load audio"))
            setTimeout(() => audioReject(new Error("Audio loading timeout")), 10000)
          }),
        ])

        // Set canvas dimensions based on export settings
        this.canvas.width = exportSettings.resolution.width
        this.canvas.height = exportSettings.resolution.height

        onProgress?.({
          stage: "processing",
          progress: 10,
          message: "Setting up video processing...",
        })

        const stream = this.canvas.captureStream(Math.min(exportSettings.frameRate, 30))

        try {
          // Get audio stream from the audio video element
          const audioStream = this.audioVideo.captureStream
            ? this.audioVideo.captureStream()
            : await navigator.mediaDevices.getUserMedia({ video: false, audio: true })

          // Add audio tracks to the main stream
          audioStream.getAudioTracks().forEach((track) => {
            stream.addTrack(track)
          })
        } catch (audioError) {
          console.warn("Audio capture failed, trying alternative method:", audioError)

          // Alternative audio handling
          try {
            const audioContext = new AudioContext()
            const source = audioContext.createMediaElementSource(this.audioVideo)
            const destination = audioContext.createMediaStreamDestination()
            source.connect(destination)
            source.connect(audioContext.destination) // Also connect to speakers

            destination.stream.getAudioTracks().forEach((track) => {
              stream.addTrack(track)
            })
          } catch (fallbackError) {
            console.warn("All audio processing methods failed, exporting without audio:", fallbackError)
          }
        }

        this.recordedChunks = []

        const mimeType = this.getSupportedMimeType(exportSettings)
        this.mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: exportSettings.bitrate * 1000000,
          audioBitsPerSecond: exportSettings.audioBitrate * 1000,
        })

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.recordedChunks.push(event.data)
          }
        }

        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.recordedChunks, { type: mimeType })
          onProgress?.({
            stage: "complete",
            progress: 100,
            message: "Export completed successfully!",
          })
          this.isProcessing = false
          resolve(blob)
        }

        this.mediaRecorder.start(200)

        onProgress?.({
          stage: "encoding",
          progress: 20,
          message: "Encoding enhanced video with original audio...",
        })

        await this.processVideoOptimized(enhancementSettings, exportSettings, onProgress)

        // Stop recording
        this.mediaRecorder.stop()
      } catch (error) {
        this.isProcessing = false
        onProgress?.({
          stage: "error",
          progress: 0,
          message: `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
        reject(error)
      }
    })
  }

  private async processVideoOptimized(
    enhancementSettings: any,
    exportSettings: ExportSettings,
    onProgress?: (progress: ExportProgress) => void,
  ) {
    const duration = this.video.duration

    return new Promise<void>((resolve) => {
      let startTime = 0
      let lastProgressUpdate = 0

      const processVideo = (currentTime: number) => {
        if (!this.isProcessing) {
          resolve()
          return
        }

        if (startTime === 0) startTime = currentTime
        const elapsed = (currentTime - startTime) / 1000

        if (currentTime - lastProgressUpdate > 100) {
          const progress = Math.min(20 + (elapsed / duration) * 70, 90)
          const timeRemaining = duration - elapsed

          onProgress?.({
            stage: "encoding",
            progress,
            timeRemaining: Math.max(0, timeRemaining),
            message: `Processing enhanced video... ${Math.round(progress)}% complete`,
          })

          lastProgressUpdate = currentTime
        }

        this.drawEnhancedFrameOptimized(enhancementSettings, exportSettings)

        if (elapsed < duration) {
          requestAnimationFrame(processVideo)
        } else {
          onProgress?.({
            stage: "finalizing",
            progress: 95,
            message: "Finalizing enhanced video export...",
          })
          setTimeout(() => resolve(), 500)
        }
      }

      this.video.currentTime = 0
      this.audioVideo.currentTime = 0

      Promise.all([this.video.play(), this.audioVideo.play()])
        .then(() => {
          requestAnimationFrame(processVideo)
        })
        .catch(() => {
          // Fallback to manual processing
          this.processVideoFramesManual(enhancementSettings, exportSettings, onProgress).then(resolve)
        })
    })
  }

  private drawEnhancedFrameOptimized(enhancementSettings: any, exportSettings: ExportSettings) {
    if (this.video.readyState < 2) return

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    const originalVideoAspect = this.video.videoWidth / this.video.videoHeight
    const canvasAspect = this.canvas.width / this.canvas.height

    let drawWidth = this.canvas.width
    let drawHeight = this.canvas.height
    let offsetX = 0
    let offsetY = 0

    // Calculate exact dimensions to maintain original aspect ratio
    if (Math.abs(originalVideoAspect - canvasAspect) > 0.001) {
      if (originalVideoAspect > canvasAspect) {
        // Video is wider than canvas - fit to width, letterbox top/bottom
        drawWidth = this.canvas.width
        drawHeight = Math.round(drawWidth / originalVideoAspect)
        offsetY = Math.round((this.canvas.height - drawHeight) / 2)
        offsetX = 0
      } else {
        // Video is taller than canvas - fit to height, pillarbox left/right
        drawHeight = this.canvas.height
        drawWidth = Math.round(drawHeight * originalVideoAspect)
        offsetX = Math.round((this.canvas.width - drawWidth) / 2)
        offsetY = 0
      }
    }

    this.ctx.save()

    // Fill letterbox/pillarbox areas with black to maintain video dimensions
    this.ctx.fillStyle = "#000000"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.applyAllEnhancements(enhancementSettings)

    try {
      // Draw video with exact original aspect ratio preserved
      this.ctx.drawImage(this.video, offsetX, offsetY, drawWidth, drawHeight)
    } catch (error) {
      console.warn("Frame drawing failed:", error)
    }

    this.ctx.restore()
  }

  private applyAllEnhancements(settings: any) {
    if (!settings) return

    const filters = []

    // Apply all enhancement filters
    if (settings.brightness !== undefined && settings.brightness !== 0) {
      filters.push(`brightness(${1 + settings.brightness / 100})`)
    }

    if (settings.contrast !== undefined && settings.contrast !== 0) {
      filters.push(`contrast(${1 + settings.contrast / 100})`)
    }

    if (settings.saturation !== undefined && settings.saturation !== 0) {
      filters.push(`saturate(${1 + settings.saturation / 100})`)
    }

    if (settings.sharpness !== undefined && settings.sharpness !== 0) {
      // Simulate sharpness with contrast and brightness
      const sharpnessValue = settings.sharpness / 100
      filters.push(`contrast(${1 + sharpnessValue * 0.2})`)
    }

    if (settings.vibrance !== undefined && settings.vibrance !== 0) {
      // Vibrance as enhanced saturation
      filters.push(`saturate(${1 + (settings.vibrance * 0.8) / 100})`)
    }

    if (settings.warmth !== undefined && settings.warmth !== 0) {
      // Warmth as sepia tone
      const warmthValue = Math.abs(settings.warmth) / 100
      if (settings.warmth > 0) {
        filters.push(`sepia(${warmthValue * 0.3})`)
      } else {
        filters.push(`hue-rotate(${settings.warmth * 2}deg)`)
      }
    }

    if (settings.gamma !== undefined && settings.gamma !== 0) {
      // Gamma as brightness adjustment
      filters.push(`brightness(${1 + settings.gamma / 200})`)
    }

    // Apply cinematic mode effects
    if (settings.cinematicMode) {
      filters.push("contrast(1.1)")
      filters.push("saturate(1.2)")
      filters.push("sepia(0.1)")
    }

    if (filters.length > 0) {
      this.ctx.filter = filters.join(" ")
    }
  }

  private async processVideoFramesManual(
    enhancementSettings: any,
    exportSettings: ExportSettings,
    onProgress?: (progress: ExportProgress) => void,
  ) {
    const duration = this.video.duration
    const frameInterval = 1 / Math.min(exportSettings.frameRate, 15) // Reduce FPS for manual processing
    const totalFrames = Math.floor(duration / frameInterval)
    let currentFrame = 0

    return new Promise<void>((resolve) => {
      const processFrame = () => {
        if (currentFrame >= totalFrames || !this.isProcessing) {
          resolve()
          return
        }

        const currentTime = currentFrame * frameInterval
        this.video.currentTime = Math.min(currentTime, duration - 0.1)

        this.video.onseeked = () => {
          this.drawEnhancedFrameOptimized(enhancementSettings, exportSettings)

          currentFrame++
          const progress = 20 + (currentFrame / totalFrames) * 70

          if (currentFrame % 5 === 0) {
            const timeRemaining = (totalFrames - currentFrame) * frameInterval * 0.1 // More realistic estimate
            onProgress?.({
              stage: "encoding",
              progress,
              currentFrame,
              totalFrames,
              timeRemaining,
              message: `Processing frame ${currentFrame} of ${totalFrames}...`,
            })
          }

          setTimeout(processFrame, 50)
        }
      }

      processFrame()
    })
  }

  private drawEnhancedFrame(enhancementSettings: any, exportSettings: ExportSettings) {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Save context for transformations
    this.ctx.save()

    // Apply enhancement filters
    this.applyEnhancements(enhancementSettings)

    // Calculate scaling to fit export resolution while maintaining aspect ratio
    const videoAspect = this.video.videoWidth / this.video.videoHeight
    const canvasAspect = this.canvas.width / this.canvas.height

    let drawWidth = this.canvas.width
    let drawHeight = this.canvas.height
    let offsetX = 0
    let offsetY = 0

    if (videoAspect > canvasAspect) {
      // Video is wider, fit to height
      drawHeight = this.canvas.height
      drawWidth = drawHeight * videoAspect
      offsetX = (this.canvas.width - drawWidth) / 2
    } else {
      // Video is taller, fit to width
      drawWidth = this.canvas.width
      drawHeight = drawWidth / videoAspect
      offsetY = (this.canvas.height - drawHeight) / 2
    }

    // Draw video frame with scaling
    this.ctx.drawImage(this.video, offsetX, offsetY, drawWidth, drawHeight)

    // Apply post-processing effects
    if (enhancementSettings?.cinematicMode) {
      this.applyCinematicEffects()
    }

    this.ctx.restore()
  }

  private applyEnhancements(settings: any) {
    if (!settings) return

    // Apply brightness
    if (settings.brightness !== 0) {
      this.ctx.globalCompositeOperation = "screen"
      this.ctx.fillStyle = `rgba(255, 255, 255, ${settings.brightness / 100})`
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      this.ctx.globalCompositeOperation = "source-over"
    }

    // Apply contrast (simplified)
    if (settings.contrast !== 0) {
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
      const data = imageData.data
      const factor = (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast))

      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128)) // R
        data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128)) // G
        data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128)) // B
      }

      this.ctx.putImageData(imageData, 0, 0)
    }
  }

  private applyCinematicEffects() {
    // Apply subtle vignette
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height / 2,
      0,
      this.canvas.width / 2,
      this.canvas.height / 2,
      Math.max(this.canvas.width, this.canvas.height) / 2,
    )
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)")
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.3)")

    this.ctx.globalCompositeOperation = "multiply"
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.globalCompositeOperation = "source-over"
  }

  private getSupportedMimeType(settings: ExportSettings): string {
    const mimeTypes = [
      `video/${settings.format}; codecs="${settings.codec}"`,
      `video/${settings.format}`,
      'video/webm; codecs="vp9"',
      'video/webm; codecs="vp8"',
      "video/webm",
      "video/mp4",
    ]

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType
      }
    }

    return "video/webm" // Fallback
  }

  // Generate optimized filename
  generateFilename(originalName: string, platform: string, settings: ExportSettings): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-")
    const baseName = originalName.replace(/\.[^/.]+$/, "") // Remove extension
    const resolution = `${settings.resolution.width}x${settings.resolution.height}`

    return `${baseName}_${platform}_${resolution}_enhanced_${timestamp}.${settings.format}`
  }

  // Estimate file size
  estimateFileSize(duration: number, settings: ExportSettings): number {
    const videoBitrate = settings.bitrate * 1000000 // Convert to bps
    const audioBitrate = settings.audioBitrate * 1000 // Convert to bps
    const totalBitrate = videoBitrate + audioBitrate

    return (totalBitrate * duration) / 8 // Convert bits to bytes
  }

  cancelExport() {
    this.isProcessing = false
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.stop()
    }
    if (this.video.src) {
      this.video.pause()
      this.video.currentTime = 0
    }
    if (this.audioVideo.src) {
      this.audioVideo.pause()
      this.audioVideo.currentTime = 0
    }
  }

  cleanup() {
    if (this.video.src) {
      URL.revokeObjectURL(this.video.src)
    }
    if (this.audioVideo.src) {
      URL.revokeObjectURL(this.audioVideo.src)
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop()
    }
  }

  getOriginalDimensions(): { width: number; height: number; aspectRatio: number } | null {
    if (this.video.videoWidth && this.video.videoHeight) {
      return {
        width: this.video.videoWidth,
        height: this.video.videoHeight,
        aspectRatio: this.video.videoWidth / this.video.videoHeight,
      }
    }
    return null
  }
}
