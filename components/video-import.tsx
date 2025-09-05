"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, FileVideo, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface VideoFile {
  file: File
  url: string
  duration?: number
  dimensions?: { width: number; height: number }
  isValid: boolean
  error?: string
}

interface VideoImportProps {
  onVideoSelect: (videoFile: VideoFile) => void
  isProcessing?: boolean
}

const SUPPORTED_FORMATS = ["video/mp4", "video/mov", "video/avi", "video/quicktime"]
const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
const MAX_DURATION = 300 // 5 minutes in seconds

export function VideoImport({ onVideoSelect, isProcessing = false }: VideoImportProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateVideo = useCallback(async (file: File): Promise<VideoFile> => {
    const videoFile: VideoFile = {
      file,
      url: URL.createObjectURL(file),
      isValid: false,
    }

    // Check file type
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      videoFile.error = `Unsupported format. Please use MP4, MOV, or AVI files.`
      return videoFile
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      videoFile.error = `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
      return videoFile
    }

    // Validate video properties
    return new Promise((resolve) => {
      const video = document.createElement("video")
      video.preload = "metadata"

      video.onloadedmetadata = () => {
        videoFile.duration = video.duration
        videoFile.dimensions = {
          width: video.videoWidth,
          height: video.videoHeight,
        }

        // Check duration
        if (video.duration > MAX_DURATION) {
          videoFile.error = `Video too long. Maximum duration is ${MAX_DURATION / 60} minutes.`
          resolve(videoFile)
          return
        }

        // Check if video has valid dimensions
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          videoFile.error = "Invalid video file or corrupted."
          resolve(videoFile)
          return
        }

        videoFile.isValid = true
        resolve(videoFile)
      }

      video.onerror = () => {
        videoFile.error = "Unable to read video file. File may be corrupted."
        resolve(videoFile)
      }

      video.src = videoFile.url
    })
  }, [])

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      const file = files[0]
      setIsValidating(true)
      setValidationError(null)

      try {
        const videoFile = await validateVideo(file)

        if (!videoFile.isValid) {
          setValidationError(videoFile.error || "Invalid video file")
          URL.revokeObjectURL(videoFile.url)
        } else {
          onVideoSelect(videoFile)
        }
      } catch (error) {
        setValidationError("Error processing video file")
      } finally {
        setIsValidating(false)
      }
    },
    [validateVideo, onVideoSelect],
  )

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files)
  }

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      setIsDragOver(false)
      handleFileSelect(event.dataTransfer.files)
    },
    [handleFileSelect],
  )

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/mov,video/avi,video/quicktime"
        onChange={handleInputChange}
        className="hidden"
        disabled={isProcessing || isValidating}
      />

      <Card
        className={cn(
          "border-2 border-dashed transition-all duration-200 cursor-pointer",
          isDragOver && "border-primary bg-primary/5",
          !isDragOver && "border-border hover:border-primary/50",
          (isProcessing || isValidating) && "opacity-50 cursor-not-allowed",
        )}
        onClick={!isProcessing && !isValidating ? handleImportClick : undefined}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-12 text-center">
          <div className="space-y-4">
            {isValidating ? (
              <>
                <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                <h3 className="text-lg font-semibold text-foreground">Validating Video...</h3>
                <p className="text-muted-foreground">Checking file format and properties</p>
              </>
            ) : (
              <>
                <div
                  className={cn(
                    "transition-colors duration-200",
                    isDragOver ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {isDragOver ? <FileVideo className="h-12 w-12 mx-auto" /> : <Upload className="h-12 w-12 mx-auto" />}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {isDragOver ? "Drop your video here" : "Import Your Video"}
                  </h3>
                  <p className="text-muted-foreground mb-4">Drag and drop or click to select</p>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge variant="outline">MP4</Badge>
                    <Badge variant="outline">MOV</Badge>
                    <Badge variant="outline">AVI</Badge>
                    <Badge variant="outline">HEVC</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Max {MAX_FILE_SIZE / (1024 * 1024)}MB • Up to {MAX_DURATION / 60} minutes
                  </p>
                </div>

                {!isDragOver && <Button disabled={isProcessing || isValidating}>Choose File</Button>}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {validationError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Upload Error</span>
            </div>
            <p className="text-sm text-destructive/80 mt-1">{validationError}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function VideoFileInfo({ videoFile }: { videoFile: VideoFile }) {
  return (
    <Card className="bg-card/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <FileVideo className="h-4 w-4" />
              {videoFile.file.name}
            </h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{formatFileSize(videoFile.file.size)}</span>
              {videoFile.duration && <span>{formatDuration(videoFile.duration)}</span>}
              {videoFile.dimensions && (
                <span>
                  {videoFile.dimensions.width} × {videoFile.dimensions.height}
                </span>
              )}
            </div>
          </div>
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Valid
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function formatFileSize(bytes: number) {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}
