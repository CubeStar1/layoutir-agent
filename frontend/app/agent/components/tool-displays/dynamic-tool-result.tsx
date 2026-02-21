'use client'

import { memo, useState } from 'react'
import { DynamicToolUIPart, getToolName } from 'ai'
import { motion } from 'framer-motion'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Plug,
  FileText,
  Eye,
  Pencil,
  Plus,
  Trash2,
  FileOutput,
  Braces,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Shimmer } from '@/components/ai-elements/shimmer'
import { ConvertDocumentResult } from './convert-document-result'
import { ReadIrResult } from './read-ir-result'
import { GetIrJsonResult } from './get-ir-json-result'
import { EditIrBlockResult } from './edit-ir-block-result'
import { AddIrBlockResult } from './add-ir-block-result'
import { DeleteIrBlockResult } from './delete-ir-block-result'
import { ExportResult } from './export-result'

interface DynamicToolResultProps {
  part: DynamicToolUIPart
}

// LayoutIR-specific tool metadata
const LAYOUTIR_TOOLS: Record<
  string,
  { displayName: string; icon: typeof Plug; color: string }
> = {
  convert_document: {
    displayName: 'Layoutir Convert Document',
    icon: FileText,
    color: 'text-blue-500',
  },
  read_ir: {
    displayName: 'Layoutir Read Ir',
    icon: Eye,
    color: 'text-emerald-500',
  },
  get_ir_json: {
    displayName: 'Layoutir Get IR JSON',
    icon: Braces,
    color: 'text-cyan-500',
  },
  edit_ir_block: {
    displayName: 'Layoutir Edit Block',
    icon: Pencil,
    color: 'text-amber-500',
  },
  add_ir_block: {
    displayName: 'Layoutir Add Block',
    icon: Plus,
    color: 'text-green-500',
  },
  delete_ir_block: {
    displayName: 'Layoutir Delete Block',
    icon: Trash2,
    color: 'text-red-500',
  },
  export_to_latex: {
    displayName: 'Layoutir Export LaTeX',
    icon: FileOutput,
    color: 'text-purple-500',
  },
  export_to_docx: {
    displayName: 'Layoutir Export DOCX',
    icon: FileOutput,
    color: 'text-indigo-500',
  },
}

function getLayoutIRTool(toolName: string) {
  for (const [key, value] of Object.entries(LAYOUTIR_TOOLS)) {
    if (toolName.includes(key)) return { key, ...value }
  }
  return null
}

function formatToolName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}


function DynamicToolResultInternal({ part }: DynamicToolResultProps) {
  const [isOpen, setIsOpen] = useState(false)

  const isLoading = part.state === 'input-available' || part.state === 'input-streaming'
  const isCompleted = part.state === 'output-available'
  const hasError = part.state === 'output-error'

  const rawToolName = getToolName(part)
  const lirTool = getLayoutIRTool(rawToolName)
  const displayName = lirTool?.displayName || formatToolName(rawToolName)
  const IconComponent = lirTool?.icon || Plug
  const iconColor = lirTool?.color || 'text-violet-500'

  const getTextContent = (output: any): string | null => {
    if (!output) return null

    let data = output
    if (typeof output === 'string') {
      try {
        data = JSON.parse(output)
      } catch {
        return output
      }
    }

    if (data?.content && Array.isArray(data.content)) {
      const textParts = data.content
        .filter((item: any) => item.type === 'text' && item.text)
        .map((item: any) => item.text)
      if (textParts.length > 0) {
        return textParts.join('\n')
      }
    }

    return typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  }

  const outputText = isCompleted ? getTextContent(part.output) : null

  const canExpand = Boolean((isCompleted && outputText) || (isLoading && part.input))

  const renderToolResult = (toolKey: string, output: any) => {
    switch (toolKey) {
      case 'convert_document':
        return <ConvertDocumentResult data={output} />
      case 'read_ir':
        return <ReadIrResult data={output} />
      case 'get_ir_json':
        return <GetIrJsonResult data={output} />
      case 'edit_ir_block':
        return <EditIrBlockResult data={output} />
      case 'add_ir_block':
        return <AddIrBlockResult data={output} />
      case 'delete_ir_block':
        return <DeleteIrBlockResult data={output} />
      case 'export_to_latex':
        return <ExportResult data={output} format="latex" />
      case 'export_to_docx':
        return <ExportResult data={output} format="docx" />
      default:
        return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="my-1"
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild disabled={!canExpand}>
          <button
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors w-full text-left',
              'bg-muted/30 hover:bg-muted/50 border border-border/50',
              !canExpand && 'cursor-default'
            )}
          >
            <IconComponent className={cn('size-3.5 flex-shrink-0', iconColor)} />

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-muted-foreground">{displayName}</span>

              {isLoading ? (
                <Shimmer className="text-xs" duration={1.5}>
                  Running...
                </Shimmer>
              ) : hasError ? (
                <span className="text-red-500 text-xs truncate">
                  {(part as any).errorText || 'Error'}
                </span>
              ) : null}
            </div>

            <div className="flex-shrink-0">
              {isLoading ? (
                <motion.div
                  className={cn('size-2 rounded-full', lirTool ? iconColor.replace('text-', 'bg-') : 'bg-violet-500')}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              ) : hasError ? (
                <AlertCircle className="size-3.5 text-red-500" />
              ) : (
                <CheckCircle2 className="size-3.5 text-green-500" />
              )}
            </div>

            {canExpand && (
              <ChevronRight
                className={cn(
                  'size-3 text-muted-foreground transition-transform',
                  isOpen && 'rotate-90'
                )}
              />
            )}
          </button>
        </CollapsibleTrigger>

        {canExpand && (
          <CollapsibleContent>
            <div className={cn(
              'mt-1 ml-5 pl-3 border-l-2',
              lirTool ? iconColor.replace('text-', 'border-') + '/30' : 'border-violet-500/30'
            )}>
              {isLoading && part.input && (
                <div className="py-2">
                  <div className="text-xs text-muted-foreground mb-1 font-medium">Input</div>
                  <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(part.input, null, 2)}
                  </pre>
                </div>
              )}
              {isCompleted && outputText && (
                <div className="py-2">
                  <div className="text-xs text-muted-foreground mb-1 font-medium">Output</div>
                  {lirTool ? (
                    <div className="bg-muted/50 rounded p-2">
                      {renderToolResult(lirTool.key, part.output)}
                    </div>
                  ) : (
                    <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {outputText}
                    </pre>
                  )}
                </div>
              )}
              {hasError && (part as any).errorText && (
                <div className="py-2 text-xs text-red-500">{(part as any).errorText}</div>
              )}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </motion.div>
  )
}

export const DynamicToolResult = memo(DynamicToolResultInternal)
