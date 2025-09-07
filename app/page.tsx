"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, Sparkles, Eye, CheckCircle2, Upload, Play, Settings } from "lucide-react"
import { VideoImport, VideoFileInfo } from "@/components/video-import"
import { VideoPreviewCard } from "@/components/video-preview"
import { EnhancementControls } from "@/components/enhancement-controls"
import { ExportControls } from "@/components/export-controls"
import { ThemeToggle } from "@/components/theme-toggle"
import type { EnhancementSettings } from "@/lib/video-enhancement"
import cn from "classnames"

interface VideoFile {
  file: File
  url: string
  duration?: number
  dimensions?: { width: number; height: number }
  isValid: boolean
  error?: string
}

export default function QualityUploadPage() {
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isEnhanced, setIsEnhanced] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [enhancementSettings, setEnhancementSettings] = useState<EnhancementSettings | null>(null)
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null)
  const [exportedVideo, setExportedVideo] = useState<{ blob: Blob; filename: string } | null>(null)

  const handleVideoSelect = (videoFile: VideoFile) => {
    setSelectedVideo(videoFile)
    setIsEnhanced(false)
    setProcessedVideoUrl(null)
    setExportedVideo(null)
  }

  const handleSettingsChange = (settings: EnhancementSettings) => {
    setEnhancementSettings(settings)
    setIsEnhanced(true)
  }

  const handleProcessingStart = () => {
    setIsProcessing(true)
  }

  const handleProcessingComplete = (processedUrl: string) => {
    setProcessedVideoUrl(processedUrl)
    setIsProcessing(false)
  }

  const handleExportComplete = (exportedBlob: Blob, filename: string) => {
    setExportedVideo({ blob: exportedBlob, filename })
  }

  const handleDownload = () => {
    if (exportedVideo) {
      const link = document.createElement("a")
      link.href = URL.createObjectURL(exportedVideo.blob)
      link.download = exportedVideo.filename
      link.click()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-4 md:pb-8 px-4 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 -mx-4 md:mx-0">
          <Card className="bg-gradient-to-br from-accent to-primary backdrop-blur-sm border-0 md:border border-primary/50 rounded-none md:rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                {/* Top row with avatar, title and theme toggle */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-blue-400 shadow-lg flex-shrink-0">
                      <img src="/images/avatar.png" alt="Quality Video Upload" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight">
                        Quality Video Upload
                      </h2>
                    </div>
                  </div>
                  <ThemeToggle />
                </div>

                {/* Subtitle */}
                <p className="text-foreground text-xs sm:text-sm md:text-base leading-relaxed font-bold">
                  On TikTok, WhatsApp Status, Instagram, YouTube and Facebook
                </p>

                {/* Full-width buttons with gap in middle */}
                <div className="flex gap-3 w-full">
                  <Button
                    asChild
                    className="flex-1 bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white border-0 rounded-xl px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium"
                  >
                    <a href="https://t.me/ITSupportUg" target="_blank" rel="noopener noreferrer">
                      Download the App
                    </a>
                  </Button>
                  <Button
                    asChild
                    className="flex-1 bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white border-0 rounded-xl px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium"
                  >
                    <a href="https://wa.me/256704475160" target="_blank" rel="noopener noreferrer">
                      By Jeremiah Mwesigwa
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 -mx-4 md:mx-0">
          <Card className="bg-card/80 backdrop-blur-sm shadow-xl border-0 md:border border-border/50 rounded-none md:rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Upload className="h-4 w-4 text-primary" />
                </div>
                Enhancement Studio
              </CardTitle>
              <CardDescription className="mt-2">
                Import and enhance your videos with professional-grade adjustments
              </CardDescription>
            </div>
            <CardContent className="p-6">
              {!selectedVideo ? (
                <VideoImport onVideoSelect={handleVideoSelect} isProcessing={isProcessing} />
              ) : (
                <div className="space-y-4">
                  <VideoFileInfo videoFile={selectedVideo} />
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedVideo(null)
                      setIsEnhanced(false)
                      setProcessedVideoUrl(null)
                      setExportedVideo(null)
                    }}
                    className="w-full rounded-xl bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white border-0"
                  >
                    Upload Another Video
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedVideo && (
            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0 md:border border-border/50 rounded-none md:rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-primary/20 rounded-lg flex items-center justify-center">
                        <Play className="h-3 w-3 text-primary" />
                      </div>
                      <span className="font-medium text-sm">Status</span>
                    </div>
                    <div className="space-y-2">
                      <Badge
                        variant={isEnhanced ? "default" : "secondary"}
                        className={cn("rounded-lg", isEnhanced && "bg-gradient-to-r from-accent to-primary text-white")}
                      >
                        {isProcessing ? "Processing..." : isEnhanced ? "Enhanced" : "Original"}
                      </Badge>
                      {enhancementSettings?.cinematicMode && (
                        <Badge
                          variant="outline"
                          className="border-accent text-accent rounded-lg bg-gradient-to-r from-accent/10 to-primary/10"
                        >
                          Cinematic
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0 md:border border-border/50 rounded-none md:rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-accent/20 rounded-lg flex items-center justify-center">
                        <Settings className="h-3 w-3 text-accent" />
                      </div>
                      <span className="font-medium text-sm">Info</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span>{selectedVideo.duration ? `${Math.round(selectedVideo.duration)}s` : "Unknown"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Size:</span>
                        <span>{(selectedVideo.file.size / (1024 * 1024)).toFixed(1)} MB</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-card/80 backdrop-blur-sm shadow-xl border-0 md:border border-border/50 rounded-none md:rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  <VideoPreviewCard
                    videoUrl={selectedVideo.url}
                    enhancementSettings={enhancementSettings || undefined}
                    showComparison={showComparison}
                    isProcessing={isProcessing}
                    onComparisonToggle={() => setShowComparison(!showComparison)}
                  />
                </CardContent>
              </Card>

              <Card className="bg-card/80 backdrop-blur-sm shadow-xl border-0 md:border border-border/50 rounded-none md:rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  <EnhancementControls
                    videoUrl={selectedVideo.url}
                    onSettingsChange={handleSettingsChange}
                    onProcessingStart={handleProcessingStart}
                    onProcessingComplete={handleProcessingComplete}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {selectedVideo && (
          <div className="mt-6 space-y-6 -mx-4 md:mx-0">
            {isEnhanced && enhancementSettings && (
              <Card className="bg-card/80 backdrop-blur-sm shadow-xl border-0 md:border border-border/50 rounded-none md:rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  <ExportControls
                    videoUrl={selectedVideo.url}
                    enhancementSettings={enhancementSettings}
                    videoDuration={selectedVideo.duration}
                    onExportComplete={handleExportComplete}
                  />
                </CardContent>
              </Card>
            )}

            {exportedVideo && (
              <Card className="bg-gradient-to-r from-primary/10 to-accent/10 backdrop-blur-sm shadow-xl border-primary/30 rounded-none md:rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-semibold text-lg">Export Complete!</span>
                  </div>
                  <Button
                    onClick={handleDownload}
                    className="w-full flex items-center gap-3 rounded-xl h-12 text-base font-medium bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white"
                  >
                    <Download className="h-5 w-5" />
                    Download Enhanced Video
                  </Button>
                  <p className="text-sm text-muted-foreground mt-3 text-center break-all">{exportedVideo.filename}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="mt-12 grid md:grid-cols-3 gap-6 -mx-4 md:mx-0">
          <Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0 md:border border-border/50 rounded-none md:rounded-2xl overflow-hidden group hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="font-semibold">Auto Enhancement</span>
              </div>
              <p className="text-sm text-muted-foreground">Professional adjustments applied instantly upon import</p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0 md:border border-border/50 rounded-none md:rounded-2xl overflow-hidden group hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent/70 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                <span className="font-semibold">Real-time Preview</span>
              </div>
              <p className="text-sm text-muted-foreground">See before and after comparisons with smooth playback</p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0 md:border border-border/50 rounded-none md:rounded-2xl overflow-hidden group hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Download className="h-5 w-5 text-white" />
                </div>
                <span className="font-semibold">Social Ready</span>
              </div>
              <p className="text-sm text-muted-foreground">Optimized for TikTok, Instagram, and WhatsApp uploads</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
