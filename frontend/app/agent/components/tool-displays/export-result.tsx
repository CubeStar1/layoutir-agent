'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Download, FileType } from 'lucide-react'

export function ExportResult({ data, format }: { data: any; format: 'latex' | 'docx' }) {
  if (!data) return null

  const parsed = parseMCPOutput(data)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FileType className="size-3.5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Format:</span>
        <Badge variant="outline" className="text-xs uppercase">{format}</Badge>
      </div>
      {parsed.download_url && (
        <a
          href={parsed.download_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          <Download className="size-3.5" />
          Download export
        </a>
      )}
      {parsed.file_path && (
        <p className="text-sm text-muted-foreground">
          Exported to <code className="text-xs bg-muted px-1 py-0.5 rounded">{parsed.file_path}</code>
        </p>
      )}
      {parsed.success !== undefined && !parsed.download_url && !parsed.file_path && (
        <div className="flex items-center gap-1.5 text-sm">
          {parsed.success ? (
            <>
              <CheckCircle2 className="size-3.5 text-green-500" />
              <span className="text-green-600 dark:text-green-400">Export completed</span>
            </>
          ) : (
            <>
              <XCircle className="size-3.5 text-red-500" />
              <span className="text-red-600 dark:text-red-400">{parsed.error || 'Export failed'}</span>
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
