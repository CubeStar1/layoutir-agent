'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Download, FileOutput, FileType } from 'lucide-react'

export function ExportResult({ data, format }: { data: any; format: 'latex' | 'docx' }) {
  if (!data) return null

  const parsed = parseMCPOutput(data)
  const isSuccess = parsed.success !== false

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border p-3 bg-secondary/10 hover:bg-secondary/20 transition-colors w-full">
      <div className="flex h-12 w-10 flex-shrink-0 items-center justify-center rounded-md bg-purple-500/10 text-purple-500">
        <FileOutput className="h-5 w-5" />
      </div>
      
      <div className="flex flex-1 flex-col truncate">
        <span className="text-sm font-medium text-foreground truncate">
          Document Exported
        </span>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <div className="flex items-center gap-1">
            <FileType className="size-3" />
            <span className="uppercase">{format}</span>
          </div>
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

      {parsed.url && (
        <a
          href={parsed.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-8 items-center justify-center rounded-md border border-border bg-background px-4 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring flex-shrink-0 shadow-sm gap-1.5"
        >
          <Download className="size-3" />
          Download
        </a>
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
