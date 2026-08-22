const SWEEP_NOTES_ASSIGNMENTS_KEY = 'docvault_sweep_notes_assignments'

// Default OFF: notes/assignments are the bulk of what most people download
// and re-download constantly, so auto-ingesting them by default would waste
// space on files nobody actually wants archived.
export function getSweepNotesAssignments(): boolean {
  return localStorage.getItem(SWEEP_NOTES_ASSIGNMENTS_KEY) === 'true'
}

export function setSweepNotesAssignments(value: boolean) {
  localStorage.setItem(SWEEP_NOTES_ASSIGNMENTS_KEY, String(value))
}
