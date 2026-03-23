---
name: video-gallery
description: "Build video gallery and player components for Next.js + shadcn/ui projects. YouTube, Vimeo, and self-hosted video embeds, lazy loading, lightbox playback, video grids, playlists, thumbnails, and responsive aspect ratios. Use when: user wants video embeds, video galleries, playlists, video players, or media libraries."
---

# Video Gallery Skill

Build video components for **Next.js + shadcn/ui + Tailwind CSS + TypeScript** projects.

All output MUST be:
- React functional components with TypeScript
- shadcn/ui styled with Tailwind
- Lazy-loaded for performance
- Accessible (keyboard nav, captions support)
- Responsive with proper aspect ratios

## 1. Lazy Video Embed

```tsx
"use client"
import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Play } from "lucide-react"
import { cn } from "@/lib/utils"

interface LazyVideoProps {
  src: string
  title: string
  thumbnail?: string
  provider?: "youtube" | "vimeo" | "self"
  className?: string
}

function getEmbedUrl(src: string, provider: string): string {
  if (provider === "youtube") {
    const id = src.match(/(?:youtu\.be\/|v=)([\w-]+)/)?.[1]
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
  }
  if (provider === "vimeo") {
    const id = src.match(/vimeo\.com\/(\d+)/)?.[1]
    return `https://player.vimeo.com/video/${id}?autoplay=1`
  }
  return src
}

function getThumbnail(src: string, provider: string): string {
  if (provider === "youtube") {
    const id = src.match(/(?:youtu\.be\/|v=)([\w-]+)/)?.[1]
    return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
  }
  return ""
}

