'use client'

import { Layers, FileStack } from 'lucide-react'

export function ReadIrResult({ data }: { data: any }) {
  if (!data) return null

  const parsed = parseMCPOutput(data)

  // If it's a string (raw IR content), show line count
  if (typeof parsed === 'string') {
    const lines = parsed.split('\n').filter((l: string) => l.trim()).length
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Layers className="size-3.5" />
        <span>{lines} lines of IR content</span>
      </div>
    )
  }

  const blockCount = parsed.blocks?.length ?? 0
  const pageCount = parsed.blocks
    ? new Set(parsed.blocks.map((b: any) => b.page_number).filter(Boolean)).size || 1
    : 0

  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      {blockCount > 0 && (
        <div className="flex items-center gap-1.5">
          <Layers className="size-3.5" />
          <span>{blockCount} blocks</span>
        </div>
      )}
      {pageCount > 0 && (
        <div className="flex items-center gap-1.5">
          <FileStack className="size-3.5" />
          <span>{pageCount} page{pageCount !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  )
}

function parseMCPOutput(data: any): any {
  if (typeof data === 'string') {
    try { return JSON.parse(data) } catch { return data }
  }
  if (data?.content && Array.isArray(data.content)) {
    const text = data.content
      .filter((item: any) => item.type === 'text' && item.text)
      .map((item: any) => item.text)
      .join('')
    try { return JSON.parse(text) } catch { return text }
  }
  return data
}
