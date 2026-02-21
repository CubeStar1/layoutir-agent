'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Hash } from 'lucide-react'

export function DeleteIrBlockResult({ data }: { data: any }) {
  if (!data) return null

  const parsed = parseMCPOutput(data)

  return (
    <div className="space-y-2">
      {parsed.block_id && (
        <div className="flex items-center gap-2">
          <Hash className="size-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Deleted block:</span>
          <Badge variant="secondary" className="font-mono text-xs line-through">
            {parsed.block_id.length > 16 ? parsed.block_id.slice(0, 16) + '…' : parsed.block_id}
          </Badge>
        </div>
      )}
      {parsed.success !== undefined && (
        <div className="flex items-center gap-1.5 text-sm">
          {parsed.success ? (
            <>
              <CheckCircle2 className="size-3.5 text-green-500" />
              <span className="text-green-600 dark:text-green-400">Block deleted successfully</span>
            </>
          ) : (
            <>
              <XCircle className="size-3.5 text-red-500" />
              <span className="text-red-600 dark:text-red-400">{parsed.error || 'Delete failed'}</span>
            </>
          )}
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
