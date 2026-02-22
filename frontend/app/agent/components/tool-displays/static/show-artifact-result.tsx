import { memo, useEffect, useRef } from 'react'
import { useArtifact } from '@/app/agent/hooks/use-artifact';
import { useAgentStore } from '@/app/agent/store/agent-store';
import { Code, FileText } from 'lucide-react'

export function ShowArtifactAutoOpen({ args, state }: { args: any; state: string }) {
  const { showArtifact } = useArtifact()
  const hasAutoOpened = useRef(false)

  useEffect(() => {
    if (state === 'result' || state === 'output-available') {
      if (!args || hasAutoOpened.current) return
      
      const { title, type, identifier, content } = args
      hasAutoOpened.current = true

      showArtifact(
        null, 
        {
          title,
          displayType: type,
          identifier,
          content
        }
      )
    }
  }, [showArtifact, state, args])

  return null
}

interface ShowArtifactResultProps {
  args: any
  state: string
}

function ShowArtifactResultInternal({ args, state }: ShowArtifactResultProps) {
  const { showArtifact, closeArtifact, isOpen } = useArtifact()
  const currentIdentifier = useAgentStore((storeState) => storeState.artifactState.identifier)

  if (state !== 'result' && state !== 'output-available') {
    return null
  }
  if (!args) return null

  const isCode = args.type === 'code'
  const Icon = isCode ? Code : FileText

  const formattedType = args.type ? args.type.charAt(0).toUpperCase() + args.type.slice(1) : 'Artifact'
  const isThisArtifactOpen = isOpen && currentIdentifier === args.identifier

  const toggleArtifact = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isThisArtifactOpen) {
      closeArtifact()
    } else {
      showArtifact(null, {
        title: args.title,
        displayType: args.type,
        identifier: args.identifier,
        content: args.content
      })
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border p-3 bg-secondary/10 hover:bg-secondary/20 transition-colors w-full">
      <div className="flex h-12 w-10 flex-shrink-0 items-center justify-center rounded-md bg-secondary/50 text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      
      <div className="flex flex-1 flex-col truncate">
        <span className="text-sm font-medium text-foreground truncate">
          {args.title || 'Untitled'}
        </span>
        <span className="text-xs text-muted-foreground mt-0.5">
          {formattedType}
        </span>
      </div>
      
      <button
        onClick={toggleArtifact}
        className="flex h-8 items-center justify-center rounded-md border border-border bg-background px-4 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring flex-shrink-0 shadow-sm"
      >
        {isThisArtifactOpen ? 'Close' : 'Open'}
      </button>
    </div>
  )
}

export const ShowArtifactResult = memo(ShowArtifactResultInternal)
