import React, { useEffect, useRef } from 'react'
import { ExternalLink, BookOpen } from 'lucide-react'
import { safeHttpUrl } from '../lib/story-parser.js'

export function StoryView({ currentStory, fontSize, onIncreaseFont, onDecreaseFont }) {
  const textContainerRef = useRef(null)

  // Scroll to top whenever the active story changes
  useEffect(() => {
    if (textContainerRef.current) {
      textContainerRef.current.scrollTop = 0
    }
  }, [currentStory?.id])

  // Remap horizontal wheel scrolling to vertical on the text container
  useEffect(() => {
    const el = textContainerRef.current
    if (!el) return

    const handleWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault()
        el.scrollTop += e.deltaX
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [currentStory])

  const safeUrl = currentStory?.url ? safeHttpUrl(currentStory.url) : null
  let hostname = ''
  if (safeUrl) {
    try {
      hostname = new URL(safeUrl).hostname
    } catch {}
  }

  return (
    <section className="panel story-panel">
      <div className="panel-header">
        <h2 id="storyTitle" className="panel-title">
          <BookOpen size={20} color="#a5b4fc" />
          <span>{currentStory ? currentStory.title : 'No story yet'}</span>
        </h2>
        <div className="font-controls">
          <button
            id="font-dec"
            className="font-btn"
            title="Decrease font size"
            onClick={onDecreaseFont}
          >
            A−
          </button>
          <button
            id="font-inc"
            className="font-btn"
            title="Increase font size"
            onClick={onIncreaseFont}
          >
            A+
          </button>
        </div>
      </div>

      {currentStory ? (
        <>
          {(currentStory.description || safeUrl) && (
            <div id="storyMeta" className="story-meta">
              {currentStory.description && <p id="storyDesc">{currentStory.description}</p>}
              {safeUrl && (
                <a
                  id="storyLink"
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Source: {hostname || safeUrl}</span>
                  <ExternalLink size={13} />
                </a>
              )}
            </div>
          )}

          <div
            ref={textContainerRef}
            id="storyText"
            className="text-container"
            style={{ fontSize: `${fontSize}rem` }}
          >
            {currentStory.text}
          </div>
        </>
      ) : (
        <div id="emptyState" className="text-container empty-state">
          <h3>Add your first story</h3>
          <p>
            Click <strong>＋ Add stories</strong> in the top bar or drop <code>.txt</code> files anywhere on this
            window. Each file can optionally include header metadata:
          </p>
          <pre>{`Title: Batteries Not Included
Description: I hate it when the batteries die.
==================================================

Story text here onwards…`}</pre>
          <p>
            Description header is optional. Audio is generated on your device with Kokoro the
            first time you press play, then cached locally for instant future replay.
          </p>
        </div>
      )}
    </section>
  )
}
