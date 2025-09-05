"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EnhancementSettings } from "@/lib/video-enhancement"

interface VideoPreviewProps {
  videoUrl: string
  enhancementSettings?: EnhancementSettings
  showComparison?: boolean
  isProcessing?: boolean
  className?: string
}

export function VideoPreview({
  videoUrl,
  enhancementSettings,
  showComparison = false,
  isProcessing = false,
  className,
}: VideoPreviewProps) {
  const [originalIsPlaying, setOriginalIsPlaying] = useState(false)
  const [enhancedIsPlaying, setEnhancedIsPlaying] = useState(false)
  const [originalCurrentTime, setOriginalCurrentTime] = useState(0)
  const [enhancedCurrentTime, setEnhancedCurrentTime] = useState(0)
  const [originalDuration, setOriginalDuration] = useState(0)
  const [enhancedDuration, setEnhancedDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [videoDimensions, setVideoDimensions] = useState<{
    width: number
    height: number
    originalWidth: number
    originalHeight: number
    aspectRatio: number
  } | null>(null)

  const originalVideoRef = useRef<HTMLVideoElement>(null)
  const enhancedVideoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()

  const generateFilters = (settings?: EnhancementSettings): string => {
    if (!settings) return "none"

    const filters = [
      `brightness(${1 + settings.brightness / 100})`,
      `contrast(${1 + settings.contrast / 100})`,
      `saturate(${1 + settings.saturation / 100})`,
      `sepia(${settings.warmth / 100})`,
      `blur(${settings.fade > 0 ? settings.fade * 0.5 : 0}px)`,
    ]

    if (settings.cinematicMode) {
      filters.push(`hue-rotate(5deg)`)
      filters.push(`contrast(1.05)`)
    }

    return filters.join(" ")
  }

  const handleVideoLoaded = (video: HTMLVideoElement) => {
    setDuration(video.duration)

    const videoWidth = video.videoWidth
    const videoHeight = video.videoHeight

    if (videoWidth && videoHeight) {
      const aspectRatio = videoWidth / videoHeight
      const maxWidth = 400
      const maxHeight = 600

      let displayWidth = videoWidth
      let displayHeight = videoHeight

      // Calculate optimal display size while preserving exact aspect ratio
      if (videoWidth > maxWidth || videoHeight > maxHeight) {
        const widthRatio = maxWidth / videoWidth
        const heightRatio = maxHeight / videoHeight
        const scale = Math.min(widthRatio, heightRatio)

        displayWidth = Math.round(videoWidth * scale)
        displayHeight = Math.round(videoHeight * scale)

        // Ensure aspect ratio is perfectly maintained
        const calculatedAspectRatio = displayWidth / displayHeight
        if (Math.abs(calculatedAspectRatio - aspectRatio) > 0.001) {
          displayHeight = Math.round(displayWidth / aspectRatio)
        }
      }

      setVideoDimensions({
        width: displayWidth,
        height: displayHeight,
        originalWidth: videoWidth,
        originalHeight: videoHeight,
        aspectRatio: aspectRatio,
      })
    }
  }

  const syncVideos = (sourceVideo: HTMLVideoElement, targetVideo: HTMLVideoElement) => {
    if (Math.abs(sourceVideo.currentTime - targetVideo.currentTime) > 0.1) {
      targetVideo.currentTime = sourceVideo.currentTime
    }
  }

  const handleOriginalPlayPause = () => {
    if (originalVideoRef.current) {
      if (originalIsPlaying) {
        originalVideoRef.current.pause()
      } else {
        originalVideoRef.current.play()
      }
      setOriginalIsPlaying(!originalIsPlaying)
    }
  }

  const handleOriginalSeek = (newTime: number[]) => {
    const time = newTime[0]
    if (originalVideoRef.current) {
      originalVideoRef.current.currentTime = time
      setOriginalCurrentTime(time)
    }
  }

  const handleOriginalReset = () => {
    if (originalVideoRef.current) {
      originalVideoRef.current.currentTime = 0
      setOriginalCurrentTime(0)
      setOriginalIsPlaying(false)
    }
  }

  const handleEnhancedPlayPause = () => {
    if (enhancedVideoRef.current) {
      if (enhancedIsPlaying) {
        enhancedVideoRef.current.pause()
      } else {
        enhancedVideoRef.current.play()
      }
      setEnhancedIsPlaying(!enhancedIsPlaying)
    }
  }

  const handleEnhancedSeek = (newTime: number[]) => {
    const time = newTime[0]
    if (enhancedVideoRef.current) {
      enhancedVideoRef.current.currentTime = time
      setEnhancedCurrentTime(time)
    }
  }

  const handleEnhancedMute = () => {
    if (enhancedVideoRef.current) {
      enhancedVideoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleEnhancedReset = () => {
    if (enhancedVideoRef.current) {
      enhancedVideoRef.current.currentTime = 0
      setEnhancedCurrentTime(0)
      setEnhancedIsPlaying(false)
    }
  }

  const handlePlayPause = () => {
    const videos = [originalVideoRef.current, enhancedVideoRef.current].filter(Boolean)

    if (isPlaying) {
      videos.forEach((video) => video?.pause())
    } else {
      videos.forEach((video) => video?.play())
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (newTime: number[]) => {
    const time = newTime[0]
    const videos = [originalVideoRef.current, enhancedVideoRef.current].filter(Boolean)

    videos.forEach((video) => {
      if (video) {
        video.currentTime = time
      }
    })
    setCurrentTime(time)
  }

  const handleMute = () => {
    if (showComparison) {
      if (enhancedVideoRef.current) {
        enhancedVideoRef.current.muted = !isMuted
      }
      if (originalVideoRef.current) {
        originalVideoRef.current.muted = !isMuted
      }
    } else {
      const videos = [originalVideoRef.current, enhancedVideoRef.current].filter(Boolean)
      videos.forEach((video) => {
        if (video) {
          video.muted = !isMuted
        }
      })
    }
    setIsMuted(!isMuted)
  }

  const handleReset = () => {
    const videos = [originalVideoRef.current, enhancedVideoRef.current].filter(Boolean)
    videos.forEach((video) => {
      if (video) {
        video.currentTime = 0
      }
    })
    setCurrentTime(0)
    setIsPlaying(false)
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  const showControlsTemporarily = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const handleOriginalTimeUpdate = (video: HTMLVideoElement) => {
    setOriginalCurrentTime(video.currentTime)
  }

  const handleEnhancedTimeUpdate = (video: HTMLVideoElement) => {
    setEnhancedCurrentTime(video.currentTime)
  }

  const handleTimeUpdate = (video: HTMLVideoElement) => {
    setCurrentTime(video.currentTime)
    if (video === originalVideoRef.current && enhancedVideoRef.current) {
      syncVideos(originalVideoRef.current, enhancedVideoRef.current)
    } else if (video === enhancedVideoRef.current && originalVideoRef.current) {
      syncVideos(enhancedVideoRef.current, originalVideoRef.current)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn("relative bg-black rounded-lg overflow-hidden w-full", className)}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <div className={cn("relative w-full", showComparison ? "grid grid-cols-2 gap-1 h-full" : "w-full h-full")}>
        {showComparison && (
          <div className="relative w-full h-full">
            <video
              ref={originalVideoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              onLoadedMetadata={(e) => {
                handleVideoLoaded(e.currentTarget)
                setOriginalDuration(e.currentTarget.duration)
              }}
              onTimeUpdate={(e) => handleOriginalTimeUpdate(e.currentTarget)}
              muted={isMuted}
              playsInline
            />
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-xs">
                Original
              </Badge>
            </div>
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 transition-opacity duration-300",
                showControls ? "opacity-100" : "opacity-0",
              )}
            >
              <div className="mb-2">
                <Slider
                  value={[originalCurrentTime]}
                  max={originalDuration || 100}
                  step={0.1}
                  onValueChange={handleOriginalSeek}
                  className="w-full h-1"
                />
                <div className="flex justify-between text-xs text-white/70 mt-1">
                  <span>{formatTime(originalCurrentTime)}</span>
                  <span>{formatTime(originalDuration)}</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleOriginalPlayPause}
                  className="text-white hover:bg-white/20 h-6 w-6 p-0"
                >
                  {originalIsPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleOriginalReset}
                  className="text-white hover:bg-white/20 h-6 w-6 p-0"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleMute}
                  className="text-white hover:bg-white/20 h-6 w-6 p-0"
                >
                  {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="relative w-full h-full">
          <video
            ref={enhancedVideoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            style={{ filter: generateFilters(enhancementSettings) }}
            onLoadedMetadata={(e) => {
              if (!showComparison) handleVideoLoaded(e.currentTarget)
              setEnhancedDuration(e.currentTarget.duration)
            }}
            onTimeUpdate={(e) =>
              showComparison ? handleEnhancedTimeUpdate(e.currentTarget) : handleTimeUpdate(e.currentTarget)
            }
            muted={isMuted}
            playsInline
          />
          {showComparison && (
            <>
              <div className="absolute top-2 left-2">
                <Badge variant="default" className="text-xs">
                  Enhanced
                </Badge>
              </div>
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 transition-opacity duration-300",
                  showControls ? "opacity-100" : "opacity-0",
                )}
              >
                <div className="mb-2">
                  <Slider
                    value={[enhancedCurrentTime]}
                    max={enhancedDuration || 100}
                    step={0.1}
                    onValueChange={handleEnhancedSeek}
                    className="w-full h-1"
                  />
                  <div className="flex justify-between text-xs text-white/70 mt-1">
                    <span>{formatTime(enhancedCurrentTime)}</span>
                    <span>{formatTime(enhancedDuration)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleEnhancedPlayPause}
                    className="text-white hover:bg-white/20 h-6 w-6 p-0"
                  >
                    {enhancedIsPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleEnhancedReset}
                    className="text-white hover:bg-white/20 h-6 w-6 p-0"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleEnhancedMute}
                    className="text-white hover:bg-white/20 h-6 w-6 p-0"
                  >
                    {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {!showComparison && (
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0",
          )}
        >
          <div className="mb-3">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/70 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={handlePlayPause} className="text-white hover:bg-white/20">
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleReset} className="text-white hover:bg-white/20">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleMute} className="text-white hover:bg-white/20">
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function VideoPreviewCard({
  videoUrl,
  enhancementSettings,
  showComparison,
  isProcessing,
  onComparisonToggle,
}: {
  videoUrl: string
  enhancementSettings?: EnhancementSettings
  showComparison?: boolean
  isProcessing?: boolean
  onComparisonToggle?: () => void
}) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Video Preview</h3>
            <div className="flex gap-2">
              {onComparisonToggle && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onComparisonToggle}
                  className="text-xs bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white border-0"
                >
                  {showComparison ? "Single View" : "Compare"}
                </Button>
              )}
            </div>
          </div>
          <VideoPreview
            videoUrl={videoUrl}
            enhancementSettings={enhancementSettings}
            showComparison={showComparison}
            isProcessing={isProcessing}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  )
}
