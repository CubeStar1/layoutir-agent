'use client'

import { Badge } from '@/components/ui/badge'
import { FileText, Hash, Layers } from 'lucide-react'

export function ConvertDocumentResult({ data }: { data: any }) {
  if (!data) return null

  // Handle MCP content wrapper
  const parsed = parseMCPOutput(data)

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border p-3 bg-secondary/10 hover:bg-secondary/20 transition-colors w-full">
      <div className="flex h-12 w-10 flex-shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
        <FileText className="h-5 w-5" />
      </div>
      
      <div className="flex flex-1 flex-col truncate">
        <span className="text-sm font-medium text-foreground truncate">
          Document Converted
        </span>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          {parsed.document_id && (
            <div className="flex items-center gap-1">
              <Hash className="size-3" />
              <span className="font-mono">{parsed.document_id.slice(0, 8)}...</span>
            </div>
          )}
          {parsed.block_count !== undefined && (
            <div className="flex items-center gap-1">
              <Layers className="size-3" />
              <span>{parsed.block_count} blocks</span>
            </div>
          )}
        </div>
      </div>
      
      {parsed.document_id && (
        <Badge variant="secondary" className="text-[10px] font-mono h-5 px-1.5 flex-shrink-0">
          Ready
        </Badge>
      )}
    </div>
  )
}

function parseMCPOutput(data: any): any {
  if (typeof data === 'string') {
    try { return JSON.parse(data) } catch { return { message: data } }
  }
  if (data?.content && Array.isArray(data.content)) {
    const text = data.content
      .filter((item: any) => item.type === 'text' && item.text)
      .map((item: any) => item.text)
      .join('')
    try { return JSON.parse(text) } catch { return { message: text } }
  }
  return data
}
