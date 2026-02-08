"use client"

import React, { useMemo, useEffect, useState, useCallback, Component as ReactComponent } from "react"
import * as Remotion from "remotion"
import { transform } from "sucrase"
import type { GeneratedComponent } from "@/types"

/**
 * Error Boundary - 捕获渲染时错误
 */
interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback: (error: Error) => React.ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

class ErrorBoundary extends ReactComponent<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("DynamicComponent render error:", error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return this.props.fallback(this.state.error)
    }
    return this.props.children
  }
}

/**
 * 自定义 staticFile 包装函数
 * 处理 aigc/ 目录下的资源路径
 * - 在浏览器预览时：转换为 /api/assets?path=... 路径
 * - 在渲染时（服务端）：使用原始 staticFile（渲染 API 会复制文件到 public）
 */
const customStaticFile = (path: string): string => {
  // 检测是否在浏览器环境中（预览模式）
  const isBrowser = typeof window !== 'undefined'
  
  if (path.startsWith('aigc/')) {
    if (isBrowser) {
      // 预览模式：使用 API 路径
      return `/api/assets?path=${encodeURIComponent(path)}`
    }
    // 渲染模式：使用 staticFile，渲染前文件会被复制到 public
    return Remotion.staticFile('/' + path)
  }
  
  // 其他路径使用原始 staticFile
  return Remotion.staticFile(path)
}

/**
 * Remotion 导出的所有可用 API
 * AI 生成的组件可以使用这些
 */
const RemotionScope: Record<string, unknown> = {
  // Core
  useCurrentFrame: Remotion.useCurrentFrame,
  useVideoConfig: Remotion.useVideoConfig,
  AbsoluteFill: Remotion.AbsoluteFill,
  Sequence: Remotion.Sequence,
  
  // Animation
  interpolate: Remotion.interpolate,
  spring: Remotion.spring,
  Easing: Remotion.Easing,
  
  // Media
  Audio: Remotion.Audio,
  Img: Remotion.Img,
  Video: Remotion.Video,
  
  // Utils
  staticFile: customStaticFile,
  random: Remotion.random,
  
  // React
  React,
  useState: React.useState,
  useEffect: React.useEffect,
  useMemo: React.useMemo,
  useCallback: React.useCallback,
  useRef: React.useRef,
}

/**
 * 模拟的依赖模块映射
 * 当代码中 require('remotion') 时，返回对应的对象
 * 使用 Proxy 来扩展 React，确保 hooks 调度器一致性
 */
const ReactModuleProxy = new Proxy(React, {
  get(target, prop) {
    // 确保 default 导出返回 React 本身
    if (prop === 'default') {
      return React
    }
    // 其他属性直接从 React 获取
    return (target as Record<string | symbol, unknown>)[prop]
  }
})

const mockModules: Record<string, unknown> = {
  'remotion': RemotionScope,
  'react': ReactModuleProxy,
}

/**
 * 使用 Sucrase 编译代码
 * 将 TypeScript/JSX 转换为 JavaScript，并将 import/export 转换为 CommonJS
 */
function compileWithSucrase(code: string): string {
  try {
    const result = transform(code, {
      transforms: ['typescript', 'jsx', 'imports'],
      jsxRuntime: 'classic',
      production: true,
    })
    return result.code
  } catch (err) {
    console.error('[Sucrase] Transform error:', err)
    throw err
  }
}

/**
 * 模块缓存类型
 */
interface ModuleCache {
  [moduleName: string]: {
    exports: Record<string, unknown>
    compiled: boolean
  }
}

/**
 * 创建支持相对路径导入的 require 函数
 * 
 * @param fileContents - 目录下所有文件的内容 { filename: code }
 * @param moduleCache - 已编译模块的缓存
 * @param compileModule - 编译单个模块的函数
 */
