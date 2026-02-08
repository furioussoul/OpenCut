/**
 * Remotion Server-side Entry Point
 * 
 * 用于服务端渲染的入口文件
 */

import { registerRoot, Composition } from 'remotion'
import React from 'react'
import { CompositionVideo } from './CompositionVideo'
import type { Composition as CompositionType } from '@/types'

const defaultComposition: CompositionType = {
  id: 'default',
  name: 'Default',
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 300,
  sequences: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

// Wrapper component to handle props typing
const DynamicCompositionWrapper: React.FC<{ composition?: CompositionType }> = ({ 
  composition = defaultComposition 
}) => {
  return <CompositionVideo composition={composition} />
}

const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 动态 Composition - 用于渲染用户创建的内容 */}
      <Composition
        id="DynamicComposition"
        component={DynamicCompositionWrapper}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          composition: defaultComposition,
        }}
        calculateMetadata={async ({ props }) => {
          const comp = (props as { composition?: CompositionType }).composition
          if (!comp) {
            return {}
          }
          
          // 计算实际时长 - 精确匹配内容，无额外 padding
          const sequences = comp.sequences || []
          const audio = comp.audio
          const sequenceEndFrames = sequences.map((s) => s.from + s.duration)
          const audioEndFrame = audio ? audio.from + audio.duration : 0
          const contentEndFrame = Math.max(
            ...sequenceEndFrames,
            audioEndFrame,
            30
          )

          return {
            durationInFrames: contentEndFrame,
            fps: comp.fps,
            width: comp.width,
            height: comp.height,
          }
        }}
      />
    </>
  )
}

registerRoot(RemotionRoot)
