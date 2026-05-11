'use client';

import React from 'react';

// 将帖子内容中的 #话题# 渲染为可点击链接
// onClickTag: (tagName: string) => void
export function renderContentWithTags(
  content: string,
  onClickTag?: (name: string) => void,
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // 匹配 #话题# 或 #话题 (空格/行尾)
  const regex = /#([^#\s]{1,20})#|#([^\s#]{1,20})(?=\s|$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    const tagName = match[1] || match[2];
    parts.push(
      <span
        key={`tag-${match.index}`}
        onClick={(e) => {
          e.stopPropagation();
          onClickTag?.(tagName);
        }}
        className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium"
      >
        #{tagName}
      </span>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}
