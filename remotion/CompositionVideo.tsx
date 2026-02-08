"use client"

import React from "react"
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Audio, Sequence as RemotionSequence } from "remotion"
import type { Composition, Sequence, SequenceContent } from "@/types"
import { DynamicComponent, DynamicComponentFromPath } from "./DynamicComponent"

// 组件的临时覆盖属性
export interface ComponentOverrides {
  [sequenceId: string]: {
    x?: number
    y?: number
    rotateX?: number
    rotateY?: number
    rotateZ?: number
  }
}

export interface CompositionVideoProps {
  composition: Composition
  overrides?: ComponentOverrides
}

/**
 * 转换音频路径为可访问的 URL
 * - aigc/xxx/uploads/xxx.mp3 -> /api/assets?path=aigc/xxx/uploads/xxx.mp3
 * - /uploads/xxx.mp3 -> /uploads/xxx.mp3 (直接访问 public)
 * - http(s):// -> 直接使用
 */
function getAudioUrl(src: string): string {
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src
  }
  if (src.startsWith('aigc/')) {
    return `/api/assets?path=${encodeURIComponent(src)}`
  }
  return src
}

/**
 * 动态视频组件 - 根据 composition 配置渲染视频
 * 
 * 支持两种渲染模式：
 * 1. 新模式：componentCode - AI 生成的组件代码（优先）
 * 2. 旧模式：content - 模板化的内容配置（向后兼容）
 */
export const CompositionVideo: React.FC<CompositionVideoProps> = ({ composition, overrides }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill style={{ backgroundColor: composition.backgroundColor || "#000000" }}>
      {/* Render audio track if exists */}
      {composition.audio && composition.audio.src && (
        <RemotionSequence from={composition.audio.from} durationInFrames={composition.audio.duration}>
          <Audio
            src={getAudioUrl(composition.audio.src)}
            volume={composition.audio.volume}
          />
        </RemotionSequence>
      )}
      
      {/* Render sequences */}
      {composition.sequences.map((sequence) => {
        // 检查 sequence 是否在当前帧可见
        const endFrame = sequence.from + sequence.duration
        if (frame < sequence.from || frame >= endFrame) {
          return null
        }

        // 获取该 sequence 的覆盖属性（临时编辑状态）
        const seqOverrides = overrides?.[sequence.id] || {}
        
        // 合并 props：原始 props + overrides
        // 保存后的值在 componentProps，编辑中的值在 overrides
        const mergedProps = {
          ...(sequence.componentProps || {}),
          ...seqOverrides,
        }
        
        // 提取旋转值（用于外层包装）
        // 优先使用 overrides 中的值，否则使用 componentProps 中保存的值
        const savedProps = sequence.componentProps || {}
        const rotateX = seqOverrides.rotateX ?? (savedProps.rotateX as number) ?? 0
        const rotateY = seqOverrides.rotateY ?? (savedProps.rotateY as number) ?? 0
        const rotateZ = seqOverrides.rotateZ ?? (savedProps.rotateZ as number) ?? 0
        const hasRotation = rotateX !== 0 || rotateY !== 0 || rotateZ !== 0

        // 渲染组件
        let content: React.ReactNode = null

        // 新模式：从文件路径加载组件（优先）
        if (sequence.componentPath) {
          content = (
            <DynamicComponentFromPath
              componentPath={sequence.componentPath}
              componentProps={mergedProps}
              sequenceFrom={sequence.from}
              sequenceDuration={sequence.duration}
            />
          )
        }
        // 兼容模式：使用内存中的组件代码
        else if (sequence.componentCode?.code) {
          const mergedCodeProps = {
            ...(sequence.componentCode.props || {}),
            ...seqOverrides,
          }
          
          content = (
            <DynamicComponent
              component={{
                ...sequence.componentCode,
                props: mergedCodeProps,
              }}
              sequenceFrom={sequence.from}
              sequenceDuration={sequence.duration}
            />
          )
        }
        // 旧模式：使用模板渲染器（向后兼容）
        else {
          content = (
            <SequenceRenderer
              sequence={sequence}
              frame={frame}
              fps={fps}
              composition={composition}
            />
          )
        }

        // 如果有旋转，在外层应用 3D 变换
        if (hasRotation && content) {
          return (
            <div 
              key={sequence.id} 
              style={{
                position: 'absolute',
                inset: 0,
                perspective: '1000px',
                transformStyle: 'preserve-3d',
              }}
            >
              <div style={{ 
                width: '100%',
                height: '100%',
                transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
                transformStyle: 'preserve-3d',
              }}>
                {content}
              </div>
            </div>
          )
        }

        return <React.Fragment key={sequence.id}>{content}</React.Fragment>
      })}
    </AbsoluteFill>
  )
}

/**
 * Sequence 渲染器
 */
function SequenceRenderer({
  sequence,
  frame,
  fps,
  composition,
}: {
  sequence: Sequence
  frame: number
  fps: number
  composition: Composition
}) {
  const content = sequence.content
  if (!content) return null

  // 计算相对于 sequence 开始的帧数
  const relativeFrame = frame - sequence.from
  const animationType = content.animation || "fadeIn"

  // 计算动画效果
  const animationProps = calculateAnimation(animationType, relativeFrame, sequence.duration, fps)

  switch (content.type) {
    case "text":
      return <TextRenderer content={content} animationProps={animationProps} composition={composition} />

    case "shape":
      return <ShapeRenderer content={content} animationProps={animationProps} composition={composition} />

    case "image":
      return <ImageRenderer content={content} animationProps={animationProps} />

    default:
      return null
  }
}

