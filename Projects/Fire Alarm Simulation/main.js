var Alarm = document.getElementById("alarm")
var startButton = document.getElementById("start")
var stopButton = document.getElementById("stop")
var countdownElement = document.getElementById("countdown")
var AlarmTimeout
var countdownInterval
var AlarmCountdown

// Get the body element
var body = document.getElementsByTagName("body")[0]

startButton.addEventListener("click", function () {
  var min = 20
  var max = 30
  var Minutes = Math.floor(Math.random() * (max - min + 1)) + min
  var milliseconds = Minutes * 60 * 1000
  var seconds = Minutes * 60

  startButton.disabled = true
  stopButton.disabled = false

  countdownElement.textContent =
    "Time Until Alarm: " + Minutes + " Minute(s) " + "0 Second(s)"

  countdownInterval = setInterval(function () {
    seconds -= 1
    var displayMinutes = Math.floor(seconds / 60)
    var displaySeconds = seconds % 60
    countdownElement.textContent =
      "Time Until Alarm: " +
      displayMinutes +
      " Minute(s) " +
      displaySeconds +
      " Second(s)"
  }, 1000)

  AlarmTimeout = setTimeout(function () {
    Alarm.play()
    clearInterval(countdownInterval)
    countdownElement.textContent = "Alarm is ringing!"

    // Start flashing background
    body.classList.add("flashing")

    var AlarmSeconds = 4 * 60
    countdownElement.textContent =
      "Time Until Fire Fighter's Called: " +
      Math.floor(AlarmSeconds / 60) +
      " Minute(s) " +
      (AlarmSeconds % 60) +
      " Second(s)"

    AlarmCountdown = setInterval(function () {
      AlarmSeconds -= 1
      if (AlarmSeconds >= 0) {
        countdownElement.textContent =
          "Time Until Fire Fighter's Called: " +
          Math.floor(AlarmSeconds / 60) +
          " Minute(s) " +
          (AlarmSeconds % 60) +
          " Second(s)"
      } else {
        countdownElement.textContent = "Fire Fighters Called!!!!"
        clearInterval(AlarmCountdown)
      }
    }, 1000)
  }, milliseconds)
})

stopButton.addEventListener("click", function () {
  clearTimeout(AlarmTimeout)
  clearInterval(countdownInterval)
  clearInterval(AlarmCountdown)
  Alarm.pause()
  Alarm.currentTime = 0
  countdownElement.textContent = ""
  startButton.disabled = false // Enable the start button
  stopButton.disabled = true // Disable the stop button
  // Stop flashing background
  body.classList.remove("flashing")
})
