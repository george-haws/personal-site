import type { Project } from "@/lib/types";

export const projects: Project[] = [
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
