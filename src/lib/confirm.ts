import type { ReactNode } from 'react'
import { create } from 'zustand'

export interface ConfirmOptions {
  title: string
  /** What is about to happen. Show the real numbers so a typo is easy to spot. */
  body?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
}

interface ConfirmState {
  open?: ConfirmOptions & { resolve: (ok: boolean) => void }
}

export const useConfirmStore = create<ConfirmState>(() => ({}))

/** Opens the confirm popup and resolves true when the person taps the confirm button. */
export const askConfirm = (options: ConfirmOptions): Promise<boolean> =>
  new Promise((resolve) => {
    useConfirmStore.getState().open?.resolve(false)
    useConfirmStore.setState({ open: { ...options, resolve } })
  })

export const closeConfirm = (ok: boolean) => {
  const open = useConfirmStore.getState().open
  useConfirmStore.setState({ open: undefined })
  open?.resolve(ok)
}
