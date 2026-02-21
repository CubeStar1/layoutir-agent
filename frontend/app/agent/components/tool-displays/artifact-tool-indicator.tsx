'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { FileText, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ArtifactToolIndicatorProps {
  title?: string
  displayType?: string
  state: string
  onOpen?: () => void
}

function ArtifactToolIndicatorInternal({
  title,
  displayType,
  state,
  onOpen,
}: ArtifactToolIndicatorProps) {
  const isLoading = state === 'partial' || state === 'call'
  const isComplete = state === 'result'

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="my-1"
    >
      <button
        onClick={onOpen}
        disabled={!onOpen || isLoading}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all w-full text-left',
          'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20',
          'hover:from-emerald-500/15 hover:to-teal-500/15 hover:border-emerald-500/30',
          isLoading && 'animate-pulse',
        )}
      >
        <div className="rounded-md bg-emerald-500/15 p-1.5">
          <FileText className="size-3.5 text-emerald-500" />
        </div>

        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-xs font-medium text-foreground truncate">
            {title || 'Artifact'}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {displayType || 'document'} artifact
          </span>
        </div>

        {isComplete && onOpen && (
          <ExternalLink className="size-3.5 text-muted-foreground shrink-0" />
        )}

        {isLoading && (
          <motion.div
            className="size-2 rounded-full bg-emerald-500 shrink-0"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </button>
    </motion.div>
  )
}

export const ArtifactToolIndicator = memo(ArtifactToolIndicatorInternal)
