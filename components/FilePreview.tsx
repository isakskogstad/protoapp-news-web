'use client'

import { X, FileText, Image as ImageIcon, Film, Music, File, Loader2 } from 'lucide-react'

interface FilePreviewProps {
  file: File
  onRemove: () => void
  uploading?: boolean
  uploadProgress?: number
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return ImageIcon
  if (mimeType.startsWith('video/')) return Film
  if (mimeType.startsWith('audio/')) return Music
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText
  return File
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FilePreview({ file, onRemove, uploading, uploadProgress }: FilePreviewProps) {
  const isImage = file.type.startsWith('image/')
  const Icon = getFileIcon(file.type)

  return (
    <div className="relative flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg group">
      {/* Preview */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
        {isImage ? (
          <img
            src={URL.createObjectURL(file)}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {file.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatFileSize(file.size)}
        </p>
      </div>

      {/* Upload progress or remove button */}
      {uploading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          {uploadProgress !== undefined && (
            <span className="text-xs text-gray-500">{uploadProgress}%</span>
          )}
        </div>
      ) : (
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors opacity-0 group-hover:opacity-100"
          title="Ta bort"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Upload progress bar */}
      {uploading && uploadProgress !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-600 rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
    </div>
  )
}

// File drop zone component
interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void
  children: React.ReactNode
  disabled?: boolean
  accept?: string
  multiple?: boolean
}

export function FileDropZone({
  onFilesSelected,
  children,
  disabled = false,
  multiple = false,
}: FileDropZoneProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      onFilesSelected(multiple ? files : [files[0]])
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative"
    >
      {children}
    </div>
  )
}
