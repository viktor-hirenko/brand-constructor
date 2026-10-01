-- Migration 013, down: back to four statuses for the code before `in_work`.
-- An `in_work` brief with an order becomes `submitted` (how the old code shows
-- «в роботі»), and gets back the submission the forward run took off; one
-- whose order was already swapped for library picks becomes `draft` — the old
-- code would otherwise show it to the CEO as if it had been sent.
-- The new columns stay (old code ignores them); `sent_to_work` events turn back
-- into `submitted`, which the old History knows.
UPDATE brand_workflow_events
SET event_type = 'submitted'
WHERE event_type = 'sent_to_work'
  AND brand_id IN (SELECT id FROM brands WHERE status = 'in_work');

UPDATE brands
SET status = CASE
      WHEN new_concept_brief IS NOT NULL
        OR new_naming_brief IS NOT NULL
        OR (json_valid(step_data)
            AND TRIM(COALESCE(json_extract(step_data, '$.internalNaming.newNamingFeedback'), '')) != '')
      THEN 'submitted'
      ELSE 'draft'
    END,
    submit_count = CASE
      WHEN new_concept_brief IS NOT NULL
        OR new_naming_brief IS NOT NULL
        OR (json_valid(step_data)
            AND TRIM(COALESCE(json_extract(step_data, '$.internalNaming.newNamingFeedback'), '')) != '')
      THEN submit_count + 1
      ELSE submit_count
    END,
    submitted_at = COALESCE(submitted_at, sent_to_work_at)
WHERE status = 'in_work';
