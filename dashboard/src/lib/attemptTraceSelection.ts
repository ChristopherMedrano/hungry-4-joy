export type AttemptTraceModalSource = 'lookup' | 'selection'

export interface AttemptTraceModalState {
  isOpen: boolean
  source: AttemptTraceModalSource
}

export const closedAttemptTraceModal: AttemptTraceModalState = {
  isOpen: false,
  source: 'selection',
}

export function openAttemptTraceFromLookup(): AttemptTraceModalState {
  return { isOpen: true, source: 'lookup' }
}

export function openAttemptTraceFromSelection(): AttemptTraceModalState {
  return { isOpen: true, source: 'selection' }
}

export function closeAttemptTraceModal(): AttemptTraceModalState {
  return closedAttemptTraceModal
}

export function shouldAutoLoadAttemptTrace(
  modal: AttemptTraceModalState,
  activeAttemptId: string | null,
): boolean {
  return modal.source === 'selection' && modal.isOpen && activeAttemptId !== null
}
