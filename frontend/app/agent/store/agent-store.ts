import { create } from 'zustand'
import { UIMessage } from 'ai'
import type { ArtifactState, DocumentState } from '../types'

interface AgentStoreState {
  // State
  documentState: DocumentState
  artifactState: ArtifactState
  initializedId?: string

  // Actions
  initializeFromMessages: (id: string, messages: UIMessage[]) => void
  handleFileUploaded: (documentUrl: string, documentName: string) => void
  handleIRUpdate: (irJson: string, documentId?: string) => void
  handleStatusChange: (isWorking: boolean) => void
  handleArtifactUpdate: (artifact: Partial<ArtifactState>) => void
  handleArtifactClose: () => void
  handleArtifactReopen: (irJson?: string) => void
}

export const useAgentStore = create<AgentStoreState>((set) => ({
  documentState: {},
  artifactState: {
    isOpen: false,
    displayType: 'document',
  },
  initializedId: undefined,

  initializeFromMessages: (id: string, messages: UIMessage[]) => {
    set((state) => {
      // Only initialize once per chat ID to avoid resetting user state during the same session
      if (state.initializedId === id) return state;

      console.log(`initializeFromMessages switching to chat ${id}, loading from ${messages?.length || 0} messages`);

      let initialDocState: DocumentState = {}
      let shouldOpenArtifact = false

      if (!messages || messages.length === 0) {
        console.log("initializeFromMessages: empty messages array, resetting state completely");
        return { 
          initializedId: id,
          documentState: {},
          artifactState: { isOpen: false, displayType: 'document' }
        };
      }

      // 1. Scan forwards to find the document URL from user uploads
      for (const msg of messages) {
        if (msg.role === "user" && msg.parts) {
          for (const part of msg.parts) {
            if (part.type === "file" && part.url) {
              initialDocState.documentUrl = part.url
              initialDocState.documentName = part.filename || "Document"
            }
          }
        }
      }

      // 2. Scan backwards to find the latest valid IR JSON and documentId
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i]
        if (msg.role === "assistant" && msg.parts) {
          let foundIr = false
          for (const part of msg.parts) {
            if (
              part.type === "dynamic-tool" &&
              part.state === "output-available" &&
              (part.toolName.includes("get_ir_json") || part.toolName.includes("read_ir")) &&
              part.output
            ) {
              let output = part.output as any
              
              // Unwrap MCP content format if necessary
              if (output?.content && Array.isArray(output.content)) {
                const textParts = output.content
                  .filter((item: any) => item.type === "text" || item.text)
                  .map((item: any) => item.text);
                if (textParts.length > 0) {
                  const joinedText = textParts.join("");
                  console.log("Found text block of length", joinedText.length);
                  try { 
                    output = JSON.parse(joinedText); 
                    console.log("Successfully parsed get_ir_json output block");
                  } catch (e) {
                    console.error("Failed to parse get_ir_json text array into JSON", e);
                  }
                }
              } else if (typeof output === "string") {
                try { output = JSON.parse(output) } catch (e) {
                  console.error("Failed to parse get_ir_json string into JSON", e);
                }
              }

              if (output?.blocks) {
                initialDocState.irJson = typeof output === "string" ? output : JSON.stringify(output)
                if (output.document_id) {
                  initialDocState.documentId = output.document_id
                }
                foundIr = true
                break
              }
            } else if (
              part.type === "dynamic-tool" &&
              part.state === "output-available" &&
              part.toolName.includes("convert_document") &&
              part.output
            ) {
              let output = part.output as any
              
              // Unwrap MCP content format if necessary
              if (output?.content && Array.isArray(output.content)) {
                const textParts = output.content
                  .filter((item: any) => item.type === "text" || item.text)
                  .map((item: any) => item.text);
                if (textParts.length > 0) {
                  try { output = JSON.parse(textParts.join("")); } catch {}
                }
              } else if (typeof output === "string") {
                 try { output = JSON.parse(output) } catch {}
              }
              
              if (output?.document_id && !initialDocState.documentId) {
                 initialDocState.documentId = output.document_id
              }
            }
          }
          if (foundIr) {
            console.log("initializeFromMessages found IR JSON blocks");
            shouldOpenArtifact = true
            break // Found the latest IR, stop searching backwards
          }
        }
      }
      
      console.log("initializeFromMessages final state:", { initialDocState, shouldOpenArtifact });

      return {
        initializedId: id,
        documentState: initialDocState,
        artifactState: {
          isOpen: shouldOpenArtifact,
          displayType: 'document',
          identifier: initialDocState.documentId,
        }
      }
    })
  },

  handleFileUploaded: (documentUrl: string, documentName: string) => {
    set((state) => ({
      documentState: { ...state.documentState, documentUrl, documentName },
    }))
  },

  handleIRUpdate: (irJson: string, documentId?: string) => {
    set((state) => ({
      documentState: {
        ...state.documentState,
        irJson: irJson || state.documentState.irJson,
        documentId: documentId || state.documentState.documentId,
      },
    }))
  },

  handleStatusChange: (isWorking: boolean) => {
    set((state) => ({
      documentState: {
        ...state.documentState,
        isAgentWorking: isWorking,
      },
    }))
  },

  handleArtifactUpdate: (artifact: Partial<ArtifactState>) => {
    set((state) => ({
      artifactState: {
        ...state.artifactState,
        ...artifact,
        isOpen: true,
      },
    }))
  },

  handleArtifactClose: () => {
    set((state) => ({
      artifactState: {
        ...state.artifactState,
        isOpen: false,
      },
    }))
  },

  handleArtifactReopen: (irJson?: string) => {
    set((state) => {
      const updates: Partial<AgentStoreState> = {
        artifactState: {
          ...state.artifactState,
          isOpen: true,
        },
      }
      if (irJson) {
        updates.documentState = {
          ...state.documentState,
          irJson,
        }
      }
      return updates
    })
  },
}))
