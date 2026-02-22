'use client'

import { Layers, FileStack, Braces, ExternalLink } from 'lucide-react'

export function GetIrJsonResult({ data, onOpenPanel }: { data: any; onOpenPanel?: (irJson?: string) => void }) {
  if (!data) return null

  const parsed = parseMCPOutput(data)

  const blockCount = parsed.blocks?.length ?? 0
  const pageCount = parsed.blocks
    ? new Set(parsed.blocks.map((b: any) => b.page_number).filter(Boolean)).size || 1
    : 0

  const blockTypes = parsed.blocks
    ? Object.entries(
        parsed.blocks.reduce((acc: Record<string, number>, b: any) => {
          const type = b.type || 'unknown'
          acc[type] = (acc[type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      )
    : []

  return (
    <div className="space-y-2">
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
        {onOpenPanel && blockCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const irJson = JSON.stringify(parsed);
              onOpenPanel(irJson);
            }}
            className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400 transition-colors ml-auto"
          >
            <ExternalLink className="size-3" />
            <span>View Document</span>
          </button>
        )}
      </div>
      {blockTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {blockTypes.map(([type, count]) => (
            <span
              key={type}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground"
            >
              <Braces className="size-3" />
              {type}: {count as number}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function parseMCPOutput(data: any): any {
  if (typeof data === 'string') {
    try { return JSON.parse(data) } catch { return {} }
  }
  if (data?.content && Array.isArray(data.content)) {
    const text = data.content
      .filter((item: any) => item.type === 'text' && item.text)
      .map((item: any) => item.text)
      .join('')
    try { return JSON.parse(text) } catch { return {} }
  }
  return data
}