function createModuleRequire(
  fileContents: Record<string, string>,
  moduleCache: ModuleCache,
  compileModule: (name: string, code: string) => Record<string, unknown>,
  sequenceFrom: number,
  sequenceDuration: number
): (moduleName: string) => unknown {
  return (moduleName: string): unknown => {
    // 1. 内置模块
    if (mockModules[moduleName]) {
      return mockModules[moduleName]
    }
    
    // 2. 相对路径导入 (./xxx or ../xxx)
    if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
      // 提取模块名（去掉 ./ 和可能的扩展名）
      const cleanName = moduleName
        .replace(/^\.\//, '')
        .replace(/^\.\.\//, '')
        .replace(/\.(tsx|ts|js|jsx)$/, '')
      
      // 检查缓存
      if (moduleCache[cleanName]?.compiled) {
        return moduleCache[cleanName].exports
      }
      
      // 查找文件内容
      const code = fileContents[cleanName]
      if (!code) {
        console.warn(`[DynamicComponent] Module not found: ${moduleName} (looked for ${cleanName})`)
        console.warn('[DynamicComponent] Available files:', Object.keys(fileContents))
        return {}
      }
      
      // 编译并缓存
      const exports = compileModule(cleanName, code)
      return exports
    }
    
    // 3. 未知模块
    console.warn(`[DynamicComponent] Unknown module required: ${moduleName}`)
    return {}
  }
}

/**
 * 执行多文件组件代码
 * 支持 TypeScript, JSX, import/export，以及相对路径导入
 * 
 * @param fileContents - 目录下所有文件的内容 { filename: code, __main__: 'component' }
 * @param sequenceFrom - 序列开始帧
 * @param sequenceDuration - 序列持续帧数
 */
function executeMultiFileComponent(
  fileContents: Record<string, string>,
  sequenceFrom: number,
  sequenceDuration: number
): React.ComponentType<unknown> | null {
  // 获取主文件名
  const mainFileName = fileContents.__main__ as string || 'component'
  
  // 移除 __main__ 标记
  const files = { ...fileContents }
  delete files.__main__
  
  // 模块缓存
  const moduleCache: ModuleCache = {}
  
  // 编译单个模块的函数
  const compileModule = (name: string, code: string): Record<string, unknown> => {
    // 防止循环依赖
    if (moduleCache[name]) {
      return moduleCache[name].exports
    }
    
    // 预先占位，防止循环依赖
    moduleCache[name] = { exports: {}, compiled: false }
    
    try {
      // 使用 Sucrase 编译
      const compiledCode = compileWithSucrase(code)
      
      // 创建模块环境
      const mockModule = { exports: {} as Record<string, unknown> }
      const mockExports = mockModule.exports
      
      // 创建该模块的 require 函数
      const moduleRequire = createModuleRequire(files, moduleCache, compileModule, sequenceFrom, sequenceDuration)
      
      // 注入变量
      const injectedVars = `
        var sequenceFrom = ${sequenceFrom};
        var sequenceDuration = ${sequenceDuration};
      `
      
      // 执行模块代码
      // eslint-disable-next-line no-new-func
      const executeCode = new Function(
        'require',
        'module',
        'exports',
        'React',
        injectedVars + compiledCode
      )
      
      executeCode(moduleRequire, mockModule, mockExports, React)
      
      // 更新缓存
      moduleCache[name] = { exports: mockExports, compiled: true }
      
      return mockExports
    } catch (err) {
      console.error(`[DynamicComponent] Failed to compile module ${name}:`, err)
      throw err
    }
  }
  
  // 编译主文件
  const mainCode = files[mainFileName]
  if (!mainCode) {
    console.error(`[DynamicComponent] Main file not found: ${mainFileName}`)
    console.error('[DynamicComponent] Available files:', Object.keys(files))
    return null
  }
  
  const mainExports = compileModule(mainFileName, mainCode)
  
  // 获取组件
  let Component = mainExports.default || mainExports.Component
  
  // 如果 default 是一个对象（可能是嵌套导出），尝试获取其 default
  if (Component && typeof Component === 'object' && 'default' in Component) {
    Component = (Component as Record<string, unknown>).default
  }
  
  if (!Component) {
    console.warn('[DynamicComponent] No Component or default export found in main file')
    console.warn('[DynamicComponent] Main exports:', Object.keys(mainExports))
    return null
  }
  
  if (typeof Component !== 'function') {
    console.error('[DynamicComponent] Component is not a function:', typeof Component)
    return null
  }
  
  return Component as React.ComponentType<unknown>
}

/**
 * 使用 Sucrase 编译并执行单文件组件代码（向后兼容）
 * 支持 TypeScript, JSX, import/export
 */
function executeComponentCode(
  code: string,
  sequenceFrom: number,
  sequenceDuration: number
): React.ComponentType<unknown> | null {
  // 使用多文件执行器，只传入单个文件
  return executeMultiFileComponent(
    { component: code, __main__: 'component' },
    sequenceFrom,
    sequenceDuration
  )
}

/**
 * 错误显示组件
 */
function ErrorDisplay({ message }: { message: string }) {
  return (
    <Remotion.AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
      }}
    >
      <div
        style={{
          padding: 16,
          backgroundColor: "#1a1a1a",
          borderRadius: 8,
          border: "1px solid #ff4444",
          maxWidth: "80%",
          maxHeight: "60%",
          overflow: "auto",
          textAlign: "center",
        }}
      >
        <div style={{ color: "#ff4444", fontWeight: "bold", marginBottom: 8, fontSize: 14 }}>
          Component Error
        </div>
        <div style={{ color: "#888", fontSize: 11, fontFamily: "monospace", whiteSpace: "pre-wrap", marginBottom: 12 }}>
          {message}
        </div>
        <div style={{ color: "#666", fontSize: 10, marginBottom: 8 }}>
          AI 正在编辑代码时可能出现临时错误
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "6px 16px",
            backgroundColor: "#333",
            color: "#fff",
            border: "1px solid #555",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          刷新页面
        </button>
      </div>
    </Remotion.AbsoluteFill>
  )
}

