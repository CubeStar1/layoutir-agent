'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Maximize2, Minimize2 } from 'lucide-react'
import { useState } from 'react'
import { useAgentStore } from '../store/agent-store'

export function ArtifactPanel() {
  const [isExpanded, setIsExpanded] = useState(false)

  const artifact = useAgentStore((state) => state.artifactState)
  const onClose = useAgentStore((state) => state.handleArtifactClose)

  return (
    <AnimatePresence mode="wait">
      {artifact.isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.98 }}
          transition={{
            duration: 0.35,
            ease: [0.32, 0.72, 0, 1],
            opacity: { duration: 0.25 },
          }}
          className="flex h-full flex-col overflow-hidden bg-background"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-2.5 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 15 }}
                className="size-2 rounded-full bg-emerald-500 shrink-0"
              />
              <motion.span
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="text-sm font-medium truncate"
              >
                {artifact.title || 'Artifact'}
              </motion.span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground uppercase tracking-wider shrink-0"
              >
                {artifact.displayType}
              </motion.span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title={isExpanded ? 'Minimize' : 'Maximize'}
              >
                {isExpanded ? (
                  <Minimize2 className="size-3.5" />
                ) : (
                  <Maximize2 className="size-3.5" />
                )}
              </button>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Close artifact"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="flex-1 overflow-hidden"
          >
            {/* The key prop ensures React completely unmounts and remounts the UI when a new one is passed */}
            <div key={artifact.identifier || Date.now()} className="h-full w-full">
              {artifact.ui}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
