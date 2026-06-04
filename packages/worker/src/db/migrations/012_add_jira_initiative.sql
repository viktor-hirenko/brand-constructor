-- Migration 012: Store Jira Initiative created after brand approval

ALTER TABLE brands ADD COLUMN jira_initiative_key TEXT;
ALTER TABLE brands ADD COLUMN jira_initiative_url TEXT;
ALTER TABLE brands ADD COLUMN jira_initiative_created_at TEXT;
