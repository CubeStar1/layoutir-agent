'use client'

import { memo } from 'react'
import { ToolUIPart } from 'ai'
import { DynamicToolResult } from './dynamic-tool-result'

interface StaticToolDisplayProps {
  part: ToolUIPart
}

function StaticToolDisplayInternal({ part }: StaticToolDisplayProps) {
  return <DynamicToolResult part={part as any} />
}

export const StaticToolDisplay = memo(StaticToolDisplayInternal)
