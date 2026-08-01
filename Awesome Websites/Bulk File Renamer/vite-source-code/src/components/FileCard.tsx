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
  onClick: (id: string, index: number, event: React.MouseEvent) => void
  onMove: (id: string, direction: "left" | "right") => void
}

const FileCard = React.memo(
  ({ file, index, isSelected, isFocused, isLast, compactView, onClick, onMove }: FileCardProps) => (
    <div
      className={`file-card ${isSelected ? "selected" : ""} ${isFocused ? "focused" : ""} ${
        compactView ? "compact" : ""
      }`}
      tabIndex={0}
      data-index={index}
      onClick={(e) => onClick(file.id, index, e)}
    >
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
