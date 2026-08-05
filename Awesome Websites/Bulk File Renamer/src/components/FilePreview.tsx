import React, { useState, useEffect } from "react"

// Module-level cache so previews survive re-renders and aren't regenerated
const objectUrlCache: Record<string, string> = {}

interface FilePreviewProps {
  fileId: string
  originalFile: File
  extension: string
  currentName: string
}

const FilePreview = React.memo(({ fileId, originalFile, extension, currentName }: FilePreviewProps) => {
  const [preview, setPreview] = useState<string | null>(() => objectUrlCache[fileId] || null)

  useEffect(() => {
    if (objectUrlCache[fileId]) {
      setPreview(objectUrlCache[fileId])
      return
    }
    if (originalFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(originalFile)

      if (originalFile.type === "image/gif") {
        // Draw first frame onto a canvas, store as static JPEG
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          canvas.getContext("2d")?.drawImage(img, 0, 0)
          const staticUrl = canvas.toDataURL("image/jpeg", 0.7)
          URL.revokeObjectURL(url) // free the blob URL immediately
          objectUrlCache[fileId] = staticUrl
          setPreview(staticUrl)
        }
        img.src = url
      } else {
        objectUrlCache[fileId] = url
        setPreview(url)
      }
    }
  }, [fileId, originalFile])

  if (preview) {
    return <img src={preview} alt={currentName} loading="lazy" />
  }
  const ext = extension.toUpperCase().replace(".", "") || "?"
  return <div className="file-icon-large">{ext}</div>
})

export default FilePreview
