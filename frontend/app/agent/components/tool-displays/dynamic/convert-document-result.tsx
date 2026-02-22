'use client'

import { Badge } from '@/components/ui/badge'
import { FileText, Hash } from 'lucide-react'

export function ConvertDocumentResult({ data }: { data: any }) {
  if (!data) return null

  // Handle MCP content wrapper
  const parsed = parseMCPOutput(data)

  return (
    <div className="space-y-2">
      {parsed.document_id && (
        <div className="flex items-center gap-2">
          <Hash className="size-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Document ID:</span>
          <Badge variant="secondary" className="font-mono text-xs">
            {parsed.document_id}
          </Badge>
        </div>
      )}
      {parsed.filename && (
        <div className="flex items-center gap-2">
          <FileText className="size-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{parsed.filename}</span>
        </div>
      )}
      {parsed.message && (
        <p className="text-sm text-muted-foreground">{parsed.message}</p>
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
