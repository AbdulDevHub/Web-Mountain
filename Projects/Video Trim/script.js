const { createFFmpeg, fetchFile } = FFmpeg
const ffmpeg = createFFmpeg({ log: true })

// Function to format the time as HH:MM:SS:MS (milliseconds)
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0")
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0")
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")
  const ms = Math.floor((seconds % 1) * 1000)
    .toString()
    .padStart(3, "0") // Add milliseconds
  return `${h}:${m}:${s}:${ms}`
}

// Update timestamp display as the video plays
const videoPlayer = document.getElementById("videoPlayer")
const timestampDisplay = document.getElementById("timestampDisplay")

videoPlayer.addEventListener("timeupdate", () => {
  const currentTime = videoPlayer.currentTime
  timestampDisplay.innerText = `Current Time: ${formatTime(currentTime)}`
})

// Copy the current timestamp to the start time input
function copyToStart() {
  const currentTime = videoPlayer.currentTime
  document.getElementById("startTime").value = formatTime(currentTime)
}

// Copy the current timestamp to the end time input
function copyToEnd() {
  const currentTime = videoPlayer.currentTime
  document.getElementById("endTime").value = formatTime(currentTime)
}

// Convert time string in HH:MM:SS:MS format to seconds
function parseTime(timeStr) {
  const [h, m, s, ms] = timeStr.split(":").map(Number)
  // Check if any value is NaN and replace it with 0
  const hours = isNaN(h) ? 0 : h
  const minutes = isNaN(m) ? 0 : m
  const seconds = isNaN(s) ? 0 : s
  const milliseconds = isNaN(ms) ? 0 : ms

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
}

// Function to handle the video upload and display the video
function handleVideoUpload(event) {
  const file = event.target.files[0]
  const url = URL.createObjectURL(file)
  videoPlayer.src = url
}

// Attach the video upload handler
document
  .getElementById("videoUpload")
  .addEventListener("change", handleVideoUpload)

async function trimVideo() {
  const startTimeStr = document.getElementById("startTime").value
  const endTimeStr = document.getElementById("endTime").value

  const startTime = parseTime(startTimeStr)
  const endTime = parseTime(endTimeStr)

  // Ensure the start time is less than the end time
  if (endTime <= startTime) {
    alert("End time must be greater than start time.")
    return
  }

  const videoUpload = document.getElementById("videoUpload")
  const file = videoUpload.files[0]

  if (!file) {
    alert("Please upload a video first.")
    return
  }

  // Show the loader
  document.getElementById("loader").style.display = "block"

  // Hide the download link (in case it was previously displayed)
  document.getElementById("downloadLink").style.display = "none"

  try {
    if (!ffmpeg.isLoaded()) {
      console.log("Loading ffmpeg...")
      await ffmpeg.load()
      console.log("ffmpeg loaded successfully.")
    }

    console.log(
      `Trimming video from ${formatTime(startTimeStr)} to ${formatTime(
        endTimeStr
      )}`
    )

    // Load the video file into FFmpeg
    console.log("Writing the file to ffmpeg FS...")
    ffmpeg.FS("writeFile", "input.mp4", await fetchFile(file))

    // Convert the start and end times to a format FFmpeg can understand
    const startString = new Date(startTime * 1000).toISOString().substr(11, 12)
    const endString = new Date(endTime * 1000).toISOString().substr(11, 12)

    // Run FFmpeg to trim the video
    console.log("Running ffmpeg to trim the video...")
    await ffmpeg.run(
      "-i",
      "input.mp4",
      "-ss",
      startString,
      "-to",
      endString,
      "-c",
      "copy",
      "output.mp4"
    )

    // Retrieve the trimmed video
    console.log("Reading the trimmed video file from ffmpeg FS...")
    const data = ffmpeg.FS("readFile", "output.mp4")

    // Create a Blob from the trimmed video
    const trimmedBlob = new Blob([data.buffer], { type: "video/mp4" })

    // Create a URL for the trimmed video and set the download link
    const downloadLink = document.getElementById("downloadLink")
    downloadLink.href = URL.createObjectURL(trimmedBlob)
    downloadLink.style.display = "block"

    console.log("Trimmed video ready for download.")
  } catch (error) {
    console.error("Error trimming video:", error)
    alert("An error occurred while processing the video.")
  } finally {
    // Hide the loader
    document.getElementById("loader").style.display = "none"
  }
}
