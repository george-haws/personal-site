import type { Project } from "@/lib/types";

export const projects: Project[] = [
  {
    title: "expo-whisperkit",
    summary:
      "On-device speech to text for Expo apps on iOS, written because the only community wrapper was 40 lines of Swift on a two-year-old WhisperKit pin, and packaging cost the same either way.",
    description:
      "I wanted a pinned model downloaded from Settings with progress, a vocabulary prompt to bias toward cooking terms, live streaming, typed errors, and a fork to own when something broke. The existing wrapper offered one transcribe call on WhisperKit's default model, a boolean for errors, and none of the rest. Either route still had to wire WhisperKit into the iOS build through a config plugin, so the wrapper saved half a day of Swift and nothing else. This module's plugin builds WhisperKit from source with no CocoaPods plugin or Ruby gem. The API covers push-to-talk, file transcription, and streaming with partial results. A manifest pins each model to a repo commit and per-file hash, and every download is verified before it counts as present, so an upstream change fails loudly instead of silently changing what the app runs. Phone calls, Siri, and backgrounding end capture without an error and keep the audio for the next stop.",
    tech: ["TypeScript", "Swift", "Expo Modules", "WhisperKit", "CoreML", "Maestro"],
    repoUrl: "https://github.com/george-haws/expo-whisperkit",
    demo: [
      [
        { text: "downloadProgress", style: "label" },
        { text: "   { model: 'base', fraction: 0.42 }", style: "dim" },
      ],
      [
        { text: "modelState", style: "label" },
        { text: "         { model: 'base', state: 'loaded' }", style: "dim" },
      ],
      [
        { text: "streamingUpdate", style: "label" },
        { text: "    confirmed: " },
        { text: "\"Add tahini and\"", style: "name" },
        { text: "   pending: " },
        { text: "\"za'atar to the\"", style: "italic" },
      ],
      [
        { text: "streamingUpdate", style: "label" },
        { text: "    confirmed: " },
        { text: "\"Add tahini and za'atar to the\"", style: "name" },
        { text: "   pending: " },
        { text: "\"list\"", style: "italic" },
      ],
      [
        { text: "stopStreaming", style: "label" },
        { text: "  →   { text: " },
        { text: "\"Add tahini and za'atar to the list\"", style: "name" },
        { text: ", language: 'en' }" },
      ],
    ],
    featured: true,
  },
  {
    title: "Claude Code setup",
    summary:
      "A versioned Claude Code config: a hook that catches every spec and plan, and a second model that reviews them before I do.",
    description:
      "chezmoi renders the settings from a shared file and a per-machine overlay that never gets committed. A PostToolUse hook catches writes to superpowers specs and plans, however they happen, and nudges the session to run the cross-model review. Subagents get a different nudge: report the change up and let the caller review. The review goes to a read-only agent on a second model with a clean context, and the skill walks me through its findings one at a time.",
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
