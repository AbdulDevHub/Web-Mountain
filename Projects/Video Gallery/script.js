document.addEventListener("DOMContentLoaded", () => {
  const dropArea = document.getElementById("drop-area")
  const fileInput = document.getElementById("fileInput")
  const videoContainer = document.getElementById("video-container")

  dropArea.addEventListener("dragover", (event) => {
    event.preventDefault()
    dropArea.style.borderColor = "#888"
  })

  dropArea.addEventListener("dragleave", () => {
    dropArea.style.borderColor = "#444"
  })

  dropArea.addEventListener("drop", (event) => {
    event.preventDefault()
    dropArea.style.borderColor = "#444"
    handleFiles(event.dataTransfer.files)
  })

  fileInput.addEventListener("change", (event) => {
    handleFiles(event.target.files)
  })

  function handleFiles(files) {
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("video/")) {
        const videoWrapper = document.createElement("div")
        videoWrapper.classList.add("video-wrapper")

        const video = document.createElement("video")
        video.src = URL.createObjectURL(file)
        video.muted = true

        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        video.addEventListener("loadeddata", () => {
          const halfTime = video.duration / 2
          video.currentTime = halfTime
        })

        video.addEventListener("seeked", () => {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const thumbnail = new Image()
          thumbnail.src = canvas.toDataURL()
          videoWrapper.appendChild(thumbnail)
          videoWrapper.appendChild(document.createElement("br"))
          const videoName = document.createElement("p")
          videoName.textContent = file.name.replace(/\.[^/.]+$/, "") // Remove the file extension
          videoWrapper.appendChild(videoName)
          videoContainer.appendChild(videoWrapper)
          URL.revokeObjectURL(video.src) // Free up memory
        })

        // Start loading the video to generate the thumbnail
        video.load()
      }
    })
  }
})
