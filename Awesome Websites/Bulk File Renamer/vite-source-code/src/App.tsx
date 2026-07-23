import {
  useState,
  useRef,
  useMemo,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react"
import JSZip from "jszip"
import FileCard from "./components/FileCard.tsx"
import type { FileItem, SortMode, SortDirection } from "./types.ts"
import "./App.css"

function App() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortMode, setSortMode] = useState<SortMode>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [renameInput, setRenameInput] = useState("")
  const [startFrom, setStartFrom] = useState<number | "">(1)
  const [compactView, setCompactView] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  // ── Derived / memoized values ────────────────────────────────────────────
  const sortedFiles = useMemo(() => {
    const sorted = [...files]
    if (sortMode === "name") {
      sorted.sort((a, b) => {
        const na = a.currentName.toLowerCase()
        const nb = b.currentName.toLowerCase()
        return sortDirection === "asc"
          ? na.localeCompare(nb, undefined, { numeric: true, sensitivity: "base" })
          : nb.localeCompare(na, undefined, { numeric: true, sensitivity: "base" })
      })
    } else if (sortMode === "date") {
      sorted.sort((a, b) =>
        sortDirection === "asc" ? a.dateModified - b.dateModified : b.dateModified - a.dateModified,
      )
    } else if (sortMode === "custom") {
      sorted.sort((a, b) => a.order - b.order)
    }
    return sorted
  }, [files, sortMode, sortDirection])

  const renamedCount = useMemo(() => files.filter((f) => f.isRenamed).length, [files])

  // Preview uses startFrom for multi-file numbering
  const preview = useMemo(() => {
    if (selectedIds.size === 0 || !renameInput.trim()) {
      return "Select files and enter a name to see preview"
    }
    const sanitized = renameInput.replace(/[<>:"/\\|?*]/g, "")
    const sortedSelected = sortedFiles.filter((f) => selectedIds.has(f.id))
    if (selectedIds.size === 1) {
      return `${sanitized}${sortedSelected[0]?.extension ?? ""}`
    }
    const start = Math.max(1, Number(startFrom) || 1)
    const previews = sortedSelected
      .slice(0, 3)
      .map((file, idx) => `${sanitized} (${start + idx})${file.extension}`)
    if (sortedSelected.length > 3) previews.push(`... and ${sortedSelected.length - 3} more`)
    return previews.join(", ")
  }, [selectedIds, renameInput, sortedFiles, startFrom])

  const handleFileUpload = useCallback((fileList: FileList | null) => {
    if (!fileList) return

    setFiles((prev) => {
      const newFiles: FileItem[] = Array.from(fileList).map((file, index) => {
        const nameParts = file.name.split(".")
        const extension = nameParts.length > 1 ? "." + nameParts.pop() : ""
        return {
          id: `file-${Date.now()}-${index}`,
          originalFile: file,
          originalName: file.name,
          currentName: file.name,
          nameWithoutExt: nameParts.join("."),
          extension,
          size: file.size,
          dateModified: file.lastModified,
          isRenamed: false,
          order: prev.length + index,
        }
      })
      return [...prev, ...newFiles]
    })
  }, [])

  const handleSort = useCallback(
    (mode: SortMode) => {
      if (sortMode === mode) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
      } else {
        setSortMode(mode)
        setSortDirection(mode === "date" ? "desc" : "asc")
      }
    },
    [sortMode],
  )

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        if (next.size === 1) {
          setFiles((fs) => {
            const file = fs.find((f) => f.id === id)
            if (file) setRenameInput((r) => (r.trim() ? r : file.nameWithoutExt))
            return fs
          })
        }
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setFiles((fs) => {
      setSelectedIds(new Set(fs.map((f) => f.id)))
      setRenameInput((r) => (fs.length > 0 && !r.trim() ? fs[0].nameWithoutExt : r))
      return fs
    })
  }, [])

  const deselectAll = useCallback(() => setSelectedIds(new Set()), [])

  const handleRename = useCallback(() => {
    setFiles((prevFiles) => {
      if (!renameInput.trim() || selectedIds.size === 0) return prevFiles
      const sanitized = renameInput.replace(/[<>:"/\\|?*]/g, "")
      const start = Math.max(1, Number(startFrom) || 1)

      const sorted = [...prevFiles]
      if (sortMode === "name") {
        sorted.sort((a, b) =>
          sortDirection === "asc"
            ? a.currentName
                .toLowerCase()
                .localeCompare(b.currentName.toLowerCase(), undefined, { numeric: true, sensitivity: "base" })
            : b.currentName.toLowerCase().localeCompare(a.currentName.toLowerCase(), undefined, {
                numeric: true,
                sensitivity: "base",
              }),
        )
      } else if (sortMode === "date") {
        sorted.sort((a, b) =>
          sortDirection === "asc" ? a.dateModified - b.dateModified : b.dateModified - a.dateModified,
        )
      } else {
        sorted.sort((a, b) => a.order - b.order)
      }
      const sortedSelected = sorted.filter((f) => selectedIds.has(f.id))
      return prevFiles.map((file) => {
        const selectedIndex = sortedSelected.findIndex((f) => f.id === file.id)
        if (selectedIndex === -1) return file
        // Single file: no number suffix; multiple: use start + index
        const newName =
          selectedIds.size === 1
            ? `${sanitized}${file.extension}`
            : `${sanitized} (${start + selectedIndex})${file.extension}`
        return {
          ...file,
          currentName: newName,
          nameWithoutExt: selectedIds.size === 1 ? sanitized : `${sanitized} (${start + selectedIndex})`,
          isRenamed: true,
        }
      })
    })
    setRenameInput("")
  }, [renameInput, selectedIds, sortMode, sortDirection, startFrom])

  const moveFile = useCallback((id: string, direction: "left" | "right") => {
    setSortMode("custom")
    setFiles((prevFiles) => {
      const sorted = [...prevFiles].sort((a, b) => a.order - b.order)
      const index = sorted.findIndex((f) => f.id === id)
      if (index === -1) return prevFiles
      const newIndex = direction === "left" ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= sorted.length) return prevFiles
      ;[sorted[index], sorted[newIndex]] = [sorted[newIndex], sorted[index]]
      return sorted.map((file, idx) => ({ ...file, order: idx }))
    })
  }, [])

  const moveToIndex = useCallback(
    (targetIndex: number) => {
      if (selectedIds.size === 0) return
      setSortMode("custom")
      setFiles((prevFiles) => {
        const sorted = [...prevFiles].sort((a, b) => a.order - b.order)
        const selectedFiles = sorted.filter((f) => selectedIds.has(f.id))
        const unselectedFiles = sorted.filter((f) => !selectedIds.has(f.id))
        const clampedIndex = Math.max(0, Math.min(targetIndex - 1, sorted.length - selectedFiles.length))
        const reordered = [
          ...unselectedFiles.slice(0, clampedIndex),
          ...selectedFiles,
          ...unselectedFiles.slice(clampedIndex),
        ]
        return reordered.map((file, idx) => ({ ...file, order: idx }))
      })
    },
    [selectedIds],
  )

  const downloadSelected = useCallback(async () => {
    const selectedFiles = files.filter((f) => selectedIds.has(f.id))
    if (selectedFiles.length === 0) return
    const zip = new JSZip()
    selectedFiles.forEach((file) => zip.file(file.currentName, file.originalFile))
    const content = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(content)
    const a = document.createElement("a")
    a.href = url
    a.download = `renamed-files-${Date.now()}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }, [files, selectedIds])

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="app-container">
      <header>
        <div className="header-title">
          <h1>File Renamer</h1>
          <p className="subtitle">Batch rename files with precision and ease</p>
        </div>
        <div className="upload-buttons">
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
            📄 Select Files
          </button>
          <button className="btn btn-secondary" onClick={() => folderInputRef.current?.click()}>
            📂 Select Folder
          </button>
        </div>
      </header>

      <input ref={fileInputRef} type="file" multiple onChange={(e) => handleFileUpload(e.target.files)} />

      <input
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
        multiple
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {files.length > 0 && (
        <>
          <div className="controls">
            <div className="controls-group">
              <span style={{ color: "var(--text-secondary)" }}>Sort:</span>
              <button className="btn btn-secondary" onClick={() => handleSort("name")}>
                Name {sortMode === "name" && (sortDirection === "asc" ? "↑" : "↓")}
              </button>
              <button className="btn btn-secondary" onClick={() => handleSort("date")}>
                Date {sortMode === "date" && (sortDirection === "asc" ? "↑" : "↓")}
              </button>
              <span className={`sort-badge ${sortMode === "custom" ? "active" : ""}`}>
                {sortMode === "custom" ? "✓ Custom Order" : "Custom"}
              </span>
            </div>

            <div className="controls-group">
              <button className="btn btn-secondary" onClick={selectAll}>
                Select All
              </button>
              <button className="btn btn-secondary" onClick={deselectAll}>
                Deselect All
              </button>
              <button className="btn btn-secondary" onClick={() => setCompactView((v) => !v)}>
                {compactView ? "⊟ Compact" : "⊞ Normal"} View
              </button>
            </div>

            <div className="stats">
              <div className="stat">
                <div className="stat-label">Total:</div>
                <div className="stat-value">{files.length}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Selected:</div>
                <div className="stat-value">{selectedIds.size}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Renamed:</div>
                <div className="stat-value">{renamedCount}</div>
              </div>
            </div>
          </div>

          <div
            className="file-list"
            style={{
              gridTemplateColumns: compactView
                ? "repeat(auto-fill, minmax(120px, 1fr))"
                : "repeat(auto-fill, minmax(200px, 1fr))",
            }}
          >
            {sortedFiles.map((file, index) => (
              <FileCard
                key={file.id}
                file={file}
                index={index}
                isSelected={selectedIds.has(file.id)}
                isLast={index === sortedFiles.length - 1}
                compactView={compactView}
                onToggle={toggleSelection}
                onMove={moveFile}
              />
            ))}
          </div>

          <div className="rename-section-spacer"></div>

          <div className="rename-section">
            <div className="rename-section-inner">
              <h3>Rename</h3>

              <div className="rename-input-group">
                <input
                  type="text"
                  className="rename-input"
                  placeholder="Enter new filename..."
                  value={renameInput}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setRenameInput(e.target.value)}
                  onKeyPress={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") handleRename()
                  }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleRename}
                  disabled={!renameInput.trim() || selectedIds.size === 0}
                  style={{ padding: "0.5rem 1rem" }}
                >
                  Rename
                </button>
              </div>

              {/* Start From input — only meaningful when renaming multiple files */}
              <div
                className="rename-input-group start-from"
                title="First number used when renaming multiple files (e.g. set to 6 to get Photo (6), Photo (7)…)"
              >
                <span className="start-from-label">Start #</span>
                <input
                  type="number"
                  className="rename-input"
                  min="1"
                  value={startFrom}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setStartFrom(e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1))
                  }
                  style={{ width: "70px", flex: "none" }}
                  title="Starting number for the incrementer"
                />
              </div>

              <div className="preview-text">
                <strong>Preview:</strong> {preview}
              </div>

              <div className="rename-input-group" style={{ minWidth: "200px", maxWidth: "200px" }}>
                <input
                  type="number"
                  className="rename-input"
                  placeholder="Move to index..."
                  min="1"
                  max={files.length}
                  onKeyPress={(e: KeyboardEvent<HTMLInputElement>) => {
                    const target = e.target as HTMLInputElement
                    if (e.key === "Enter" && target.value) {
                      moveToIndex(parseInt(target.value))
                      target.value = ""
                    }
                  }}
                  disabled={selectedIds.size === 0}
                />
                <button
                  className="btn btn-primary"
                  onClick={(e: MouseEvent<HTMLButtonElement>) => {
                    const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement | null
                    if (input?.value) {
                      moveToIndex(parseInt(input.value))
                      input.value = ""
                    }
                  }}
                  disabled={selectedIds.size === 0}
                  style={{ padding: "0.5rem 1rem" }}
                  title="Move selected files to this position"
                >
                  Move
                </button>
              </div>

              <button
                className="btn btn-primary"
                onClick={downloadSelected}
                disabled={selectedIds.size === 0}
                style={{ padding: "0.5rem 1rem", whiteSpace: "nowrap" }}
              >
                📦 Download Selected ({selectedIds.size})
              </button>
            </div>
          </div>
        </>
      )}

      {files.length === 0 && (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
            <polyline points="13 2 13 9 20 9"></polyline>
          </svg>
          <h3>No files uploaded yet</h3>
          <p>Upload files or folders to get started</p>
        </div>
      )}
    </div>
  )
}

export default App
