# Development Phases

## How to Use These Documents

Each phase file (`phase-N.md`) contains:

1. **Goal** — what this phase achieves
2. **Context** — what exists before this phase starts
3. **Implementation Prompt** — a self-contained prompt you can give to the LLM to implement this phase. It includes all necessary context so you don't need to re-explain the project.
4. **Files to Create/Modify** — expected file changes
5. **Acceptance Criteria** — how to verify the phase is complete
6. **Phase Completion Checklist** — mark items done as you go

When starting a new session for a phase, give the LLM:
1. The CLAUDE.md file (loaded automatically by Claude Code)
2. The specific phase document as your prompt

When a phase is complete, update the status below and in CLAUDE.md.

## Phase Status

| Phase | Name | Status | Description |
|-------|------|--------|-------------|
| 1 | [Scaffold & Spinning Globe](phase-1.md) | Complete | Project setup, basic globe, orbit controls, responsive layout |
| 2 | [Solar Position & Day/Night](phase-2.md) | Complete | Meeus algorithm, terminator shader, twilight, real-time clock |
| 3 | [Equirectangular Projection](phase-3.md) | Complete | Synchronized flat map below globe, same shader |
| 4 | [Time Controls](phase-4.md) | Complete | Smooth/snap modes, transport controls, date picker, presets |
| 5 | [Geography & Labels](phase-5.md) | Complete | Continental outlines, labels, rivers, terrain styling |
| 6 | [Location, Sun Data & Night Lights](phase-6.md) | Complete | Location input, sun info panel, night lights texture |
| 7 | [Polish, Performance & PWA](phase-7.md) | In Progress | UI styling, mobile, performance, full PWA, accessibility |

## Phase Dependencies

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
                                       │
                                       ▼
                          Phase 5 ──► Phase 6 ──► Phase 7
```

Phases are strictly sequential. Each builds on the previous phase's working artifact.

## Completion Protocol

When finishing a phase:

1. Verify ALL acceptance criteria in the phase document
2. Run `npm run build` and `npm run check` — both must pass
3. Test in browser — the deliverable described in the phase doc must work
4. Update the status table above (change "Not Started" → "Complete")
5. Update the "Current Phase" section in `/CLAUDE.md` to point to the next phase
6. Commit with message: `phase N complete: <brief description>`
