'use client'

import { CheckCircle2, XCircle, Hash, Pencil } from 'lucide-react'

export function EditIrBlockResult({ data }: { data: any }) {
  if (!data) return null

  const parsed = parseMCPOutput(data)
  const isSuccess = parsed.success !== false

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border p-3 bg-secondary/10 hover:bg-secondary/20 transition-colors w-full">
      <div className="flex h-12 w-10 flex-shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
        <Pencil className="h-5 w-5" />
      </div>
      
      <div className="flex flex-1 flex-col truncate">
        <span className="text-sm font-medium text-foreground truncate">
          Block Updated
        </span>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          {parsed.block_id && (
            <div className="flex items-center gap-1">
              <Hash className="size-3" />
              <span className="font-mono">{parsed.block_id.slice(0, 8)}...</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            {isSuccess ? (
              <CheckCircle2 className="size-3 text-green-500" />
            ) : (
              <XCircle className="size-3 text-red-500" />
            )}
            <span className={isSuccess ? "text-green-500/80" : "text-red-500/80"}>
              {isSuccess ? "Success" : "Failed"}
            </span>
          </div>
        </div>
      </div>
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