export function LazyVideo({ src, title, thumbnail, provider = "youtube", className }: LazyVideoProps) {
  const [playing, setPlaying] = useState(false)
  const thumbSrc = thumbnail ?? getThumbnail(src, provider)

  return (
    <div className={cn("relative aspect-video overflow-hidden rounded-lg bg-muted", className)}>
      {playing ? (
        <iframe
          src={getEmbedUrl(src, provider)}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 flex items-center justify-center"
          aria-label={`Play ${title}`}
        >
          {thumbSrc && (
            <Image src={thumbSrc} alt={title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
          )}
          <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-primary/90 text-primary-foreground transition-transform group-hover:scale-110">
            <Play className="h-8 w-8 ml-1" />
          </div>
        </button>
      )}
    </div>
  )
}
```

## 2. Self-Hosted Video Player

```tsx
"use client"
import { useRef, useState } from "react"
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface VideoPlayerProps {
  src: string
  poster?: string
  className?: string
  captions?: { src: string; label: string; srclang: string }[]
}

export function VideoPlayer({ src, poster, className, captions }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)

  const toggle = () => {
    if (videoRef.current?.paused) { videoRef.current.play(); setPlaying(true) }
    else { videoRef.current?.pause(); setPlaying(false) }
  }

  const handleTimeUpdate = () => {
    const v = videoRef.current
    if (v) setProgress((v.currentTime / v.duration) * 100)
  }

  const seek = (value: number[]) => {
    const v = videoRef.current
    if (v) v.currentTime = (value[0] / 100) * v.duration
  }

  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement
    if (!document.fullscreenElement) { container?.requestFullscreen(); setFullscreen(true) }
    else { document.exitFullscreen(); setFullscreen(false) }
  }

  return (
    <div className={cn("group relative aspect-video overflow-hidden rounded-lg bg-black", className)}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        onTimeUpdate={handleTimeUpdate}
        onClick={toggle}
        className="h-full w-full"
        playsInline
        preload="metadata"
      >
        {captions?.map(cap => (
          <track key={cap.srclang} kind="subtitles" src={cap.src} label={cap.label} srcLang={cap.srclang} />
        ))}
      </video>
      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
        <Slider value={[progress]} onValueChange={seek} max={100} step={0.1} className="mb-3" />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle} className="text-white hover:text-white">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { if (videoRef.current) videoRef.current.muted = !muted; setMuted(!muted) }} className="text-white hover:text-white">
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:text-white">
            {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

## 3. Video Grid Gallery

```tsx
import { LazyVideo } from "@/components/video/lazy-video"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Video {
  id: string
  src: string
  title: string
  description?: string
  thumbnail?: string
  category: string
  duration?: string
  provider?: "youtube" | "vimeo" | "self"
}

interface VideoGalleryProps {
  videos: Video[]
  categories?: string[]
}

export function VideoGallery({ videos, categories }: VideoGalleryProps) {
  const cats = categories ?? [...new Set(videos.map(v => v.category))]

  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        {cats.map(cat => <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>)}
      </TabsList>
      <TabsContent value="all">
        <VideoGrid videos={videos} />
      </TabsContent>
      {cats.map(cat => (
        <TabsContent key={cat} value={cat}>
          <VideoGrid videos={videos.filter(v => v.category === cat)} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function VideoGrid({ videos }: { videos: Video[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
      {videos.map(video => (
        <div key={video.id} className="space-y-3">
          <LazyVideo src={video.src} title={video.title} thumbnail={video.thumbnail} provider={video.provider} />
          <div>
            <h3 className="font-semibold">{video.title}</h3>
            {video.description && <p className="text-sm text-muted-foreground mt-1">{video.description}</p>}
            {video.duration && <span className="text-xs text-muted-foreground">{video.duration}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
```

## 4. Video Lightbox Modal

```tsx
"use client"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

interface VideoLightboxProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  src: string
  title: string
  provider?: "youtube" | "vimeo" | "self"
}

export function VideoLightbox({ open, onOpenChange, src, title, provider = "youtube" }: VideoLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="aspect-video">
          {open && (
            <iframe
              src={getEmbedUrl(src, provider)}
              title={title}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="h-full w-full border-0"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

## 5. Playlist Component

```tsx
"use client"
import { useState } from "react"
import { LazyVideo } from "@/components/video/lazy-video"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface PlaylistVideo { id: string; src: string; title: string; thumbnail?: string; duration?: string }

export function VideoPlaylist({ videos }: { videos: PlaylistVideo[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = videos[activeIndex]

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_350px]">
      <LazyVideo src={active.src} title={active.title} thumbnail={active.thumbnail} />
      <ScrollArea className="h-[400px] lg:h-auto">
        <div className="space-y-2">
          {videos.map((video, i) => (
            <button
              key={video.id}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent",
                i === activeIndex && "bg-accent"
              )}
            >
              <span className="text-xs text-muted-foreground w-6">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{video.title}</p>
                {video.duration && <p className="text-xs text-muted-foreground">{video.duration}</p>}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
```

## 6. Autoplay on Scroll (IntersectionObserver)

```tsx
"use client"
import { useRef, useEffect } from "react"

export function AutoplayVideo({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const observer = new IntersectionObserver(
      ([entry]) => { entry.isIntersecting ? video.play() : video.pause() },
      { threshold: 0.5 }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return <video ref={videoRef} src={src} muted loop playsInline className={className} preload="metadata" />
}
```

## 7. Video Schema (SEO)

```tsx
const videoSchema = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: video.title,
  description: video.description,
  thumbnailUrl: video.thumbnail,
  uploadDate: video.uploadDate,
  duration: video.isoDuration, // "PT5M30S"
  contentUrl: video.src,
  embedUrl: getEmbedUrl(video.src, video.provider),
}
```

## Performance Rules

1. Never autoplay with sound — always `muted` for autoplay
2. Use `youtube-nocookie.com` for YouTube embeds (GDPR)
3. Lazy-load all videos below the fold — show thumbnail + play button
4. Use `preload="metadata"` for self-hosted (not `preload="auto"`)
5. Provide poster/thumbnail to prevent CLS
6. Use `loading="lazy"` on iframes when not using click-to-play
7. WebM + MP4 sources for self-hosted (WebM is smaller)

**Version:** 1.0.0
**Last Updated:** 2026-03-17
