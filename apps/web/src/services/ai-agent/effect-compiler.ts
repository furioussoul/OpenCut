/**
 * 特效代码动态编译器
 * 使用 sucrase 将 TSX 代码编译为可执行的 React 组件
 */

import { transform } from "sucrase";
import React from "react";

/**
 * 验证特效代码的安全性
 * 禁止危险的 API 调用
 */
function validateEffectCode(code: string): { valid: boolean; error?: string } {
	const forbidden = [
		{ pattern: /useEffect\s*\(/, message: "禁止使用 useEffect" },
		{ pattern: /useLayoutEffect\s*\(/, message: "禁止使用 useLayoutEffect" },
		{ pattern: /fetch\s*\(/, message: "禁止使用 fetch" },
		{ pattern: /XMLHttpRequest/, message: "禁止使用 XMLHttpRequest" },
		{ pattern: /document\./, message: "禁止访问 document" },
		{
			pattern: /window\.(?!innerWidth|innerHeight)/,
			message: "禁止访问 window",
		},
		{ pattern: /localStorage/, message: "禁止访问 localStorage" },
		{ pattern: /sessionStorage/, message: "禁止访问 sessionStorage" },
		{ pattern: /eval\s*\(/, message: "禁止使用 eval" },
		{ pattern: /Function\s*\(/, message: "禁止使用 Function 构造器" },
		{ pattern: /import\s+(?!type\s)/, message: "禁止动态导入" },
		{ pattern: /require\s*\(/, message: "禁止使用 require" },
		{ pattern: /process\./, message: "禁止访问 process" },
		{ pattern: /__dirname/, message: "禁止访问 __dirname" },
		{ pattern: /__filename/, message: "禁止访问 __filename" },
	];

	for (const { pattern, message } of forbidden) {
		if (pattern.test(code)) {
			return { valid: false, error: message };
		}
	}

	return { valid: true };
}

/**
 * 编译特效代码为 React 组件
 * @param code TSX 源代码
 * @returns React 组件函数，如果编译失败返回 null
 */
export function compileEffectCode(code: string): React.FC<any> | null {
	// Step 1: 安全性验证
	const validation = validateEffectCode(code);
	if (!validation.valid) {
		console.error(`特效代码验证失败: ${validation.error}`);
		return null;
	}

	try {
		// Step 2: 使用 sucrase 编译 TSX -> JS
		const { code: compiledCode } = transform(code, {
			transforms: ["typescript", "jsx"],
			jsxRuntime: "classic",
			production: true,
		});

		// Step 3: 包装代码，注入 React
		const wrappedCode = `
			const React = __React__;
			const { useState, useMemo, useCallback, useRef } = React;
			${compiledCode}
			return typeof Component !== 'undefined' ? Component : 
			       typeof default_1 !== 'undefined' ? default_1 :
			       (() => { throw new Error('No component exported'); })();
		`;

		// Step 4: 使用 new Function 执行
		const factory = new Function("__React__", wrappedCode);
		const Component = factory(React);

		// Step 5: 验证返回值是函数
		if (typeof Component !== "function") {
			console.error("编译结果不是有效的 React 组件");
			return null;
		}

		return Component;
	} catch (error) {
		console.error("特效代码编译失败:", error);
		return null;
	}
}

/**
 * 创建特效组件的代码模板
 * Agent 可以基于此模板生成新的特效
 */
export function getEffectCodeTemplate(
	name: string,
	description: string,
): string {
	return `/**
 * ${name}
 * ${description}
 */

interface ${name}Props {
  // 可编辑属性
  color?: string;
  speed?: number;
  // Remotion 注入的属性
  __remotion_frame?: number;
  __remotion_fps?: number;
  __remotion_duration?: number;
}

const Component: React.FC<${name}Props> = ({
  color = "#ffffff",
  speed = 1,
  __remotion_frame = 0,
  __remotion_fps = 30,
  __remotion_duration = 5,
}) => {
  // 基于帧计算动画进度
  const progress = __remotion_frame / (__remotion_fps * __remotion_duration);
  
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* 在这里实现特效 */}
      <div style={{ color }}>
        ${name} Effect
      </div>
    </div>
  );
};

export default Component;
`;
}
