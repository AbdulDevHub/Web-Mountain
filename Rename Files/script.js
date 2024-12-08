document.getElementById("fileInput").addEventListener("change", processFiles)
document.getElementById('clearButton').addEventListener('click', clearAll);

function processFiles() {
  const input = document.getElementById("fileInput")
  const resultDiv = document.getElementById("result")
  resultDiv.innerHTML = "" // Clear previous results

  if (input.files.length === 0) {
    resultDiv.innerHTML = "Please select some files."
    return
  }

  Array.from(input.files).forEach((file) => {
    let fileName = file.name

    // Remove the file extension
    fileName = fileName.replace(/\.[^/.]+$/, "")

    // Remove specified substrings
    const patterns = [
      /-720p/,
      /-480p/,
      /-360p/,
      /-v1x/,
      /-v1u/,
      /-v2x/,
      /-v2u/,
      /h1x/,
      /h1u/,
      /h2x/,
      /h2u/,
    ]
    patterns.forEach((pattern) => {
      fileName = fileName.replace(pattern, "")
    })

    // Replace remaining dashes with spaces
    fileName = fileName.replace(/-/g, " ")

    // Capitalize the first letter of each word
    fileName = fileName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")

    // Create a clickable element for the formatted name
    const p = document.createElement("p")
    p.textContent = fileName
    p.onclick = () => {
      copyToClipboard(fileName)
      p.style.backgroundColor = "#f3c669" // Change background color on copy
    }
    resultDiv.appendChild(p)
  })
}

function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => showToast(`Copied: ${text}`))
    .catch((err) => showToast("Failed to copy text."))
}

function showToast(message) {
  const toast = document.getElementById("toast")
  toast.textContent = message
  toast.style.opacity = 1
  setTimeout(() => {
    toast.style.opacity = 0
  }, 2000) // Toast duration
}

function clearAll() {
    document.getElementById('result').innerHTML = '';  // Clear the displayed names
}