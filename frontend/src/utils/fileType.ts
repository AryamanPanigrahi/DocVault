interface FileTypeInfo {
  label: string
  color: string
}

export function getFileTypeInfo(contentType: string | null): FileTypeInfo {
  if (!contentType) return { label: 'FILE', color: 'bg-slate-400' }

  if (contentType === 'application/pdf') return { label: 'PDF', color: 'bg-red-500' }
  if (contentType.startsWith('image/')) return { label: 'IMG', color: 'bg-amber-500' }
  if (contentType.includes('word') || contentType.includes('document'))
    return { label: 'DOC', color: 'bg-blue-500' }
  if (contentType.includes('sheet') || contentType.includes('excel'))
    return { label: 'XLS', color: 'bg-green-500' }
  if (contentType.includes('presentation'))
    return { label: 'PPT', color: 'bg-orange-500' }

  return { label: 'FILE', color: 'bg-slate-400' }
}