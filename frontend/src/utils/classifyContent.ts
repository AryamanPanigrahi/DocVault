// Post-upload reclassification, run against real OCR text — a far more
// reliable signal than the filename-only guess the Rust watcher makes
// before upload (see desktop/src-tauri/src/watcher.rs). Kept as a
// separate keyword list rather than sharing one across the Rust/JS
// boundary: filename and document-body signals are genuinely different
// (a body contains things like "Module", "Submitted by", "Roll No." that
// a filename rarely does), so there's no real single source of truth to
// share, only two independent — and deliberately imperfect — heuristics.
const NOTES_ASSIGNMENTS_KEYWORDS = [
  'lecture',
  'lecture notes',
  'module',
  'unit',
  'syllabus',
  'chapter',
  'assignment',
  'assessment',
  'homework',
  'submitted by',
  'submitted to',
  'roll no',
  'roll number',
  'registration number',
  'reg no',
  'due date',
  'course code',
  'course name',
  'name of the student',
  'semester',
  'practical',
  'lab record',
  'experiment no',
]

export type ContentCategory = 'notes_assignments' | 'general'

export function classifyContent(text: string | null | undefined): ContentCategory {
  if (!text) return 'general'
  const lower = text.toLowerCase()
  return NOTES_ASSIGNMENTS_KEYWORDS.some((kw) => lower.includes(kw))
    ? 'notes_assignments'
    : 'general'
}
