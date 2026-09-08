/**
 * The single topic vocabulary for the whole app.
 *
 * These labels are stored verbatim in `profiles.topic_preferences` and are matched
 * as strings, so every surface that reads or writes that column has to use the same
 * spellings. Three divergent lists had grown up instead — onboarding offered
 * "Work & career", settings offered "Work & life", and the edit-script sheet offered
 * "Work" — meaning a topic picked during onboarding never matched the settings
 * screen and nothing round-tripped. Add or rename a topic here and every screen
 * follows.
 *
 * `description` is shown by the settings list (1mg); the chip-style surfaces
 * (onboarding 1ag, edit-script) use `label` alone.
 */
export interface TopicStyle {
  label: string;
  description: string;
}

export const TOPIC_STYLES: readonly TopicStyle[] = [
  { label: 'Work & life', description: 'Career stories, opinions, everyday moments' },
  { label: 'Startup & business', description: 'Pitches, product updates, lessons learned' },
  { label: 'Money', description: 'Explain a financial idea in plain words' },
  { label: 'Health & habits', description: 'Routines, goals, what changed for you' },
  { label: 'Personal stories', description: 'Memories, people, places that shaped you' },
  { label: 'Random', description: 'A surprise every day' },
];

/** Just the labels — for chip rows that show no description. */
export const TOPIC_LABELS: readonly string[] = TOPIC_STYLES.map((t) => t.label);
