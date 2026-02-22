import { useAgentStore } from '../store/agent-store'
import type { ReactNode } from 'react'
import type { ArtifactDisplayType } from '../types'

export function useArtifact() {
  const setArtifactUI = useAgentStore((state) => state.setArtifactUI)
  const closeArtifact = useAgentStore((state) => state.handleArtifactClose)
  const isOpen = useAgentStore((state) => state.artifactState.isOpen)

  const showArtifact = (
    ui: ReactNode,
    options?: {
      title?: string
      displayType?: ArtifactDisplayType
      identifier?: string
      content?: string
    }
  ) => {
    setArtifactUI(ui, options?.title, options?.displayType, options?.identifier, options?.content)
  }

  return {
    showArtifact,
    closeArtifact,
    isOpen,
  }
}
