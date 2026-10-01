import React from 'react'

export function Toast({ message }) {
  if (!message) return null

  return (
    <div id="toast" className="toast" role="status">
      {message}
    </div>
  )
}
