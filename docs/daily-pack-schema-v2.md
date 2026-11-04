# Daily master pack schema 2.0 extensions

The site continues to accept `schema_version: "2.0"`. All fields below are optional and are carried through the existing `recordsFromLearningPack()` contract.

## Reading sections

`readings[]` may include `story_id`, `story_title`, `section_id`, `section_order`, `section_title`, `previous_section_id`, and `source_reference`. The existing `id`, `title`, `text`, `source`, and optional `questions` remain required as before. Sections are scheduled through the existing Reading stage; unfinished sections are not marked complete.

## Structured output and Exit Ticket

`transfer_tasks[]` remains the single output task list. Use `task_type: "speaking"`, `"reading_to_speaking"`, `"writing"`, `"grammar"`, or `"exit_ticket"`. Optional fields include `response_structure`, `target_phrases`, `ielts_part`, `practice_role`, review provenance, hints, and reference answer. Exit Ticket tasks are placed after ordinary output tasks and use the same first-answer, hint, reference, retry, recording and K/V/N evidence model.

The website never treats a mark, hint, recording, or skipped task as an automatic N/K or exam score. Feedback files with `feedback_schema_version: "1.0"` are separate from daily packs and must not be imported as learning packs.

## Optional spelling reinforcement

`spelling_tasks[]` is an optional vocabulary-stage substep and keeps `schema_version: "2.0"`:

```json
{"id":"SP01","type":"spelling","target":"scramble","cue_zh":"匆忙行动；争先","prompt_mode":"meaning_to_spelling","example":"The staff had to scramble.","source_item_id":"word-scramble"}
```

Supported modes are `meaning_to_spelling`, `audio_to_spelling`, and `sentence_cloze`. The site stores first and retry answers separately, including `first_check`, `retry_check`, `input_mode`, active seconds and completion time. Spelling evidence is reported independently from K/V/N and never becomes an IELTS score or FSRS date.
