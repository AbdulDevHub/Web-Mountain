import React from "react"
import FilePreview from "./FilePreview.tsx"
import type { FileItem } from "../types.ts"

interface FileCardProps {
  file: FileItem
  index: number
  isSelected: boolean
  isFocused: boolean
  isLast: boolean
  compactView: boolean
  isDragging: boolean
  dropIndicator: "before" | "after" | null
  onClick: (id: string, index: number, event: React.MouseEvent) => void
  onMove: (id: string, direction: "left" | "right") => void
  onDragStart: (id: string, event: React.DragEvent) => void
  onDragOver: (id: string, event: React.DragEvent) => void
  onDragLeave: (id: string, event: React.DragEvent) => void
  onDrop: (id: string, event: React.DragEvent) => void
  onDragEnd: () => void
}

const FileCard = React.memo(
  ({
    file,
    index,
    isSelected,
    isFocused,
    isLast,
    compactView,
    isDragging,
    dropIndicator,
    onClick,
    onMove,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
  }: FileCardProps) => (
    <div
      className={`file-card ${isSelected ? "selected" : ""} ${isFocused ? "focused" : ""} ${
        compactView ? "compact" : ""
      } ${isDragging ? "is-dragging" : ""} ${dropIndicator ? `drop-target-${dropIndicator}` : ""}`}
      tabIndex={0}
      data-index={index}
      draggable={true}
      onClick={(e) => onClick(file.id, index, e)}
      onDragStart={(e) => onDragStart(file.id, e)}
      onDragOver={(e) => onDragOver(file.id, e)}
      onDragLeave={(e) => onDragLeave(file.id, e)}
      onDrop={(e) => onDrop(file.id, e)}
      onDragEnd={onDragEnd}
    >
      {dropIndicator === "before" && <div className="drop-indicator drop-indicator-left" />}
      {dropIndicator === "after" && <div className="drop-indicator drop-indicator-right" />}

      <div className="file-card-preview">
        <input
          type="checkbox"
          className="checkbox file-card-checkbox"
          checked={isSelected}
          onClick={(e) => {
            e.stopPropagation()
            onClick(file.id, index, e)
          }}
          onChange={() => {}}
        />
        <div className="file-card-index">{index + 1}</div>
        <FilePreview
          fileId={file.id}
          originalFile={file.originalFile}
          extension={file.extension}
          currentName={file.currentName}
        />
      </div>
      <div className="file-card-info">
        <div className={`file-card-name ${file.isRenamed ? "renamed" : ""}`}>{file.currentName}</div>
        <div className="file-card-actions">
          <div className="arrow-btns">
            <button
              className="arrow-btn"
              onClick={(e) => {
                e.stopPropagation()
                onMove(file.id, "left")
              }}
              disabled={index === 0}
              title="Move left"
            >
              ←
            </button>
            <button
              className="arrow-btn"
              onClick={(e) => {
                e.stopPropagation()
                onMove(file.id, "right")
              }}
              disabled={isLast}
              title="Move right"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  ),
)

export default FileCard

