import React, { useRef } from 'react'
import { Plus, Trash2, Sparkles, Cpu } from 'lucide-react'
import { VOICES } from '../lib/voices.js'

export function Header({
  stories,
  currentStory,
  onSelectStory,
  onUploadClick,
  onDeleteStory,
  selectedVoice,
  onSelectVoice,
  selectedEngine,
  onSelectEngine,
  fileInputRef,
  onFileChange,
}) {
  // Group voices by "accent gender"
  const voiceGroups = React.useMemo(() => {
    const groups = new Map()
    for (const v of VOICES) {
      const key = `${v.accent} ${v.gender}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(v)
    }
    return Array.from(groups.entries())
  }, [])

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo-badge">
          <img src="/Favicon.png" alt="Fiery Passages Logo" />
        </div>
        <div className="header-title-wrap">
          <h1>Fiery Passages</h1>
          <span className="version-badge">v1.1</span>
        </div>
      </div>

      <div className="header-right">
        {/* Story Selector */}
        <select
          id="storySelect"
          className="ctrl-select"
          aria-label="Select Story"
          value={currentStory?.id || ''}
          onChange={(e) => onSelectStory(e.target.value)}
        >
          {!stories.length ? (
            <option value="" disabled>No stories yet</option>
          ) : null}
          {stories.map((s) => (
            <option key={s.id} value={s.id} title={s.description || ''}>
              {s.title}
            </option>
          ))}
        </select>

        {/* Add Stories Button */}
        <button
          id="uploadBtn"
          className="btn btn-primary"
          title="Add story .txt files"
          onClick={onUploadClick}
        >
          <Plus size={16} />
          <span>Add stories</span>
        </button>

        {/* Delete Story Button */}
        <button
          id="deleteBtn"
          className="btn btn-danger btn-icon"
          title="Delete this story and its saved audio"
          disabled={!currentStory}
          onClick={onDeleteStory}
        >
          <Trash2 size={16} />
        </button>

        {/* Voice Selector */}
        <select
          id="voiceSelect"
          className="ctrl-select"
          aria-label="Voice"
          value={selectedVoice}
          onChange={(e) => onSelectVoice(e.target.value)}
        >
          {voiceGroups.map(([groupLabel, groupVoices]) => (
            <optgroup key={groupLabel} label={groupLabel}>
              {groupVoices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.trait ? v.trait : ''} ({v.grade})
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Engine Selector */}
        <select
          id="engineSelect"
          className="ctrl-select"
          aria-label="Speech engine"
          title="Where the voice model runs"
          value={selectedEngine}
          onChange={(e) => onSelectEngine(e.target.value)}
        >
          <option value="wasm">CPU · 86 MB model</option>
          <option value="webgpu">GPU (WebGPU) · 326 MB model</option>
        </select>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          id="fileInput"
          accept=".txt,text/plain"
          multiple
          hidden
          onChange={onFileChange}
        />
      </div>
    </header>
  )
}