/**
 * Loading 显示组件
 */
function LoadingDisplay() {
  return (
    <Remotion.AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
      }}
    >
      <div style={{ color: "#888", fontSize: 14 }}>
        Loading component...
      </div>
    </Remotion.AbsoluteFill>
  )
}

// ============================================
// 新增：从文件路径加载组件的版本
// ============================================

interface DynamicComponentFromPathProps {
  componentPath: string
  componentProps?: Record<string, unknown>
  sequenceFrom: number
  sequenceDuration: number
}

/**
 * 从文件路径加载组件及其依赖的 Hook
 * 支持自动检测文件变化并刷新（每 500ms 轮询）
 * 返回目录下所有 .tsx 文件的内容
 */
function useComponentFiles(componentPath: string): { 
  files: Record<string, string> | null
  error: string | null
  loading: boolean
  refresh: () => void
} {
  const [files, setFiles] = useState<Record<string, string> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastModified, setLastModified] = useState<number>(0)
  const [refreshKey, setRefreshKey] = useState(0)

  // 手动刷新函数
  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  // 加载组件代码（包括依赖）
  useEffect(() => {
    let cancelled = false
    
    async function loadFiles() {
      try {
        setLoading(true)
        
        // 添加 withDeps=true 来获取所有依赖文件
        const response = await fetch(`/api/component?path=${encodeURIComponent(componentPath)}&withDeps=true`)
        
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || `HTTP ${response.status}`)
        }
        
        const data = await response.json()
        
        if (!cancelled) {
          setFiles(data.files)
          setLastModified(data.lastModified || Date.now())
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load component')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    
    loadFiles()
    
    return () => {
      cancelled = true
    }
  }, [componentPath, refreshKey])

  // 定期检查文件是否更新（每 500ms，更及时响应 AI 编辑）
  // 无论是否有错误都继续轮询，这样 AI 修复代码后能自动恢复
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // 添加时间戳防止缓存
        const response = await fetch(`/api/component?path=${encodeURIComponent(componentPath)}&withDeps=true&t=${Date.now()}`)
        if (!response.ok) return
        
        const data = await response.json()
        const newLastModified = data.lastModified || 0
        
        if (newLastModified > lastModified) {
          // 文件已更新，重新加载
          setFiles(data.files)
          setLastModified(newLastModified)
          setError(null) // 清除之前的错误
          console.log('[DynamicComponent] Files updated, refreshing:', componentPath)
        }
      } catch {
        // 忽略检查错误
      }
    }
    
    const interval = setInterval(checkForUpdates, 3000)
    return () => clearInterval(interval)
  }, [componentPath, lastModified])

  return { files, error, loading, refresh }
}

/**
 * 从文件路径加载的动态组件（支持多文件依赖）
 */
