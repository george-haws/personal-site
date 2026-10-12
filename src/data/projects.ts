import type { Project } from "@/lib/types";

export const projects: Project[] = [
  {
    title: "Claude Code setup",
    summary:
      "A versioned Claude Code config: a hook that catches every spec and plan, and a second model that reviews it before I do.",
    description:
      "Settings are rendered by chezmoi from a shared file plus an uncommitted per-machine overlay, with permission lists unioned the way Claude Code merges them. A PostToolUse hook watches writes to superpowers specs and plans, including shell redirects and in-place edits, and injects a nudge to run the cross-model review; inside a subagent it says to report the change instead, so only the caller reviews. The review skill dispatches a read-only reviewer agent on a different model with a clean context, then walks through its findings one at a time. The status line below is part of the same config.",
    tech: ["Bash", "jq", "chezmoi", "Claude Code hooks", "Claude Code skills"],
    repoUrl: "https://github.com/george-haws/dotfiles/tree/master/private_dot_claude",
    demo: [
      [
        { text: "Write", style: "label" },
        { text: "  docs/superpowers/specs/2026-10-11-edge-analytics-design.md" },
      ],
      [
        { text: "hook", style: "label" },
        { text: "   spec-review-nudge: this is a spec; run cross-model-review before the user gate", style: "dim" },
      ],
      [{ text: "Skill", style: "label" }, { text: "  cross-model-review" }],
      [
        { text: "Agent", style: "label" },
        { text: "  cross-model-reviewer", style: "name" },
        { text: " · opus · Read, Grep, Glob · clean context", style: "dim" },
      ],
      [{ text: "       Reviewer model: claude-opus-5-5", style: "dim" }],
      [
        { text: "       1. " },
        { text: "should-fix", style: "name" },
        { text: " · Data flow · the Worker never sets the sampling header the spec assumes", style: "italic" },
      ],
      [
        { text: "       2. " },
        { text: "minor", style: "name" },
        { text: " · Testing · no case for a request with no referrer", style: "italic" },
      ],
      [{ text: "Finding 1 of 2. Accept, reject, or discuss?" }],
    ],
    featured: true,
  },
  {
    title: "Claude Code status line",
    summary:
      "Where a long session is at a glance: a Haiku summary of your first prompt, your latest one, and the current step.",
    description:
      "Each session shows its name, model, context used and cost, then what you first asked (Started), what you asked last (Now) and the step the agent is on with how long it has taken (Doing). Everything comes from the session transcript, so there is no saved state. When the first prompt is too long for a row, a one-line Haiku summary is generated once in the background and cached.",
    tech: ["Bash", "jq", "Claude Code"],
    repoUrl: "https://github.com/george-haws/dotfiles/blob/master/private_dot_claude/executable_statusline.sh",
    demo: [
      [
        { text: "[signup-e2e]", style: "name" },
        { text: " · " },
        { text: "Opus 5.5", style: "dim" },
        { text: " · 83% ctx · $7.90" },
      ],
      [
        { text: "Started:", style: "label" },
        { text: " " },
        { text: "Figure out why the signup flow test passes locally but times out in CI", style: "italic" },
      ],
      [{ text: "Now:", style: "label" }, { text: "     check if the email mock is racing the redirect" }],
      [{ text: "Doing:", style: "label" }, { text: "   Run the signup spec 20 times with trace on (3m 05s)" }],
    ],
    featured: true,
  },
];
