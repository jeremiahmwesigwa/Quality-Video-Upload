// Video Enhancement Engine
// Handles automatic video adjustments and cinematic grading

export interface EnhancementSettings {
  brightness: number
  contrast: number
  saturation: number
  vibrance: number
  clarity: number
  sharpness: number
  highlights: number
  shadows: number
  warmth: number
  fade: number
  gamma: number // Added gamma setting for presets
  cinematicMode: boolean
}

export interface VideoAnalysis {
  averageBrightness: number
  contrastLevel: number
  colorTemperature: number
  noiseLevel: number
  dominantColors: string[]
}

export class VideoEnhancementEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private video: HTMLVideoElement

  constructor() {
    this.canvas = document.createElement("canvas")
    this.ctx = this.canvas.getContext("2d")!
    this.video = document.createElement("video")
  }

  // Analyze video to determine adaptive adjustments
  async analyzeVideo(videoUrl: string): Promise<VideoAnalysis> {
    return new Promise((resolve, reject) => {
      this.video.src = videoUrl
      this.video.crossOrigin = "anonymous"

      this.video.onloadeddata = () => {
        this.canvas.width = this.video.videoWidth
        this.canvas.height = this.video.videoHeight

        // Sample frames at different timestamps for analysis
        const sampleTimes = [0.1, 0.3, 0.5, 0.7, 0.9]
        let samplesAnalyzed = 0
        let totalBrightness = 0
        let totalContrast = 0
        const colorSamples: number[][] = []

        const analyzeSample = (time: number) => {
          this.video.currentTime = time * this.video.duration

          this.video.onseeked = () => {
            this.ctx.drawImage(this.video, 0, 0)
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
            const analysis = this.analyzeFrame(imageData)

            totalBrightness += analysis.brightness
            totalContrast += analysis.contrast
            colorSamples.push(analysis.colors)

            samplesAnalyzed++

            if (samplesAnalyzed === sampleTimes.length) {
              const avgBrightness = totalBrightness / samplesAnalyzed
              const avgContrast = totalContrast / samplesAnalyzed
              const dominantColors = this.findDominantColors(colorSamples)

              resolve({
                averageBrightness: avgBrightness,
                contrastLevel: avgContrast,
                colorTemperature: this.estimateColorTemperature(colorSamples),
                noiseLevel: this.estimateNoiseLevel(imageData),
                dominantColors,
              })
            } else if (samplesAnalyzed < sampleTimes.length) {
              analyzeSample(sampleTimes[samplesAnalyzed])
            }
          }
        }

        analyzeSample(sampleTimes[0])
      }

      this.video.onerror = () => reject(new Error("Failed to analyze video"))
    })
  }

  private analyzeFrame(imageData: ImageData): { brightness: number; contrast: number; colors: number[] } {
    const data = imageData.data
    let totalBrightness = 0
    const brightnesses: number[] = []
    const colorHistogram = new Array(256).fill(0)

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      // Calculate brightness using luminance formula
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b
      totalBrightness += brightness
      brightnesses.push(brightness)
      colorHistogram[Math.floor(brightness)]++
    }

    const avgBrightness = totalBrightness / (data.length / 4)

    // Calculate contrast as standard deviation of brightness
    const variance = brightnesses.reduce((sum, b) => sum + Math.pow(b - avgBrightness, 2), 0) / brightnesses.length
    const contrast = Math.sqrt(variance)

    return {
      brightness: avgBrightness / 255, // Normalize to 0-1
      contrast: contrast / 255,
      colors: colorHistogram,
    }
  }

  private findDominantColors(colorSamples: number[][]): string[] {
    // Simplified dominant color detection
    const combinedHistogram = new Array(256).fill(0)

    colorSamples.forEach((sample) => {
      sample.forEach((count, index) => {
        combinedHistogram[index] += count
      })
    })

    // Find peaks in histogram
    const peaks: Array<{ index: number; count: number }> = []
    for (let i = 1; i < combinedHistogram.length - 1; i++) {
      if (
        combinedHistogram[i] > combinedHistogram[i - 1] &&
        combinedHistogram[i] > combinedHistogram[i + 1] &&
        combinedHistogram[i] > 1000
      ) {
        peaks.push({ index: i, count: combinedHistogram[i] })
      }
    }

    return peaks
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((peak) => `hsl(${peak.index}, 50%, 50%)`)
  }

  private estimateColorTemperature(colorSamples: number[][]): number {
    // Simplified color temperature estimation
    // Returns value between 0 (cool) and 1 (warm)
    return 0.5 // Placeholder - would need more complex analysis
  }

  private estimateNoiseLevel(imageData: ImageData): number {
    // Simplified noise detection using high-frequency content
    const data = imageData.data
    let noiseSum = 0
    let count = 0

    for (let i = 0; i < data.length - 8; i += 4) {
      const current = data[i] + data[i + 1] + data[i + 2]
      const next = data[i + 4] + data[i + 5] + data[i + 6]
      noiseSum += Math.abs(current - next)
      count++
    }

    return noiseSum / count / (255 * 3) // Normalize
  }

  // Generate adaptive enhancement settings based on video analysis
  generateEnhancementSettings(analysis: VideoAnalysis): EnhancementSettings {
    const settings: EnhancementSettings = {
      brightness: 5, // +0.05 exposure
      contrast: 10,
      saturation: 6, // Keep low to avoid neon look
      vibrance: 8,
      clarity: 5,
      sharpness: 10,
      highlights: -5,
      shadows: 4,
      warmth: 1,
      fade: 0,
      gamma: 0.92, // Slightly darker, cinematic depth
      cinematicMode: false,
    }

    // Adaptive contrast based on scene analysis
    if (analysis.contrastLevel < 0.3) {
      settings.contrast = 12 // Low contrast scene, boost more
    } else if (analysis.contrastLevel > 0.7) {
      settings.contrast = 8 // High contrast scene, boost less
    }

    // Adaptive sharpness based on noise level
    if (analysis.noiseLevel > 0.3) {
      settings.sharpness = 10 // Noisy video, less sharpening
    } else if (analysis.noiseLevel < 0.1) {
      settings.sharpness = 15 // Clean video, more sharpening
    }

    // Adjust brightness based on average scene brightness
    if (analysis.averageBrightness < 0.3) {
      settings.brightness = 8 // Dark scene, boost more
      settings.shadows = 8 // Lift shadows more
    } else if (analysis.averageBrightness > 0.7) {
      settings.brightness = 3 // Bright scene, boost less
      settings.highlights = -8 // Pull down highlights more
    }

    return settings
  }

  // Generate CSS filters for real-time preview
  generateCSSFilters(settings: EnhancementSettings): string {
    const filters = [
      `brightness(${1 + settings.brightness / 100})`,
      `contrast(${1 + settings.contrast / 100})`,
      `saturate(${1 + settings.saturation / 100})`,
      `sepia(${settings.warmth / 100})`,
      `blur(${settings.fade > 0 ? settings.fade * 0.5 : 0}px)`,
      `gamma(${settings.gamma})`, // Added gamma filter
    ]

    if (settings.cinematicMode) {
      // Add cinematic effects
      filters.push(`hue-rotate(5deg)`) // Slight color shift
      filters.push(`contrast(1.05)`) // Additional midtone contrast
    }

    return filters.join(" ")
  }

  // Generate cinematic LUT-style adjustments
  generateCinematicSettings(): Partial<EnhancementSettings> {
    return {
      brightness: 5, // +0.05 exposure
      contrast: 10,
      saturation: 6, // Keep low to avoid neon look
      vibrance: 8,
      clarity: 5,
      sharpness: 10,
      highlights: -5,
      shadows: 4,
      warmth: 1,
      gamma: 0.92, // Slightly darker, cinematic depth
      fade: 0, // Will add vignette separately
    }
  }

  getVibrantSettings(): Partial<EnhancementSettings> {
    return {
      brightness: 10, // +0.1 exposure
      contrast: 12,
      saturation: 12,
      vibrance: 10,
      clarity: 6,
      sharpness: 12,
      highlights: -4,
      shadows: 6,
      warmth: 3,
      gamma: 0.95, // Slight depth
    }
  }

  getNaturalSettings(): Partial<EnhancementSettings> {
    return {
      brightness: 5, // +0.05 exposure
      contrast: 8,
      saturation: 8,
      vibrance: 6,
      clarity: 4,
      sharpness: 10,
      highlights: -3,
      shadows: 4,
      warmth: 2,
      gamma: 1.0, // Neutral
    }
  }

  // Apply enhancements to video (placeholder for actual video processing)
  async processVideo(
    videoUrl: string,
    settings: EnhancementSettings,
    onProgress?: (progress: number) => void,
  ): Promise<Blob> {
    // This would integrate with FFmpeg.js or similar for actual video processing
    // For now, return a placeholder

    return new Promise((resolve) => {
      // Simulate processing time
      let progress = 0
      const interval = setInterval(() => {
        progress += 10
        onProgress?.(progress)

        if (progress >= 100) {
          clearInterval(interval)
          // In real implementation, this would return the processed video blob
          resolve(new Blob(["processed video"], { type: "video/mp4" }))
        }
      }, 200)
    })
  }

  cleanup() {
    if (this.video.src) {
      URL.revokeObjectURL(this.video.src)
    }
  }
}

// Utility functions for enhancement presets
export const ENHANCEMENT_PRESETS = {
  auto: {
    name: "Auto Enhancement",
    description: "Automatic adjustments based on video analysis",
  },
  cinematic: {
    name: "Cinematic",
    description: "Teal & Orange grading with film-like contrast",
  },
  vibrant: {
    name: "Vibrant",
    description: "Boosted colors and contrast for social media",
  },
  natural: {
    name: "Natural",
    description: "Subtle enhancements that preserve original look",
  },
} as const

export type EnhancementPreset = keyof typeof ENHANCEMENT_PRESETS
