interface FileTypeInfo {
  label: string
  color: string
}

export function getFileTypeInfo(contentType: string | null): FileTypeInfo {
  if (!contentType) return { label: 'FILE', color: 'bg-file-neutral' }

  if (contentType === 'application/pdf') return { label: 'PDF', color: 'bg-accent-2' }
  if (contentType.startsWith('image/')) return { label: 'IMG', color: 'bg-process-yellow' }
  if (contentType.includes('presentation'))
    return { label: 'PPT', color: 'bg-file-neutral' }
  if (contentType.includes('word') || contentType.includes('document'))
    return { label: 'DOC', color: 'bg-accent' }
  if (contentType.includes('sheet') || contentType.includes('excel'))
    return { label: 'XLS', color: 'bg-accent-400' }
  if (contentType.includes('presentation'))
    return { label: 'PPT', color: 'bg-file-neutral' }

  return { label: 'FILE', color: 'bg-file-neutral' }
}
