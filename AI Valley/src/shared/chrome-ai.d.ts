// Minimal types for Chrome's built-in AI APIs (Chrome 138+ desktop).
// https://developer.chrome.com/docs/ai/translator-api
// https://developer.chrome.com/docs/ai/language-detection

type AIAvailability = "unavailable" | "downloadable" | "downloading" | "available"

interface AIDownloadMonitor extends EventTarget {
  addEventListener(type: "downloadprogress", listener: (e: ProgressEvent) => void): void
}

interface AICreateOptions {
  monitor?: (m: AIDownloadMonitor) => void
  signal?: AbortSignal
}

interface TranslatorInstance {
  translate(text: string): Promise<string>
  destroy(): void
}

declare const Translator: {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<AIAvailability>
  create(options: { sourceLanguage: string; targetLanguage: string } & AICreateOptions): Promise<TranslatorInstance>
}

interface LanguageDetectorInstance {
  detect(text: string): Promise<{ detectedLanguage: string; confidence: number }[]>
}

declare const LanguageDetector: {
  availability(): Promise<AIAvailability>
  create(options?: AICreateOptions): Promise<LanguageDetectorInstance>
}
