'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type SceneRecordingMode = 'idle' | 'recording' | 'review' | 'exporting'
type SceneRecorderQualityId = 'web' | 'standard' | 'high' | 'archive'
type SceneRecorderSizePresetId = 'source' | 'wide1080' | 'square1080' | 'vertical1080' | 'custom'
type SceneRecorderFitMode = 'crop' | 'contain'

type RecorderSize = {
  width: number
  height: number
}

type ExportedClip = {
  id: string
  url: string
  name: string
  size: number
}

type EncodeSegmentOptions = {
  sourceUrl: string
  mimeType: string
  start: number
  end: number
  outputSize: RecorderSize
  fitMode: SceneRecorderFitMode
  bitrate: number
  progressStart: number
  progressSpan: number
  onProgress: (progress: number) => void
}

const SCENE_RECORDER_QUALITIES: Record<SceneRecorderQualityId, { label: string; bitrate: number }> = {
  web: { label: 'Web', bitrate: 4_000_000 },
  standard: { label: 'Standard', bitrate: 9_000_000 },
  high: { label: 'High', bitrate: 18_000_000 },
  archive: { label: 'Archive', bitrate: 30_000_000 },
}

const SCENE_RECORDER_SIZE_PRESETS: readonly {
  id: SceneRecorderSizePresetId
  label: string
  width?: number
  height?: number
}[] = [
  { id: 'source', label: 'Source' },
  { id: 'wide1080', label: '16:9', width: 1920, height: 1080 },
  { id: 'square1080', label: '1:1', width: 1080, height: 1080 },
  { id: 'vertical1080', label: '9:16', width: 1080, height: 1920 },
  { id: 'custom', label: 'Custom' },
]

const SCENE_RECORDER_MIME_TYPES = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'] as const
const SCENE_RECORDER_CAPTURE_FPS = 60
const SCENE_RECORDER_MIN_DIMENSION = 160
const SCENE_RECORDER_MAX_DIMENSION = 3840
const SCENE_RECORDER_MAX_SIZE_MIN_MB = 1
const SCENE_RECORDER_MAX_SIZE_MAX_MB = 500
const SCENE_RECORDER_SPLIT_MIN_SECONDS = 0.45
const SCENE_RECORDER_MAX_SEGMENTS = 80
const SCENE_CANVAS_ROOTS = ['.homeStage', '.control-room', '.destinationStage', '.vacuumLab', '.experimentLab', '.liquidLab'] as const
const SCENE_CANVAS_ROOT_SELECTOR = SCENE_CANVAS_ROOTS.join(', ')
const SCENE_CANVAS_SELECTOR = `${SCENE_CANVAS_ROOTS.map((selector) => `${selector} canvas`).join(', ')}, canvas`

function getSupportedRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  return SCENE_RECORDER_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

function formatRecordingTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds)
  const wholeSeconds = Math.floor(safeSeconds)
  const minutes = Math.floor(wholeSeconds / 60)
  const remainder = wholeSeconds % 60
  const tenths = Math.floor((safeSeconds - wholeSeconds) * 10)
  return `${minutes}:${String(remainder).padStart(2, '0')}.${tenths}`
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`
}

function clampRecordingNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function clampRecordingDimension(value: number) {
  return Math.round(clampRecordingNumber(Number.isFinite(value) ? value : 1080, SCENE_RECORDER_MIN_DIMENSION, SCENE_RECORDER_MAX_DIMENSION))
}

function clampMaxFileSizeMb(value: number) {
  return Math.round(clampRecordingNumber(Number.isFinite(value) ? value : 24, SCENE_RECORDER_MAX_SIZE_MIN_MB, SCENE_RECORDER_MAX_SIZE_MAX_MB))
}

function getRecordingExtension(mimeType: string) {
  return mimeType.includes('mp4') ? 'mp4' : 'webm'
}

function waitForVideoEvent(video: HTMLVideoElement, eventName: keyof HTMLMediaElementEventMap) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(eventName, handleEvent)
      video.removeEventListener('error', handleError)
    }
    const handleEvent = () => {
      cleanup()
      resolve()
    }
    const handleError = () => {
      cleanup()
      reject(new Error('The clip could not be read by the browser.'))
    }
    video.addEventListener(eventName, handleEvent, { once: true })
    video.addEventListener('error', handleError, { once: true })
  })
}

function requestMediaStreamFrame(stream: MediaStream | null) {
  const [videoTrack] = stream?.getVideoTracks() ?? []
  ;(videoTrack as (MediaStreamTrack & { requestFrame?: () => void }) | undefined)?.requestFrame?.()
}

function getVisibleSceneCanvas() {
  const canvases = Array.from(document.querySelectorAll<HTMLCanvasElement>(SCENE_CANVAS_SELECTOR))
  return (
    canvases
      .map((canvas) => ({ canvas, rect: canvas.getBoundingClientRect() }))
      .filter(({ canvas, rect }) => {
        const style = window.getComputedStyle(canvas)
        return (
          canvas.width > 0 &&
          canvas.height > 0 &&
          rect.width > 8 &&
          rect.height > 8 &&
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0'
        )
      })
      .sort((a, b) => {
        const rootPriority = Number(Boolean(b.canvas.closest(SCENE_CANVAS_ROOT_SELECTOR))) - Number(Boolean(a.canvas.closest(SCENE_CANVAS_ROOT_SELECTOR)))
        if (rootPriority !== 0) return rootPriority
        return b.rect.width * b.rect.height - a.rect.width * a.rect.height
      })[0]?.canvas ?? null
  )
}

function drawCoverImage(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  context: CanvasRenderingContext2D,
  outputWidth: number,
  outputHeight: number,
  fitMode: SceneRecorderFitMode,
) {
  context.fillStyle = '#15101f'
  context.fillRect(0, 0, outputWidth, outputHeight)

  if (fitMode === 'contain') {
    const scale = Math.min(outputWidth / sourceWidth, outputHeight / sourceHeight)
    const drawWidth = sourceWidth * scale
    const drawHeight = sourceHeight * scale
    context.drawImage(source, (outputWidth - drawWidth) * 0.5, (outputHeight - drawHeight) * 0.5, drawWidth, drawHeight)
    return
  }

  const sourceRatio = sourceWidth / sourceHeight
  const outputRatio = outputWidth / outputHeight
  let sx = 0
  let sy = 0
  let sw = sourceWidth
  let sh = sourceHeight

  if (sourceRatio > outputRatio) {
    sw = sourceHeight * outputRatio
    sx = (sourceWidth - sw) * 0.5
  } else {
    sh = sourceWidth / outputRatio
    sy = (sourceHeight - sh) * 0.5
  }

  context.drawImage(source, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight)
}

function drawVideoToExportCanvas(video: HTMLVideoElement, canvas: HTMLCanvasElement, fitMode: SceneRecorderFitMode) {
  const context = canvas.getContext('2d')
  if (!context) return

  const sourceWidth = video.videoWidth || canvas.width
  const sourceHeight = video.videoHeight || canvas.height
  drawCoverImage(video, sourceWidth, sourceHeight, context, canvas.width, canvas.height, fitMode)
}

async function encodeVideoSegment({
  sourceUrl,
  mimeType,
  start,
  end,
  outputSize,
  fitMode,
  bitrate,
  progressStart,
  progressSpan,
  onProgress,
}: EncodeSegmentOptions) {
  const video = document.createElement('video')
  video.src = sourceUrl
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'

  if (video.readyState < 1) await waitForVideoEvent(video, 'loadedmetadata')

  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = outputSize.width
  exportCanvas.height = outputSize.height
  const exportStream = exportCanvas.captureStream(SCENE_RECORDER_CAPTURE_FPS)
  const exportRecorder = new MediaRecorder(exportStream, {
    mimeType,
    videoBitsPerSecond: bitrate,
  })
  const exportChunks: Blob[] = []
  let animationFrame = 0
  let finished = false

  return new Promise<Blob>((resolve, reject) => {
    const finish = () => {
      if (finished) return
      finished = true
      window.cancelAnimationFrame(animationFrame)
      video.pause()
      exportStream.getTracks().forEach((track) => track.stop())
      if (exportRecorder.state !== 'inactive') exportRecorder.stop()
    }

    exportRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) exportChunks.push(event.data)
    }
    exportRecorder.onerror = () => {
      finish()
      reject(new Error('The export failed.'))
    }
    exportRecorder.onstop = () => {
      resolve(new Blob(exportChunks, { type: exportRecorder.mimeType || mimeType }))
    }

    const drawFrame = () => {
      drawVideoToExportCanvas(video, exportCanvas, fitMode)
      requestMediaStreamFrame(exportStream)
      const localProgress = clampRecordingNumber((video.currentTime - start) / Math.max(0.1, end - start), 0, 1)
      onProgress(progressStart + localProgress * progressSpan)
      if (video.currentTime >= end || video.ended) {
        finish()
        return
      }
      animationFrame = window.requestAnimationFrame(drawFrame)
    }

    const seekAndStart = async () => {
      try {
        if (Math.abs(video.currentTime - start) > 0.01) {
          video.currentTime = start
          await waitForVideoEvent(video, 'seeked')
        }
        drawVideoToExportCanvas(video, exportCanvas, fitMode)
        exportRecorder.start(250)
        await video.play()
        animationFrame = window.requestAnimationFrame(drawFrame)
      } catch (playbackError) {
        finish()
        reject(playbackError instanceof Error ? playbackError : new Error('The export could not play the clip.'))
      }
    }

    void seekAndStart()
  })
}

export function SceneRecorderControls() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingStreamRef = useRef<MediaStream | null>(null)
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const recordingFrameRef = useRef(0)
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const sourceStreamRef = useRef<MediaStream | null>(null)
  const sourceVideoRef = useRef<HTMLVideoElement | null>(null)
  const hasCapturedSceneFrameRef = useRef(false)
  const chunksRef = useRef<Blob[]>([])
  const recordingStartedAtRef = useRef(0)
  const sourceUrlRef = useRef('')
  const exportedClipsRef = useRef<ExportedClip[]>([])
  const [mode, setMode] = useState<SceneRecordingMode>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [exportedClips, setExportedClips] = useState<ExportedClip[]>([])
  const [sourceDuration, setSourceDuration] = useState(0)
  const [sourceDimensions, setSourceDimensions] = useState<RecorderSize>({ width: 1280, height: 720 })
  const [quality, setQuality] = useState<SceneRecorderQualityId>('high')
  const [sizePreset, setSizePreset] = useState<SceneRecorderSizePresetId>('source')
  const [customSize, setCustomSize] = useState<RecorderSize>({ width: 1080, height: 1080 })
  const [fitMode, setFitMode] = useState<SceneRecorderFitMode>('crop')
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(24)
  const [splitToMaxSize, setSplitToMaxSize] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [error, setError] = useState('')

  const outputSize = useMemo<RecorderSize>(() => {
    const preset = SCENE_RECORDER_SIZE_PRESETS.find((option) => option.id === sizePreset)
    const size =
      sizePreset === 'custom'
        ? customSize
        : preset?.width && preset.height
          ? { width: preset.width, height: preset.height }
          : sourceDimensions
    return {
      width: Math.max(2, Math.round(clampRecordingDimension(size.width) / 2) * 2),
      height: Math.max(2, Math.round(clampRecordingDimension(size.height) / 2) * 2),
    }
  }, [customSize, sizePreset, sourceDimensions])

  const clearExportedClips = useCallback(() => {
    exportedClipsRef.current.forEach((clip) => URL.revokeObjectURL(clip.url))
    exportedClipsRef.current = []
    setExportedClips([])
  }, [])

  const clearSourceClip = useCallback(() => {
    if (sourceUrlRef.current) {
      URL.revokeObjectURL(sourceUrlRef.current)
      sourceUrlRef.current = ''
    }
    setSourceUrl('')
  }, [])

  const stopCaptureFramePump = useCallback(() => {
    window.cancelAnimationFrame(recordingFrameRef.current)
    recordingFrameRef.current = 0
  }, [])

  const stopSourceCanvasStream = useCallback(() => {
    const sourceVideo = sourceVideoRef.current
    sourceVideo?.pause()
    if (sourceVideo) sourceVideo.srcObject = null
    sourceStreamRef.current?.getTracks().forEach((track) => track.stop())
    sourceCanvasRef.current = null
    sourceStreamRef.current = null
    sourceVideoRef.current = null
  }, [])

  const attachSourceCanvasStream = useCallback(
    (sceneCanvas: HTMLCanvasElement) => {
      if (sourceCanvasRef.current === sceneCanvas && sourceVideoRef.current) return sourceVideoRef.current

      stopSourceCanvasStream()

      try {
        const stream = sceneCanvas.captureStream(SCENE_RECORDER_CAPTURE_FPS)
        const video = document.createElement('video')
        video.muted = true
        video.playsInline = true
        video.autoplay = true
        video.srcObject = stream
        sourceCanvasRef.current = sceneCanvas
        sourceStreamRef.current = stream
        sourceVideoRef.current = video
        void video.play().catch(() => undefined)
        return video
      } catch {
        return null
      }
    },
    [stopSourceCanvasStream],
  )

  const pumpCaptureFrame = useCallback(() => {
    const recordingCanvas = recordingCanvasRef.current
    const context = recordingCanvas?.getContext('2d')
    if (!recordingCanvas || !context) return

    const sceneCanvas = getVisibleSceneCanvas()
    let drewSceneFrame = false

    if (sceneCanvas) {
      const sceneVideo = attachSourceCanvasStream(sceneCanvas)
      requestMediaStreamFrame(sourceStreamRef.current)

      if (sceneVideo && sceneVideo.readyState >= sceneVideo.HAVE_CURRENT_DATA && sceneVideo.videoWidth > 0 && sceneVideo.videoHeight > 0) {
        try {
          drawCoverImage(sceneVideo, sceneVideo.videoWidth, sceneVideo.videoHeight, context, recordingCanvas.width, recordingCanvas.height, 'crop')
          drewSceneFrame = true
          hasCapturedSceneFrameRef.current = true
        } catch {
          drewSceneFrame = false
        }
      }
    } else if (sourceCanvasRef.current) {
      stopSourceCanvasStream()
    }

    if (!drewSceneFrame && !hasCapturedSceneFrameRef.current) {
      context.fillStyle = '#15101f'
      context.fillRect(0, 0, recordingCanvas.width, recordingCanvas.height)
    }

    requestMediaStreamFrame(recordingStreamRef.current)
    recordingFrameRef.current = window.requestAnimationFrame(pumpCaptureFrame)
  }, [attachSourceCanvasStream, stopSourceCanvasStream])

  useEffect(() => {
    if (mode !== 'recording') return undefined

    const interval = window.setInterval(() => {
      setElapsed((performance.now() - recordingStartedAtRef.current) / 1000)
    }, 80)

    return () => window.clearInterval(interval)
  }, [mode])

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null
        recorder.stop()
      }
      stopCaptureFramePump()
      stopSourceCanvasStream()
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current)
      exportedClipsRef.current.forEach((clip) => URL.revokeObjectURL(clip.url))
    }
  }, [stopCaptureFramePump, stopSourceCanvasStream])

  const resetClip = useCallback(() => {
    clearSourceClip()
    clearExportedClips()
    setRecordedBlob(null)
    setElapsed(0)
    setSourceDuration(0)
    setTrimStart(0)
    setTrimEnd(0)
    setExportProgress(0)
    setError('')
    setMode('idle')
  }, [clearExportedClips, clearSourceClip])

  const startRecording = useCallback(() => {
    setError('')
    clearSourceClip()
    clearExportedClips()
    stopSourceCanvasStream()
    hasCapturedSceneFrameRef.current = false

    if (typeof MediaRecorder === 'undefined') {
      setError('Recording is not available in this browser.')
      return
    }

    const sceneCanvas = getVisibleSceneCanvas()
    if (!sceneCanvas) {
      setError('No scene canvas is ready yet.')
      return
    }

    const mimeType = getSupportedRecorderMimeType()
    if (!mimeType) {
      setError('This browser cannot export a WebM recording.')
      return
    }

    const recordingCanvas = document.createElement('canvas')
    recordingCanvas.width = Math.max(2, Math.round((sceneCanvas.width || 1280) / 2) * 2)
    recordingCanvas.height = Math.max(2, Math.round((sceneCanvas.height || 720) / 2) * 2)
    recordingCanvasRef.current = recordingCanvas
    const context = recordingCanvas.getContext('2d')
    if (context) {
      try {
        drawCoverImage(sceneCanvas, sceneCanvas.width, sceneCanvas.height, context, recordingCanvas.width, recordingCanvas.height, 'crop')
        hasCapturedSceneFrameRef.current = true
      } catch {
        context.fillStyle = '#15101f'
        context.fillRect(0, 0, recordingCanvas.width, recordingCanvas.height)
      }
    }

    try {
      const stream = recordingCanvas.captureStream(SCENE_RECORDER_CAPTURE_FPS)
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: SCENE_RECORDER_QUALITIES.archive.bitrate,
      })
      chunksRef.current = []
      recordingStreamRef.current = stream
      mediaRecorderRef.current = recorder
      setRecordedBlob(null)
      setElapsed(0)
      setExportProgress(0)
      setSourceDimensions({ width: recordingCanvas.width, height: recordingCanvas.height })

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onerror = () => {
        setError('Recording stopped unexpectedly.')
      }
      recorder.onstop = () => {
        stopCaptureFramePump()
        stopSourceCanvasStream()
        stream.getTracks().forEach((track) => track.stop())
        recordingStreamRef.current = null
        mediaRecorderRef.current = null
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType })
        chunksRef.current = []
        if (blob.size <= 0) {
          setError('The recording was empty. Try again after the scene is visible.')
          setMode('idle')
          return
        }
        const nextSourceUrl = URL.createObjectURL(blob)
        sourceUrlRef.current = nextSourceUrl
        setSourceUrl(nextSourceUrl)
        setRecordedBlob(blob)
        setMode('review')
      }

      recordingStartedAtRef.current = performance.now()
      recorder.start(250)
      recordingFrameRef.current = window.requestAnimationFrame(pumpCaptureFrame)
      setMode('recording')
    } catch {
      stopCaptureFramePump()
      stopSourceCanvasStream()
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
      recordingStreamRef.current = null
      mediaRecorderRef.current = null
      setError('The recording could not be started.')
      setMode('idle')
    }
  }, [clearExportedClips, clearSourceClip, pumpCaptureFrame, stopCaptureFramePump, stopSourceCanvasStream])

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    setElapsed((performance.now() - recordingStartedAtRef.current) / 1000)
    recorder.stop()
  }, [])

  function handlePreviewMetadata(event: { currentTarget: HTMLVideoElement }) {
    const video = event.currentTarget
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : elapsed
    const width = video.videoWidth || sourceDimensions.width
    const height = video.videoHeight || sourceDimensions.height
    setSourceDuration(duration)
    setSourceDimensions({ width, height })
    setTrimStart(0)
    setTrimEnd(duration)
  }

  function updateTrimStart(value: number) {
    const maxStart = Math.max(0, (trimEnd || sourceDuration) - 0.1)
    setTrimStart(clampRecordingNumber(value, 0, maxStart))
  }

  function updateTrimEnd(value: number) {
    const minEnd = Math.min(sourceDuration, trimStart + 0.1)
    setTrimEnd(clampRecordingNumber(value, minEnd, sourceDuration))
  }

  async function exportClip() {
    if (!sourceUrl || !recordedBlob) return

    const mimeType = getSupportedRecorderMimeType()
    if (!mimeType) {
      setError('This browser cannot export a WebM recording.')
      return
    }

    setMode('exporting')
    setError('')
    setExportProgress(0)
    clearExportedClips()

    try {
      const metadataVideo = document.createElement('video')
      metadataVideo.src = sourceUrl
      metadataVideo.muted = true
      metadataVideo.playsInline = true
      metadataVideo.preload = 'auto'
      if (metadataVideo.readyState < 1) await waitForVideoEvent(metadataVideo, 'loadedmetadata')
      const duration = Number.isFinite(metadataVideo.duration) && metadataVideo.duration > 0 ? metadataVideo.duration : sourceDuration || elapsed
      if (!duration || duration <= 0) throw new Error('Missing duration')

      const safeStart = clampRecordingNumber(trimStart, 0, Math.max(0, duration - 0.1))
      const safeEnd = clampRecordingNumber(trimEnd || duration, safeStart + 0.1, duration)
      const bitrate = SCENE_RECORDER_QUALITIES[quality].bitrate
      const extension = getRecordingExtension(mimeType)
      const maxBytes = maxFileSizeMb * 1024 * 1024
      const exported: ExportedClip[] = []
      const queue = [{ start: safeStart, end: safeEnd }]
      let encodedCount = 0
      let segmentIndex = 1

      while (queue.length > 0) {
        if (segmentIndex > SCENE_RECORDER_MAX_SEGMENTS) {
          throw new Error('Too many segments. Raise the max file size or trim the clip.')
        }

        const segment = queue.shift()
        if (!segment) break
        const remainingSegments = queue.length + 1
        const progressStart = encodedCount / Math.max(encodedCount + remainingSegments, 1)
        const progressSpan = 1 / Math.max(encodedCount + remainingSegments, 1)
        const blob = await encodeVideoSegment({
          sourceUrl,
          mimeType,
          start: segment.start,
          end: segment.end,
          outputSize,
          fitMode,
          bitrate,
          progressStart,
          progressSpan,
          onProgress: setExportProgress,
        })

        if (splitToMaxSize && blob.size > maxBytes && segment.end - segment.start > SCENE_RECORDER_SPLIT_MIN_SECONDS) {
          const midpoint = (segment.start + segment.end) * 0.5
          queue.unshift({ start: midpoint, end: segment.end })
          queue.unshift({ start: segment.start, end: midpoint })
          continue
        }

        if (splitToMaxSize && blob.size > maxBytes) {
          throw new Error('A segment is still over the max size. Raise the max size or use lower quality.')
        }

        const url = URL.createObjectURL(blob)
        exported.push({
          id: `segment-${segmentIndex}`,
          url,
          name:
            splitToMaxSize && (queue.length > 0 || segmentIndex > 1)
              ? `pogo-scene-${outputSize.width}x${outputSize.height}-part-${String(segmentIndex).padStart(2, '0')}.${extension}`
              : `pogo-scene-${outputSize.width}x${outputSize.height}.${extension}`,
          size: blob.size,
        })
        segmentIndex += 1
        encodedCount += 1
      }

      exportedClipsRef.current = exported
      setExportedClips(exported)
      setExportProgress(1)
      setMode('review')
    } catch (exportError) {
      setError(exportError instanceof Error ? `Export failed: ${exportError.message}` : 'The clip could not be exported.')
      setMode('review')
    }
  }

  if (mode === 'idle') {
    return (
      <div className="homeRecorderDock">
        <button type="button" className="homeRecorderButton" onClick={startRecording} aria-label="Start recording">
          <span className="homeRecorderButtonIcon" aria-hidden="true" />
          <span>REC</span>
        </button>
        {error ? <span className="homeRecorderError">{error}</span> : null}
      </div>
    )
  }

  if (mode === 'recording') {
    return (
      <div className="homeRecorderDock isRecording">
        <div className="homeRecorderLivePill" aria-live="polite">
          <span className="homeRecorderButtonIcon" aria-hidden="true" />
          <span>{formatRecordingTime(elapsed)}</span>
        </div>
        <button type="button" className="homeRecorderStopButton" onClick={stopRecording}>
          Stop
        </button>
      </div>
    )
  }

  return (
    <section className="homeRecorderExportPanel" aria-label="Recording export">
      <header className="homeRecorderExportHeader">
        <div>
          <span className="homeRecorderEyebrow">Clip</span>
          <strong>{exportedClips.length > 0 ? 'Export Ready' : mode === 'exporting' ? 'Exporting' : 'Export'}</strong>
        </div>
        <button type="button" className="homeRecorderCloseButton" onClick={resetClip} aria-label="Discard recording">
          X
        </button>
      </header>

      {sourceUrl ? (
        <video className="homeRecorderPreview" src={sourceUrl} controls muted playsInline onLoadedMetadata={handlePreviewMetadata} />
      ) : null}

      <div className="homeRecorderControlGrid">
        <label>
          <span>Quality</span>
          <select value={quality} onChange={(event) => setQuality(event.currentTarget.value as SceneRecorderQualityId)} disabled={mode === 'exporting'}>
            {Object.entries(SCENE_RECORDER_QUALITIES).map(([id, option]) => (
              <option key={id} value={id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Size</span>
          <select value={sizePreset} onChange={(event) => setSizePreset(event.currentTarget.value as SceneRecorderSizePresetId)} disabled={mode === 'exporting'}>
            {SCENE_RECORDER_SIZE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <div className="homeRecorderSegmented" aria-label="Fit mode">
          <button type="button" className={fitMode === 'crop' ? 'isActive' : ''} onClick={() => setFitMode('crop')} disabled={mode === 'exporting'}>
            Crop
          </button>
          <button type="button" className={fitMode === 'contain' ? 'isActive' : ''} onClick={() => setFitMode('contain')} disabled={mode === 'exporting'}>
            Fit
          </button>
        </div>

        <div className="homeRecorderSizeInputs">
          <label>
            <span>W</span>
            <input
              type="number"
              min={SCENE_RECORDER_MIN_DIMENSION}
              max={SCENE_RECORDER_MAX_DIMENSION}
              step={2}
              value={sizePreset === 'custom' ? customSize.width : outputSize.width}
              disabled={sizePreset !== 'custom' || mode === 'exporting'}
              onChange={(event) => setCustomSize((current) => ({ ...current, width: clampRecordingDimension(Number(event.currentTarget.value)) }))}
            />
          </label>
          <label>
            <span>H</span>
            <input
              type="number"
              min={SCENE_RECORDER_MIN_DIMENSION}
              max={SCENE_RECORDER_MAX_DIMENSION}
              step={2}
              value={sizePreset === 'custom' ? customSize.height : outputSize.height}
              disabled={sizePreset !== 'custom' || mode === 'exporting'}
              onChange={(event) => setCustomSize((current) => ({ ...current, height: clampRecordingDimension(Number(event.currentTarget.value)) }))}
            />
          </label>
        </div>

        <div className="homeRecorderTrimInputs">
          <label>
            <span>Start</span>
            <input
              type="number"
              min={0}
              max={Math.max(0, trimEnd - 0.1)}
              step={0.1}
              value={Number(trimStart.toFixed(1))}
              disabled={mode === 'exporting'}
              onChange={(event) => updateTrimStart(Number(event.currentTarget.value))}
            />
          </label>
          <label>
            <span>End</span>
            <input
              type="number"
              min={Math.min(sourceDuration, trimStart + 0.1)}
              max={sourceDuration}
              step={0.1}
              value={Number((trimEnd || sourceDuration).toFixed(1))}
              disabled={mode === 'exporting'}
              onChange={(event) => updateTrimEnd(Number(event.currentTarget.value))}
            />
          </label>
        </div>

        <label className="homeRecorderMaxSizeInput">
          <span>Max MB</span>
          <input
            type="number"
            min={SCENE_RECORDER_MAX_SIZE_MIN_MB}
            max={SCENE_RECORDER_MAX_SIZE_MAX_MB}
            step={1}
            value={maxFileSizeMb}
            disabled={mode === 'exporting'}
            onChange={(event) => setMaxFileSizeMb(clampMaxFileSizeMb(Number(event.currentTarget.value)))}
          />
        </label>

        <label className="homeRecorderSplitToggle">
          <input
            type="checkbox"
            checked={splitToMaxSize}
            disabled={mode === 'exporting'}
            onChange={(event) => setSplitToMaxSize(event.currentTarget.checked)}
          />
          <span>Split under max</span>
        </label>
      </div>

      <div className="homeRecorderExportFooter">
        <span>
          {outputSize.width} x {outputSize.height}
          {splitToMaxSize ? ` / max ${maxFileSizeMb} MB` : ''}
        </span>
        <div className="homeRecorderActions">
          <button type="button" className="homeRecorderSecondaryButton" onClick={startRecording} disabled={mode === 'exporting'}>
            New
          </button>
          <button type="button" className="homeRecorderExportButton" onClick={exportClip} disabled={mode === 'exporting' || !recordedBlob}>
            {mode === 'exporting' ? `${Math.round(exportProgress * 100)}%` : 'Export'}
          </button>
          {exportedClips.map((clip, index) => (
            <a key={clip.id} className="homeRecorderDownloadButton" href={clip.url} download={clip.name}>
              {exportedClips.length > 1 ? `Part ${index + 1}` : 'Download'}
            </a>
          ))}
        </div>
      </div>
      {exportedClips.length > 0 ? (
        <div className="homeRecorderSegments">
          {exportedClips.map((clip, index) => (
            <span key={`${clip.id}-size`}>
              {exportedClips.length > 1 ? `Part ${index + 1}` : 'Clip'}: {formatBytes(clip.size)}
            </span>
          ))}
        </div>
      ) : null}
      {error ? <div className="homeRecorderPanelError">{error}</div> : null}
    </section>
  )
}
