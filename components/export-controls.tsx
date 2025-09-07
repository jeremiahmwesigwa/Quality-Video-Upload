"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Smartphone, Instagram, MessageCircle, Zap } from "lucide-react"
import { VideoExportEngine, PLATFORM_PRESETS, type ExportSettings, type ExportProgress } from "@/lib/video-export"
import type { EnhancementSettings } from "@/lib/video-enhancement"

interface ExportControlsProps {
  videoUrl: string
  enhancementSettings: EnhancementSettings
  videoDuration?: number
  onExportComplete: (exportedBlob: Blob, filename: string) => void
}

export function ExportControls({
  videoUrl,
  enhancementSettings,
  videoDuration = 0,
  onExportComplete,
}: ExportControlsProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<keyof typeof PLATFORM_PRESETS>("tiktok")
  const [exportSettings, setExportSettings] = useState<ExportSettings>(PLATFORM_PRESETS.tiktok)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)
  const [exportEngine] = useState(() => new VideoExportEngine())

  const handlePlatformChange = (platform: keyof typeof PLATFORM_PRESETS) => {
    setSelectedPlatform(platform)
    setExportSettings(PLATFORM_PRESETS[platform])
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportProgress({
      stage: "analyzing",
      progress: 0,
      message: "Starting export...",
    })

    try {
      const originalDimensions = exportEngine.getOriginalDimensions()
      if (originalDimensions) {
        const exportAspectRatio = exportSettings.resolution.width / exportSettings.resolution.height

        // Log dimension preservation info for user feedback
        console.log(
          `[v0] Original video: ${originalDimensions.width}x${originalDimensions.height} (${originalDimensions.aspectRatio.toFixed(3)})`,
        )
        console.log(
          `[v0] Export target: ${exportSettings.resolution.width}x${exportSettings.resolution.height} (${exportAspectRatio.toFixed(3)})`,
        )

        if (Math.abs(originalDimensions.aspectRatio - exportAspectRatio) > 0.1) {
          setExportProgress({
            stage: "processing",
            progress: 5,
            message: "Preserving original aspect ratio with letterboxing...",
          })
        }
      }

      const exportedBlob = await exportEngine.exportVideo(videoUrl, enhancementSettings, exportSettings, (progress) =>
        setExportProgress(progress),
      )

      const filename = exportEngine.generateFilename(`video_${Date.now()}`, selectedPlatform, exportSettings)

      onExportComplete(exportedBlob, filename)
    } catch (error) {
      console.error("Export failed:", error)
      setExportProgress({
        stage: "error",
        progress: 0,
        message: `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleCancelExport = () => {
    exportEngine.cancelExport()
    setIsExporting(false)
    setExportProgress(null)
  }

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const estimatedSize = exportEngine.estimateFileSize(videoDuration, exportSettings)

  const platformIcons = {
    tiktok: Smartphone,
    instagram: Instagram,
    whatsapp: MessageCircle,
    custom: Settings,
  }

  const PlatformIcon = platformIcons[selectedPlatform]

  return (
    <div className="space-y-4">
      {/* Platform Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <PlatformIcon className="h-4 w-4" />
            Export Platform
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedPlatform} onValueChange={handlePlatformChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tiktok">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <div>
                    <div className="font-medium">TikTok</div>
                    <div className="text-xs text-muted-foreground">1080×1920, 30fps, 12 Mbps</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="instagram">
                <div className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Instagram Reels</div>
                    <div className="text-xs text-muted-foreground">1080×1920, 30fps, 10 Mbps</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="whatsapp">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <div>
                    <div className="font-medium">WhatsApp Status</div>
                    <div className="text-xs text-muted-foreground">720×1280, 30fps, 8 Mbps</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="custom">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Custom</div>
                    <div className="text-xs text-muted-foreground">1080×1920, 30fps, 12 Mbps</div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Export Settings Preview */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Export Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="font-medium text-foreground">Resolution</div>
              <div className="text-muted-foreground">
                {exportSettings.resolution.width} × {exportSettings.resolution.height}
              </div>
            </div>
            <div>
              <div className="font-medium text-foreground">Frame Rate</div>
              <div className="text-muted-foreground">{exportSettings.frameRate} fps</div>
            </div>
            <div>
              <div className="font-medium text-foreground">Bitrate</div>
              <div className="text-muted-foreground">{exportSettings.bitrate} Mbps</div>
            </div>
            <div>
              <div className="font-medium text-foreground">Format</div>
              <div className="text-muted-foreground">
                {exportSettings.codec.toUpperCase()} (.{exportSettings.format})
              </div>
            </div>
            <div>
              <div className="font-medium text-foreground">Audio</div>
              <div className="text-muted-foreground">
                {exportSettings.audioCodec.toUpperCase()}, {exportSettings.audioBitrate} kbps
              </div>
            </div>
            <div>
              <div className="font-medium text-foreground">Est. Size</div>
              <div className="text-muted-foreground">{formatFileSize(estimatedSize)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Progress */}
      {isExporting && exportProgress && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  <span className="font-medium text-sm">
                    {exportProgress.stage === "analyzing" && "Analyzing Video"}
                    {exportProgress.stage === "processing" && "Processing"}
                    {exportProgress.stage === "encoding" && "Encoding"}
                    {exportProgress.stage === "finalizing" && "Finalizing"}
                    {exportProgress.stage === "complete" && "Complete"}
                    {exportProgress.stage === "error" && "Error"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{Math.round(exportProgress.progress)}%</Badge>
                  {exportProgress.stage !== "complete" && exportProgress.stage !== "error" && (
                    <Button variant="outline" size="sm" onClick={handleCancelExport}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              <Progress value={exportProgress.progress} className="h-2" />

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{exportProgress.message}</span>
                {exportProgress.timeRemaining && <span>~{formatTime(exportProgress.timeRemaining)} remaining</span>}
              </div>

              {exportProgress.stage === "encoding" && (
                <div className="text-xs text-muted-foreground">
                  {exportProgress.currentFrame && exportProgress.totalFrames
                    ? `Frame ${exportProgress.currentFrame} of ${exportProgress.totalFrames}`
                    : "Processing video in real-time for optimal quality"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Button */}
      <Button onClick={handleExport} disabled={isExporting} className="w-full flex items-center gap-2" size="lg">
        {isExporting ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            Exporting...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Export Enhanced Video
          </>
        )}
      </Button>

      {/* Platform Optimization Info */}
      <Card className="bg-accent/5 border-accent/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <PlatformIcon className="h-4 w-4 text-accent mt-0.5" />
            <div className="text-xs">
              <div className="font-medium text-accent mb-1">
                Optimized for {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}
              </div>
              <div className="text-muted-foreground">
                {selectedPlatform === "tiktok" && "Perfect for TikTok uploads with maximum quality retention"}
                {selectedPlatform === "instagram" && "Optimized for Instagram Reels and Stories"}
                {selectedPlatform === "whatsapp" && "Compressed for WhatsApp Status with good quality"}
                {selectedPlatform === "custom" && "High-quality export for general use"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
