# Daily master pack schema 2.0 extensions

The site continues to accept `schema_version: "2.0"`. All fields below are optional and are carried through the existing `recordsFromLearningPack()` contract.

## Reading sections

`readings[]` may include `story_id`, `story_title`, `section_id`, `section_order`, `section_title`, `previous_section_id`, and `source_reference`. The existing `id`, `title`, `text`, `source`, and optional `questions` remain required as before. Sections are scheduled through the existing Reading stage; unfinished sections are not marked complete.

## Structured output and Exit Ticket

`transfer_tasks[]` remains the single output task list. Use `task_type: "speaking"`, `"reading_to_speaking"`, `"writing"`, `"grammar"`, or `"exit_ticket"`. Optional fields include `response_structure`, `target_phrases`, `ielts_part`, `practice_role`, review provenance, hints, and reference answer. Exit Ticket tasks are placed after ordinary output tasks and use the same first-answer, hint, reference, retry, recording and K/V/N evidence model.

The website never treats a mark, hint, recording, or skipped task as an automatic N/K or exam score. Feedback files with `feedback_schema_version: "1.0"` are separate from daily packs and must not be imported as learning packs.
