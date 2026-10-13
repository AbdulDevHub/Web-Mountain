import React from 'react'
import { UploadCloud } from 'lucide-react'

export function DropOverlay({ isVisible }) {
  if (!isVisible) return null

  return (
    <div id="dropOverlay" className="drop-overlay">
      <UploadCloud size={48} color="#818cf8" />
      <div>Drop .txt story files or audio (.wav, .mp3) to add them</div>
    </div>
  )
}
