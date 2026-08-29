import {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
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
  const [pivotIndex, setPivotIndex] = useState<number | null>(null)
  const [focusedIndex, setFocusedIndex] = useState<number>(0)
  const [sortMode, setSortMode] = useState<SortMode>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [renameTab, setRenameTab] = useState<"rename" | "prefix">("rename")
  const [renameInput, setRenameInput] = useState("")
  const [prefixInput, setPrefixInput] = useState("")
  const [startFrom, setStartFrom] = useState<number | "">(1)
  const [compactView, setCompactView] = useState(false)
  const [draggingIds, setDraggingIds] = useState<Set<string>>(new Set())
  const [dropTarget, setDropTarget] = useState<{ id: string; position: "before" | "after" } | null>(null)
  const [dragOverlay, setDragOverlay] = useState<{ x: number; y: number; label: string } | null>(null)

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

  // Track cursor position globally during drag to position our 100% solid drag badge
  useEffect(() => {
    if (draggingIds.size === 0) return

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (e.clientX === 0 && e.clientY === 0) return
      setDragOverlay((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null))
    }

    window.addEventListener("dragover", handleWindowDragOver)
    return () => window.removeEventListener("dragover", handleWindowDragOver)
  }, [draggingIds])

  // ── Drag & Drop Handlers ─────────────────────────────────────────────────
  const handleDragStart = useCallback(
    (id: string, e: React.DragEvent) => {
      let idsToDrag: Set<string>
      if (selectedIds.has(id)) {
        idsToDrag = new Set(selectedIds)
      } else {
        idsToDrag = new Set([id])
        setSelectedIds(idsToDrag)
      }
      setDraggingIds(idsToDrag)

      const count = idsToDrag.size
      const sampleFile = files.find((f) => f.id === id)
      const displayName = count === 1 ? sampleFile?.currentName || "File" : `${count} Files`

      // Pass a 1x1 transparent canvas to setDragImage to suppress Chrome's default faded ghost
      const canvas = document.createElement("canvas")
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext("2d")
      if (ctx) ctx.clearRect(0, 0, 1, 1)

      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", id)
        e.dataTransfer.setDragImage(canvas, 0, 0)
      }

      setDragOverlay({
        x: e.clientX,
        y: e.clientY,
        label: displayName,
      })
    },
    [selectedIds, files],
  )

  const handleDragOver = useCallback(
    (id: string, e: React.DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move"
      }

      if (draggingIds.has(id)) {
        setDropTarget((prev) => (prev !== null ? null : prev))
        return
      }

      const cardElement = e.currentTarget as HTMLElement
      const rect = cardElement.getBoundingClientRect()
      const midX = rect.left + rect.width / 2
      const position: "before" | "after" = e.clientX < midX ? "before" : "after"

      setDropTarget((prev) => {
        if (prev && prev.id === id && prev.position === position) return prev
        return { id, position }
      })
    },
    [draggingIds],
  )

  const handleDragLeave = useCallback((id: string, e: React.DragEvent) => {
    const related = e.relatedTarget as Node | null
    if (e.currentTarget.contains(related)) return
    setDropTarget((prev) => (prev?.id === id ? null : prev))
  }, [])

  const handleDrop = useCallback(
    (targetId: string, e: React.DragEvent) => {
      e.preventDefault()
      if (draggingIds.size === 0 || !dropTarget) return

      const position = dropTarget.position

      setFiles(() => {
        // Base reordering on current visible list (sortedFiles)
        const currentList = [...sortedFiles]
        const draggedFiles = currentList.filter((f) => draggingIds.has(f.id))
        const unselectedFiles = currentList.filter((f) => !draggingIds.has(f.id))

        let targetIndex = unselectedFiles.findIndex((f) => f.id === targetId)
        if (targetIndex === -1) {
          targetIndex = unselectedFiles.length
        } else if (position === "after") {
          targetIndex += 1
        }

        const reordered = [
          ...unselectedFiles.slice(0, targetIndex),
          ...draggedFiles,
          ...unselectedFiles.slice(targetIndex),
        ]

        return reordered.map((file, idx) => ({ ...file, order: idx }))
      })

      setSortMode("custom")
      setDraggingIds(new Set())
      setDropTarget(null)
      setDragOverlay(null)
    },
    [draggingIds, dropTarget, sortedFiles],
  )

  const handleDragEnd = useCallback(() => {
    setDraggingIds(new Set())
    setDropTarget(null)
    setDragOverlay(null)
  }, [])

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

  // Preview for the "append prefix" action
  const prefixPreview = useMemo(() => {
    if (selectedIds.size === 0 || !prefixInput.trim()) {
      return "Select files and enter a prefix to see preview"
    }
    const sortedSelected = sortedFiles.filter((f) => selectedIds.has(f.id))
    const previews = sortedSelected.slice(0, 3).map((file) => `${prefixInput}${file.currentName}`)
    if (sortedSelected.length > 3) previews.push(`... and ${sortedSelected.length - 3} more`)
    return previews.join(", ")
  }, [selectedIds, prefixInput, sortedFiles])

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

  const handleCardClick = useCallback(
    (id: string, index: number, e: React.MouseEvent) => {
      setFocusedIndex(index)

      if (e.shiftKey && sortedFiles.length > 0) {
        const anchor = pivotIndex !== null ? pivotIndex : focusedIndex
        const start = Math.min(anchor, index)
        const end = Math.max(anchor, index)
        const rangeIds = sortedFiles.slice(start, end + 1).map((f) => f.id)

        setSelectedIds((prev) => {
          const next = new Set(prev)
          rangeIds.forEach((rid) => next.add(rid))
          return next
        })
      } else if (e.metaKey || e.ctrlKey) {
        setPivotIndex(index)
        setSelectedIds((prev) => {
          const next = new Set(prev)
          if (next.has(id)) {
            next.delete(id)
          } else {
            next.add(id)
          }
          return next
        })
      } else {
        setPivotIndex(index)
        setSelectedIds((prev) => {
          const next = new Set(prev)
          if (next.has(id)) {
            next.delete(id)
          } else {
            next.add(id)
            if (next.size === 1) {
              const file = files.find((f) => f.id === id)
              if (file) setRenameInput((r) => (r.trim() ? r : file.nameWithoutExt))
            }
          }
          return next
        })
      }
    },
    [sortedFiles, pivotIndex, focusedIndex, files],
  )

  const selectAll = useCallback(() => {
    if (files.length === 0) return
    setSelectedIds((prev) => {
      if (prev.size === files.length) {
        return new Set()
      } else {
        if (!renameInput.trim()) {
          setRenameInput(files[0].nameWithoutExt)
        }
        return new Set(files.map((f) => f.id))
      }
    })
  }, [files, renameInput])

  const deselectAll = useCallback(() => setSelectedIds(new Set()), [])

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      const active = document.activeElement
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          (active as HTMLElement).isContentEditable)
      ) {
        return
      }

      if (sortedFiles.length === 0) return

      const isArrowKey = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)
      const isSelectAll = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a"

      if (isSelectAll) {
        e.preventDefault()
        selectAll()
        return
      }

      if (!isArrowKey && e.key !== " ") return

      if (isArrowKey) {
        e.preventDefault()
        let nextIndex = focusedIndex

        const container = document.querySelector(".file-list")
        let columns = 1
        if (container) {
          const gridComputedStyle = window.getComputedStyle(container)
          const gridTemplateColumns = gridComputedStyle.getPropertyValue("grid-template-columns")
          if (gridTemplateColumns) {
            columns = Math.max(1, gridTemplateColumns.split(" ").filter(Boolean).length)
          }
        }

        switch (e.key) {
          case "ArrowLeft":
            nextIndex = Math.max(0, focusedIndex - 1)
            break
          case "ArrowRight":
            nextIndex = Math.min(sortedFiles.length - 1, focusedIndex + 1)
            break
          case "ArrowUp":
            nextIndex = Math.max(0, focusedIndex - columns)
            break
          case "ArrowDown":
            nextIndex = Math.min(sortedFiles.length - 1, focusedIndex + columns)
            break
          case "Home":
            nextIndex = 0
            break
          case "End":
            nextIndex = sortedFiles.length - 1
            break
        }

        setFocusedIndex(nextIndex)

        if (e.shiftKey) {
          const anchor = pivotIndex !== null ? pivotIndex : focusedIndex
          const start = Math.min(anchor, nextIndex)
          const end = Math.max(anchor, nextIndex)
          const rangeIds = sortedFiles.slice(start, end + 1).map((f) => f.id)
          setSelectedIds((prev) => {
            const next = new Set(prev)
            rangeIds.forEach((rid) => next.add(rid))
            return next
          })
        } else {
          setPivotIndex(nextIndex)
          const nextId = sortedFiles[nextIndex]?.id
          if (nextId) {
            setSelectedIds(new Set([nextId]))
          }
        }

        const el = document.querySelector(`[data-index="${nextIndex}"]`)
        if (el) {
          el.scrollIntoView({ block: "nearest", behavior: "smooth" })
        }
      } else if (e.key === " ") {
        e.preventDefault()
        const currentFile = sortedFiles[focusedIndex]
        if (currentFile) {
          setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(currentFile.id)) {
              next.delete(currentFile.id)
            } else {
              next.add(currentFile.id)
            }
            return next
          })
          setPivotIndex(focusedIndex)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [sortedFiles, focusedIndex, pivotIndex, selectAll])

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

  const handlePrefix = useCallback(() => {
    setFiles((prevFiles) => {
      if (!prefixInput.trim() || selectedIds.size === 0) return prevFiles
      const sanitized = prefixInput.replace(/[<>:"/\\|?*]/g, "")
      return prevFiles.map((file) => {
        if (!selectedIds.has(file.id)) return file
        const newNameWithoutExt = `${sanitized}${file.nameWithoutExt}`
        return {
          ...file,
          currentName: `${newNameWithoutExt}${file.extension}`,
          nameWithoutExt: newNameWithoutExt,
          isRenamed: true,
        }
      })
    })
    setPrefixInput("")
  }, [prefixInput, selectedIds])

  const moveFile = useCallback(
    (id: string, direction: "left" | "right") => {
      setFiles(() => {
        const sorted = [...sortedFiles]
        const index = sorted.findIndex((f) => f.id === id)
        if (index === -1) return sorted
        const newIndex = direction === "left" ? index - 1 : index + 1
        if (newIndex < 0 || newIndex >= sorted.length) return sorted
        ;[sorted[index], sorted[newIndex]] = [sorted[newIndex], sorted[index]]
        return sorted.map((file, idx) => ({ ...file, order: idx }))
      })
      setSortMode("custom")
    },
    [sortedFiles],
  )

  const moveToIndex = useCallback(
    (targetIndex: number) => {
      if (selectedIds.size === 0) return
      setFiles(() => {
        const sorted = [...sortedFiles]
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
      setSortMode("custom")
    },
    [selectedIds, sortedFiles],
  )

  const downloadSelected = useCallback(async () => {
    const selectedFiles = files.filter((f) => selectedIds.has(f.id))
    if (selectedFiles.length === 0) return
    const zip = new JSZip()
    selectedFiles.forEach((file) =>
      zip.file(file.currentName, file.originalFile, {
        date: new Date(file.dateModified),
      }),
    )
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
              <button
                className={`btn ${sortMode === "name" ? "btn-sort-active" : "btn-secondary"}`}
                onClick={() => handleSort("name")}
              >
                Name {sortMode === "name" && (sortDirection === "asc" ? "↑" : "↓")}
              </button>
              <button
                className={`btn ${sortMode === "date" ? "btn-sort-active" : "btn-secondary"}`}
                onClick={() => handleSort("date")}
              >
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
                isFocused={focusedIndex === index}
                isLast={index === sortedFiles.length - 1}
                compactView={compactView}
                isDragging={draggingIds.has(file.id)}
                dropIndicator={dropTarget?.id === file.id ? dropTarget.position : null}
                onClick={handleCardClick}
                onMove={moveFile}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>

          <div className="rename-section-spacer"></div>

          <div className="rename-section">
            <div className="rename-section-inner">
              {/* ── Tab switcher ─────────────────────────────── */}
              <div className="rename-tabs">
                <button
                  className={`rename-tab ${renameTab === "rename" ? "active" : ""}`}
                  onClick={() => setRenameTab("rename")}
                >
                  Rename
                </button>
                <button
                  className={`rename-tab ${renameTab === "prefix" ? "active" : ""}`}
                  onClick={() => setRenameTab("prefix")}
                >
                  Add Prefix
                </button>
              </div>

              {/* ── Active tab inputs + preview (stacked vertically) ── */}
              <div className="rename-main">
                {renameTab === "rename" ? (
                  <>
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
                      <span
                        className="start-from-label"
                        title="First number used when renaming multiple files (e.g. set to 6 to get Photo (6), Photo (7)…)"
                      >
                        Start #
                      </span>
                      <input
                        type="number"
                        className="rename-input"
                        min="1"
                        value={startFrom}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setStartFrom(e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1))
                        }
                        style={{ width: "60px", flex: "none" }}
                        title="Starting number for the incrementer"
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
                    <div className="preview-text">
                      <strong>Preview:</strong> {preview}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rename-input-group">
                      <input
                        type="text"
                        className="rename-input"
                        placeholder="Enter prefix, e.g. Food - ..."
                        value={prefixInput}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setPrefixInput(e.target.value)}
                        onKeyPress={(e: KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === "Enter") handlePrefix()
                        }}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={handlePrefix}
                        disabled={!prefixInput.trim() || selectedIds.size === 0}
                        style={{ padding: "0.5rem 1rem" }}
                      >
                        Append
                      </button>
                    </div>
                    <div className="preview-text">
                      <strong>Preview:</strong> {prefixPreview}
                    </div>
                  </>
                )}
              </div>

              {/* ── Always-visible actions ───────────────────── */}
              <div className="rename-actions">
                <div className="rename-input-group move-group">
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
                  className="btn btn-primary download-btn"
                  onClick={downloadSelected}
                  disabled={selectedIds.size === 0}
                  style={{ padding: "0.5rem 1rem", whiteSpace: "nowrap" }}
                >
                  📦 Download ({selectedIds.size})
                </button>
              </div>
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

      {dragOverlay && (
        <div
          className="custom-drag-overlay"
          style={{
            left: `${dragOverlay.x + 16}px`,
            top: `${dragOverlay.y + 16}px`,
          }}
        >
          <span className="ghost-icon">📄</span>
          <span className="ghost-text">Moving {dragOverlay.label}</span>
        </div>
      )}
    </div>
  )
}

export default App