export interface FileItem {
  id: string
  originalFile: File
  originalName: string
  currentName: string
  nameWithoutExt: string
  extension: string
  size: number
  dateModified: number
  isRenamed: boolean
  order: number
}

export type SortMode = "name" | "date" | "custom"
export type SortDirection = "asc" | "desc"