interface AnimationProps {
  opacity: number
  translateX: number
  translateY: number
  scale: number
  rotate: number
}

/**
 * 计算动画效果
 */
function calculateAnimation(
  type: string,
  relativeFrame: number,
  duration: number,
  fps: number,
): AnimationProps {
  const props: AnimationProps = {
    opacity: 1,
    translateX: 0,
    translateY: 0,
    scale: 1,
    rotate: 0,
  }

  const enterDuration = Math.min(20, duration / 4)
  const exitStart = duration - enterDuration

  switch (type) {
    case "fadeIn":
      props.opacity = interpolate(relativeFrame, [0, enterDuration], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
      break

    case "fadeInOut":
      if (relativeFrame < enterDuration) {
        props.opacity = interpolate(relativeFrame, [0, enterDuration], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      } else if (relativeFrame > exitStart) {
        props.opacity = interpolate(relativeFrame, [exitStart, duration], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
      break

    case "slideUp":
      const slideUpProgress = spring({
        frame: relativeFrame,
        fps,
        config: { damping: 80, stiffness: 100 },
      })
      props.translateY = interpolate(slideUpProgress, [0, 1], [100, 0])
      props.opacity = interpolate(relativeFrame, [0, enterDuration], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
      break

    case "slideDown":
      const slideDownProgress = spring({
        frame: relativeFrame,
        fps,
        config: { damping: 80, stiffness: 100 },
      })
      props.translateY = interpolate(slideDownProgress, [0, 1], [-100, 0])
      props.opacity = interpolate(relativeFrame, [0, enterDuration], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
      break

    case "slideLeft":
      const slideLeftProgress = spring({
        frame: relativeFrame,
        fps,
        config: { damping: 80, stiffness: 100 },
      })
      props.translateX = interpolate(slideLeftProgress, [0, 1], [200, 0])
      props.opacity = interpolate(relativeFrame, [0, enterDuration], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
      break

    case "slideRight":
      const slideRightProgress = spring({
        frame: relativeFrame,
        fps,
        config: { damping: 80, stiffness: 100 },
      })
      props.translateX = interpolate(slideRightProgress, [0, 1], [-200, 0])
      props.opacity = interpolate(relativeFrame, [0, enterDuration], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
      break

    case "scaleIn":
      const scaleProgress = spring({
        frame: relativeFrame,
        fps,
        config: { damping: 60, stiffness: 100 },
      })
      props.scale = interpolate(scaleProgress, [0, 1], [0.3, 1])
      props.opacity = interpolate(relativeFrame, [0, enterDuration / 2], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
      break

    case "bounce":
      const bounceProgress = spring({
        frame: relativeFrame,
        fps,
        config: { damping: 8, stiffness: 150 },
      })
      props.scale = interpolate(bounceProgress, [0, 1], [0, 1])
      props.opacity = 1
      break

    case "rotate":
      props.rotate = interpolate(relativeFrame, [0, 30], [0, 360], {
        extrapolateRight: "clamp",
      })
      props.opacity = interpolate(relativeFrame, [0, enterDuration], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
      break

    case "pulse":
      // 持续脉冲效果
      const pulsePhase = (relativeFrame / fps) * Math.PI * 2
      props.scale = 1 + Math.sin(pulsePhase) * 0.1
      break

    case "float":
      // 浮动效果
      const floatPhase = (relativeFrame / fps) * Math.PI * 2
      props.translateY = Math.sin(floatPhase) * 20
      break

    default:
      // 默认淡入
      props.opacity = interpolate(relativeFrame, [0, enterDuration], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
  }

  return props
}

/**
 * 文本渲染器
 */
function TextRenderer({
  content,
  animationProps,
  composition,
}: {
  content: SequenceContent
  animationProps: AnimationProps
  composition: Composition
}) {
  const x = content.x ?? composition.width / 2
  const y = content.y ?? composition.height / 2

  const { opacity, translateX, translateY, scale, rotate } = animationProps

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
        opacity,
        fontSize: content.fontSize || 48,
        color: content.textColor || "#ffffff",
        fontFamily: content.fontFamily || "Inter, sans-serif",
        fontWeight: 600,
        textAlign: "center",
        whiteSpace: "pre-wrap",
        textShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      {content.text}
    </div>
  )
}

/**
 * 形状渲染器
 */
function ShapeRenderer({
  content,
  animationProps,
  composition,
}: {
  content: SequenceContent
  animationProps: AnimationProps
  composition: Composition
}) {
  const width = content.width ?? 100
  const height = content.height ?? 100
  const x = content.x ?? composition.width / 2 - width / 2
  const y = content.y ?? composition.height / 2 - height / 2

  const { opacity, translateX, translateY, scale, rotate } = animationProps

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width,
    height,
    opacity,
    backgroundColor: content.fill || "#4ade80",
    transform: `translate(${translateX}px, ${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
    boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
  }

  if (content.shape === "circle") {
    return <div style={{ ...baseStyle, borderRadius: "50%" }} />
  }

  return <div style={{ ...baseStyle, borderRadius: 16 }} />
}

/**
 * 图片渲染器
 */
function ImageRenderer({ content, animationProps }: { content: SequenceContent; animationProps: AnimationProps }) {
  const { opacity, translateX, translateY, scale, rotate } = animationProps

  if (!content.assetId) {
    return null
  }

  return (
    <div
      style={{
        position: "absolute",
        left: content.x || 0,
        top: content.y || 0,
        width: content.width,
        height: content.height,
        opacity,
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
        backgroundColor: "#333",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#666",
        fontSize: 14,
      }}
    >
      Image
    </div>
  )
}