export const DynamicComponentFromPath: React.FC<DynamicComponentFromPathProps> = ({
  componentPath,
  componentProps,
  sequenceFrom,
  sequenceDuration,
}) => {
  const { files, error: loadError, loading } = useComponentFiles(componentPath)
  const [compileError, setCompileError] = useState<string | null>(null)
  const [CompiledComponent, setCompiledComponent] = useState<React.ComponentType<any> | null>(null)
  const [compilationVersion, setCompilationVersion] = useState(0)

  // 编译并缓存组件
  useEffect(() => {
    if (!files) {
      setCompiledComponent(null)
      return
    }

    try {
      setCompileError(null)

      // 使用多文件执行器编译并执行代码
      const Comp = executeMultiFileComponent(files, sequenceFrom, sequenceDuration)

      if (!Comp) {
        setCompileError("Component not found in generated code. Make sure to export default or define a Component variable.")
        return
      }

      setCompiledComponent(() => Comp)
      setCompilationVersion(v => v + 1)
    } catch (err) {
      console.error("Failed to compile component:", err)
      setCompileError(err instanceof Error ? err.message : "Unknown compile error")
      setCompiledComponent(null)
    }
  }, [files, sequenceFrom, sequenceDuration])

  // Loading state
  if (loading) {
    return <LoadingDisplay />
  }

  // Load error
  if (loadError) {
    return <ErrorDisplay message={`Load Error: ${loadError}`} />
  }

  // Compile error
  if (compileError) {
    return <ErrorDisplay message={`Compile Error: ${compileError}`} />
  }

  // No component
  if (!CompiledComponent) {
    return null
  }

  // Render with error boundary
  // ErrorBoundary needs a key to reset when component updates
  return (
    <ErrorBoundary key={compilationVersion} fallback={(error) => <ErrorDisplay message={`Runtime Error: ${error.message}`} />}>
      <SafeRender Component={CompiledComponent} props={componentProps || {}} />
    </ErrorBoundary>
  )
}

// ============================================
// 保留：原有的内存代码版本（向后兼容）
// ============================================

interface DynamicComponentProps {
  component: GeneratedComponent
  sequenceFrom: number
  sequenceDuration: number
}

/**
 * 动态组件渲染器（内存代码版本）
 * 
 * 安全地执行 AI 生成的组件代码
 */
export const DynamicComponent: React.FC<DynamicComponentProps> = ({
  component,
  sequenceFrom,
  sequenceDuration,
}) => {
  const [compileError, setCompileError] = useState<string | null>(null)
  const [CompiledComponent, setCompiledComponent] = useState<React.ComponentType<any> | null>(null)

  // 编译并缓存组件
  useEffect(() => {
    try {
      setCompileError(null)
      
      if (!component.code) {
        setCompiledComponent(null)
        return
      }

      // 使用 Sucrase 编译并执行代码
      const Comp = executeComponentCode(component.code, sequenceFrom, sequenceDuration)

      if (!Comp) {
        setCompileError("Component not found in generated code. Make sure to export default or define a Component variable.")
        return
      }

      setCompiledComponent(() => Comp)
    } catch (err) {
      console.error("Failed to compile component:", err)
      setCompileError(err instanceof Error ? err.message : "Unknown compile error")
      setCompiledComponent(null)
    }
  }, [component.code, sequenceFrom, sequenceDuration])

  // 编译错误
  if (compileError) {
    return <ErrorDisplay message={`Compile Error: ${compileError}`} />
  }

  // 等待编译
  if (!CompiledComponent) {
    return null
  }

  // 用 Error Boundary 包装，捕获渲染时错误
  return (
    <ErrorBoundary fallback={(error) => <ErrorDisplay message={`Runtime Error: ${error.message}`} />}>
      <SafeRender Component={CompiledComponent} props={component.props || {}} />
    </ErrorBoundary>
  )
}

/**
 * 安全渲染包装器 - 捕获渲染错误
 */
function SafeRender({ Component, props }: { Component: React.ComponentType<any>; props: Record<string, unknown> }) {
  try {
    return <Component {...props} />
  } catch (err) {
    console.error("SafeRender caught error:", err)
    return <ErrorDisplay message={err instanceof Error ? err.message : "Unknown render error"} />
  }
}
