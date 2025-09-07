"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Sparkles, Zap, Eye, Palette, Settings, User } from "lucide-react"
import {
  VideoEnhancementEngine,
  type EnhancementSettings,
  type VideoAnalysis,
  ENHANCEMENT_PRESETS,
  type EnhancementPreset,
} from "@/lib/video-enhancement"

interface EnhancementControlsProps {
  videoUrl: string
  onSettingsChange: (settings: EnhancementSettings) => void
  onProcessingStart: () => void
  onProcessingComplete: (processedVideoUrl: string) => void
}

export function EnhancementControls({
  videoUrl,
  onSettingsChange,
  onProcessingStart,
  onProcessingComplete,
}: EnhancementControlsProps) {
  const [engine] = useState(() => new VideoEnhancementEngine())
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null)
  const [settings, setSettings] = useState<EnhancementSettings | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState<EnhancementPreset>("auto")
  const [showManualControls, setShowManualControls] = useState(false)
  const [showSkinRetouch, setShowSkinRetouch] = useState(false)
  const [skinRetouchSettings, setSkinRetouchSettings] = useState({
    enabled: true,
    smoothness: 30, // 20-40 range, default 30
    texturePreserve: 60, // 40-70 range, default 60
    blemishRemoval: 20, // 10-30 range, default 20
    shineReduction: 25, // 15-35 range, default 25
    toneEvenness: 15, // 10-25 range, default 15
    eyeLipProtection: 85, // 70-95 range, default 85
    detailRecovery: 40, // Keep existing
    grain: 10, // 6-16 range, default 10
    amount: 60, // 45-75 range, default 60
  })

  useEffect(() => {
    if (videoUrl) {
      analyzeVideo()
    }

    return () => {
      engine.cleanup()
    }
  }, [videoUrl])

  const analyzeVideo = async () => {
    setIsAnalyzing(true)
    try {
      const videoAnalysis = await engine.analyzeVideo(videoUrl)
      setAnalysis(videoAnalysis)

      const enhancementSettings = engine.generateEnhancementSettings(videoAnalysis)
      setSettings(enhancementSettings)
      onSettingsChange(enhancementSettings)
    } catch (error) {
      console.error("Failed to analyze video:", error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const applyPreset = (preset: EnhancementPreset) => {
    if (!analysis || !settings) return

    setSelectedPreset(preset)
    let newSettings = { ...settings }

    switch (preset) {
      case "cinematic":
        const cinematicAdjustments = engine.generateCinematicSettings()
        newSettings = { ...newSettings, ...cinematicAdjustments, cinematicMode: true }
        break
      case "vibrant":
        const vibrantAdjustments = engine.getVibrantSettings()
        newSettings = { ...newSettings, ...vibrantAdjustments, cinematicMode: false }
        break
      case "natural":
        const naturalAdjustments = engine.getNaturalSettings()
        newSettings = { ...newSettings, ...naturalAdjustments, cinematicMode: false }
        break
      case "auto":
      default:
        newSettings = engine.generateEnhancementSettings(analysis)
        break
    }

    setSettings(newSettings)
    onSettingsChange(newSettings)
  }

  const updateManualSetting = (key: keyof EnhancementSettings, value: number) => {
    if (!settings) return

    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    onSettingsChange(newSettings)
  }

  const updateSkinRetouchSetting = (key: keyof typeof skinRetouchSettings, value: number) => {
    const newSettings = { ...skinRetouchSettings, [key]: value }
    setSkinRetouchSettings(newSettings)
    // You can add logic here to apply skin retouch settings to the video processing
  }

  const processVideo = async () => {
    if (!settings) return

    setIsProcessing(true)
    setProcessingProgress(0)
    onProcessingStart()

    try {
      const processedBlob = await engine.processVideo(videoUrl, settings, (progress) => setProcessingProgress(progress))

      const processedUrl = URL.createObjectURL(processedBlob)
      onProcessingComplete(processedUrl)
    } catch (error) {
      console.error("Failed to process video:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  if (isAnalyzing) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <div>
              <h3 className="font-semibold text-foreground">Analyzing Video</h3>
              <p className="text-sm text-muted-foreground">Detecting optimal enhancement settings...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analysis || !settings) {
    return null
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Video Analysis Results */}
      <Card className="bg-card/50">
        <CardHeader className="pb-2 md:pb-3">
          <CardTitle className="text-xs md:text-sm flex items-center gap-2">
            <Eye className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            Video Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 md:p-6 pt-0">
          <div className="grid grid-cols-2 gap-3 md:gap-3 text-xs">
            <div>
              <div className="font-medium text-foreground text-balance">Brightness</div>
              <div className="text-muted-foreground">{(analysis.averageBrightness * 100).toFixed(0)}%</div>
            </div>
            <div>
              <div className="font-medium text-foreground text-balance">Contrast</div>
              <div className="text-muted-foreground">{(analysis.contrastLevel * 100).toFixed(0)}%</div>
            </div>
            <div>
              <div className="font-medium text-foreground text-balance">Noise Level</div>
              <div className="text-muted-foreground">
                {analysis.noiseLevel < 0.2 ? "Low" : analysis.noiseLevel < 0.5 ? "Medium" : "High"}
              </div>
            </div>
            <div>
              <div className="font-medium text-foreground text-balance">Color Temp</div>
              <div className="text-muted-foreground">
                {analysis.colorTemperature > 0.6 ? "Warm" : analysis.colorTemperature < 0.4 ? "Cool" : "Neutral"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhancement Presets */}
      <Card>
        <CardHeader className="pb-2 md:pb-3">
          <CardTitle className="text-xs md:text-sm flex items-center gap-2">
            <Palette className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            Enhancement Presets
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(ENHANCEMENT_PRESETS).map(([key, preset]) => (
              <Button
                key={key}
                variant={selectedPreset === key ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset(key as EnhancementPreset)}
                className="text-xs h-auto py-2 px-2 md:px-3"
              >
                <div className="text-left w-full">
                  <div className="font-medium text-balance">{preset.name}</div>
                  <div className="text-xs opacity-70 text-pretty">{preset.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manual Controls Section */}
      <Card>
        <CardHeader className="pb-2 md:pb-3">
          <CardTitle className="text-xs md:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="text-balance">Manual Controls</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowManualControls(!showManualControls)}
              className="text-xs h-6 px-2"
            >
              {showManualControls ? "Hide" : "Show"}
            </Button>
          </CardTitle>
        </CardHeader>
        {showManualControls && settings && (
          <CardContent className="space-y-3 p-3 md:p-6 pt-0">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-balance">Brightness</label>
                  <span className="text-xs text-muted-foreground">+{settings.brightness}</span>
                </div>
                <Slider
                  value={[settings.brightness]}
                  onValueChange={([value]) => updateManualSetting("brightness", value)}
                  max={100}
                  min={-100}
                  step={1}
                  className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent [&_[role=slider]]:to-primary [&_.slider-track]:bg-gradient-to-r [&_.slider-track]:from-accent [&_.slider-track]:to-primary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-balance">Sharpness</label>
                  <span className="text-xs text-muted-foreground">+{settings.sharpness}</span>
                </div>
                <Slider
                  value={[settings.sharpness]}
                  onValueChange={([value]) => updateManualSetting("sharpness", value)}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent [&_[role=slider]]:to-primary [&_.slider-track]:bg-gradient-to-r [&_.slider-track]:from-accent [&_.slider-track]:to-primary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-balance">Contrast</label>
                  <span className="text-xs text-muted-foreground">+{settings.contrast}</span>
                </div>
                <Slider
                  value={[settings.contrast]}
                  onValueChange={([value]) => updateManualSetting("contrast", value)}
                  max={100}
                  min={-100}
                  step={1}
                  className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent [&_[role=slider]]:to-primary [&_.slider-track]:bg-gradient-to-r [&_.slider-track]:from-accent [&_.slider-track]:to-primary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-balance">Saturation</label>
                  <span className="text-xs text-muted-foreground">+{settings.saturation}</span>
                </div>
                <Slider
                  value={[settings.saturation]}
                  onValueChange={([value]) => updateManualSetting("saturation", value)}
                  max={100}
                  min={-100}
                  step={1}
                  className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent [&_[role=slider]]:to-primary [&_.slider-track]:bg-gradient-to-r [&_.slider-track]:from-accent [&_.slider-track]:to-primary"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Skin Retouch Section */}
      <Card>
        <CardHeader className="pb-2 md:pb-3">
          <CardTitle className="text-xs md:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="text-balance">Skin Retouch</span>
              <Badge variant="outline" className="text-xs border-accent text-accent">
                Face-Aware
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSkinRetouch(!showSkinRetouch)}
              className="text-xs h-6 px-2"
            >
              {showSkinRetouch ? "Hide" : "Show"}
            </Button>
          </CardTitle>
        </CardHeader>
        {showSkinRetouch && (
          <CardContent className="space-y-3 p-3 md:p-6 pt-0">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-balance">Smoothness</label>
                  <span className="text-xs text-muted-foreground">{skinRetouchSettings.smoothness}</span>
                </div>
                <Slider
                  value={[skinRetouchSettings.smoothness]}
                  onValueChange={([value]) => updateSkinRetouchSetting("smoothness", value)}
                  max={40}
                  min={20}
                  step={1}
                  className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent [&_[role=slider]]:to-primary [&_.slider-track]:bg-gradient-to-r [&_.slider-track]:from-accent [&_.slider-track]:to-primary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-balance">Texture Preserve</label>
                  <span className="text-xs text-muted-foreground">{skinRetouchSettings.texturePreserve}</span>
                </div>
                <Slider
                  value={[skinRetouchSettings.texturePreserve]}
                  onValueChange={([value]) => updateSkinRetouchSetting("texturePreserve", value)}
                  max={70}
                  min={40}
                  step={1}
                  className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent [&_[role=slider]]:to-primary [&_.slider-track]:bg-gradient-to-r [&_.slider-track]:from-accent [&_.slider-track]:to-primary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-balance">Blemish Removal</label>
                  <span className="text-xs text-muted-foreground">{skinRetouchSettings.blemishRemoval}</span>
                </div>
                <Slider
                  value={[skinRetouchSettings.blemishRemoval]}
                  onValueChange={([value]) => updateSkinRetouchSetting("blemishRemoval", value)}
                  max={30}
                  min={10}
                  step={1}
                  className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent [&_[role=slider]]:to-primary [&_.slider-track]:bg-gradient-to-r [&_.slider-track]:from-accent [&_.slider-track]:to-primary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-balance">Shine Reduction</label>
                  <span className="text-xs text-muted-foreground">{skinRetouchSettings.shineReduction}</span>
                </div>
                <Slider
                  value={[skinRetouchSettings.shineReduction]}
                  onValueChange={([value]) => updateSkinRetouchSetting("shineReduction", value)}
                  max={35}
                  min={15}
                  step={1}
                  className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent [&_[role=slider]]:to-primary [&_.slider-track]:bg-gradient-to-r [&_.slider-track]:from-accent [&_.slider-track]:to-primary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-balance">Skin Tone Evenness</label>
                  <span className="text-xs text-muted-foreground">{skinRetouchSettings.toneEvenness}</span>
                </div>
                <Slider
                  value={[skinRetouchSettings.toneEvenness]}
                  onValueChange={([value]) => updateSkinRetouchSetting("toneEvenness", value)}
                  max={25}
                  min={10}
                  step={1}
                  className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent [&_[role=slider]]:to-primary [&_.slider-track]:bg-gradient-to-r [&_.slider-track]:from-accent [&_.slider-track]:to-primary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-balance">Eye & Lip Protection</label>
                  <span className="text-xs text-muted-foreground">{skinRetouchSettings.eyeLipProtection}</span>
                </div>
                <Slider
                  value={[skinRetouchSettings.eyeLipProtection]}
                  onValueChange={([value]) => updateSkinRetouchSetting("eyeLipProtection", value)}
                  max={95}
                  min={70}
                  step={1}
                  className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent [&_[role=slider]]:to-primary [&_.slider-track]:bg-gradient-to-r [&_.slider-track]:from-accent [&_.slider-track]:to-primary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-balance">Detail Recovery</label>
                  <span className="text-xs text-muted-foreground">{skinRetouchSettings.detailRecovery}</span>
                </div>
                <Slider
                  value={[skinRetouchSettings.detailRecovery]}
                  onValueChange={([value]) => updateSkinRetouchSetting("detailRecovery", value)}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent [&_[role=slider]]:to-primary [&_.slider-track]:bg-gradient-to-r [&_.slider-track]:from-accent [&_.slider-track]:to-primary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-balance">Amount (Global Mix)</label>
                  <span className="text-xs text-muted-foreground">{skinRetouchSettings.amount}</span>
                </div>
                <Slider
                  value={[skinRetouchSettings.amount]}
                  onValueChange={([value]) => updateSkinRetouchSetting("amount", value)}
                  max={75}
                  min={45}
                  step={1}
                  className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent [&_[role=slider]]:to-primary [&_.slider-track]:bg-gradient-to-r [&_.slider-track]:from-accent [&_.slider-track]:to-primary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-balance">Grain (Anti-Plastic)</label>
                  <span className="text-xs text-muted-foreground">{skinRetouchSettings.grain}</span>
                </div>
                <Slider
                  value={[skinRetouchSettings.grain]}
                  onValueChange={([value]) => updateSkinRetouchSetting("grain", value)}
                  max={16}
                  min={6}
                  step={1}
                  className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent [&_[role=slider]]:to-primary [&_.slider-track]:bg-gradient-to-r [&_.slider-track]:from-accent [&_.slider-track]:to-primary"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Face Detection Status</span>
                <Badge variant="outline" className="border-primary text-primary">
                  2 faces detected
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-pretty">
                Face-aware skin smoothing with temporal consistency and anti-plastic safeguards
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Current Enhancement Settings */}
      <Card className="bg-card/50">
        <CardHeader className="pb-2 md:pb-3">
          <CardTitle className="text-xs md:text-sm flex items-center gap-2">
            <Sparkles className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            Applied Enhancements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3 md:p-6 pt-0">
          <div className="grid grid-cols-2 gap-1 md:gap-2 text-xs">
            <div className="text-balance">Brightness: +{settings.brightness}</div>
            <div className="text-balance">Contrast: +{settings.contrast}</div>
            <div className="text-balance">Saturation: +{settings.saturation}</div>
            <div className="text-balance">Vibrance: +{settings.vibrance}</div>
            <div className="text-balance">Clarity: +{settings.clarity}</div>
            <div className="text-balance">Sharpness: +{settings.sharpness}</div>
            <div className="text-balance">Highlights: {settings.highlights}</div>
            <div className="text-balance">Shadows: +{settings.shadows}</div>
          </div>
          {settings.cinematicMode && (
            <div className="pt-2 border-t border-border">
              <Badge variant="outline" className="border-accent text-accent text-xs">
                <span className="text-balance">Cinematic Mode Active</span>
              </Badge>
              <div className="text-xs text-muted-foreground mt-1 text-pretty">
                Teal & Orange LUT, Enhanced Midtones, Film Vignette
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Controls */}
      <Card>
        <CardContent className="p-3 md:p-4">
          {isProcessing ? (
            <div className="space-y-2 md:space-y-3">
              <div className="flex items-center justify-between text-xs md:text-sm">
                <span className="font-medium text-balance">Processing Video...</span>
                <span>{processingProgress}%</span>
              </div>
              <Progress value={processingProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center text-pretty">
                Applying enhancements and optimizing for social media
              </p>
            </div>
          ) : (
            <Button onClick={processVideo} className="w-full flex items-center gap-2 text-xs md:text-sm h-8 md:h-10">
              <Zap className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="text-balance">Apply Enhancements</span>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
