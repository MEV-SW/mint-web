import { create } from 'zustand'

/**
 * mint-web#106 — screens with unsaved drafts register here so the admin sidebar
 * can mark them (route changes cannot be blocked with BrowserRouter).
 */
interface UnsavedState {
  dirtyPaths: string[]
  setDirty: (path: string, dirty: boolean) => void
}

export const useUnsavedStore = create<UnsavedState>((set) => ({
  dirtyPaths: [],
  setDirty: (path, dirty) =>
    set((state) => {
      const has = state.dirtyPaths.includes(path)
      if (dirty === has) return state
      return { dirtyPaths: dirty ? [...state.dirtyPaths, path] : state.dirtyPaths.filter((p) => p !== path) }
    }),
}))
