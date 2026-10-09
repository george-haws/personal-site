# Blog post outline: Fast validation for AI-driven development

**Status:** outline approved in brainstorming, ready to draft
**Target length:** about 1800 words
**Working title:** The bottleneck moved. Validation has to move with it.

## Thesis

AI made producing change cheap, so the constraint on delivery moved to validation. Projects must have fast validation of both kinds, deterministic and non-deterministic, or one of two things happens: validation stays slow and the organization gets none of the promised acceleration, or validation gets thinned to keep pace and deliverables become unstable.

## Audience

Three readers at once, served in this order:

1. Engineering leaders deciding where to invest. They need the argument.
2. Senior engineers and tech leads who build the validation. They need the mechanics.
3. People evaluating the author. They need to see how he thinks about quality in the AI era.

The structure serves all three: argument up front, mechanics in the middle, a split close.

## Definitions the post relies on

- **Deterministic check:** same input, same verdict, every run. Type checks, lint, unit and integration tests, contract tests, builds, migration dry runs, exact-match visual snapshots.
- **Non-deterministic check:** the verdict can differ between runs or judges. Three kinds appear in the post: AI review of a change against a spec, evals of features that contain model calls, and human review and acceptance.
- **Fast:** tiered. Seconds to minutes in the agent loop, under an hour for a PR, same day for a release.

Deliberately out of scope: agents exercising the product as exploratory testers. Mentioned once as emerging, with an honest caveat that there is not enough evidence to build a process around it. It does not appear in the definition of non-deterministic checks.

## Structure

### Section 1: Opening and problem statement (about 400 words)

**Cold open on the slow-validation failure.** A team adopts AI assistants. PRs double within a month. The review queue, QA cycle, and release validation don't change, so lead time stays flat or gets worse. Leadership asks why the AI investment isn't showing up in delivery metrics. Told as a short composite, past tense, no names.

**The bottleneck shifted.** Writing code was never the only constraint, but it was the one most teams were tuned around. AI cut it dramatically. Theory of constraints: throughput is set by the slowest step, and speeding up any other step builds inventory in front of the constraint. The inventory here is unvalidated change.

Candidate line: "An agent can produce a plausible change in four minutes. If confirming it is right takes four days, you have not accelerated anything. You have moved the wait."

**The fork.** Faced with a pile of unvalidated change, teams do one of two things. They keep validation as it is and accept that AI didn't speed anything up, or they thin validation to keep pace and ship instability. One short paragraph per failure. The second is the tempting one because it looks like progress for a quarter.

**Thesis stated.** The only way through is validation fast enough to keep pace with generation, in both kinds. Both have to be fast, and fast means different things at different tiers. That's the rest of the post.

### Section 2: Two kinds of validation (about 420 words)

**Deterministic checks.** Define with examples. Property: a machine, including the agent, can run them with no one watching, and a pass means something. Weakness: they only catch what someone thought to encode.

**Non-deterministic checks.** Define with the three examples, one line each, so the reader sees they share a shape. They catch what nobody encoded. Weaknesses: slow, expensive, and a single pass or fail is not meaningful on its own. They need sampling, thresholds, and a record of judgments over time.

**Why both must be fast.** Deterministic checks are usually already fast or can be made fast with known techniques, so the shortfall shows up in the non-deterministic ones. Teams treat those as inherently slow and push them to the end of the process, which is how the queue forms. Thinning them is how teams fall into the second failure, because those are the checks that catch what the AI got plausibly wrong.

**Principle 1: judgment is scarce.** Every non-deterministic check should have a deterministic check in front of it that filters out everything a machine could have caught. Don't spend judgment on type errors.

**Principle 2: build judgment checks the way you build with AI.** The instinct when adding AI review is to write a custom checklist of rules. That recreates the lint-rule problem: brittle, rots, encodes only what someone thought of, specific to one repo and one model. The better move is the same pattern that makes AI development work: a review skill or agent definition that carries the team's standards as a reusable capability, invoked the same way in the agent loop, the PR, and the release. A skill describes how to judge rather than enumerating what to catch, so it generalizes to changes nobody anticipated. It's portable across repos and model versions and improves in one place. The rule list and the skill are the same split as deterministic and non-deterministic: encode what a machine can check exactly, describe how to judge the rest.

### Section 3: The three tiers (about 650 words)

A three-by-two map. Each tier opens with its speed bar and who or what is waiting on it. The non-deterministic column gets the most words.

**Tier 1: the agent loop.** Bar: seconds to a few minutes. Waiting: the agent itself, before any human looks.

- Deterministic: typecheck, lint, unit tests touching changed files, a build. The agent runs these unprompted and self-corrects. Must be invocable with one command, documented where the agent will read it, cheap enough to run after every edit. A slow suite here is the first fix a team should make.
- Non-deterministic: an AI self-review against the spec or acceptance criteria before the agent declares done, using the team's review skill. Cheap, and it catches a large share of "technically works, isn't what was asked." Record the verdict in the PR so a human can disagree with it later.

**Tier 2: the pull request.** Bar: under an hour, no human in the critical path except final review. Waiting: the author and reviewer.

- Deterministic: full suite, integration and contract tests, migration checks, visual snapshots. Parallelize and cache to hold the bar.
- Non-deterministic: AI review as a first pass, using the same review skill as tier 1, commenting like a reviewer and treated like one rather than a gate. For features with model calls, an eval run against a fixed set with a threshold rather than exact assertions. Human review happens last, on a change that has already been filtered, with the AI's findings in front of it. One sentence: teams that start with a rules file usually migrate to a skill once the list passes a page. One sentence: agents driving a preview deploy through changed flows are being tried and worth watching, but there isn't enough evidence yet to make the process depend on them.
- Point to make: this is where the review queue from the opening dissolves, because the human is deciding, not discovering.

**Tier 3: the release.** Bar: same day a candidate is cut. Waiting: users and the business.

- Deterministic: smoke tests against the release build, data and config checks, rollback verified.
- Non-deterministic: eval regression across the full set. Human exploratory testing and acceptance, scoped to taste and intent, with the AI review record from each PR available so testers know where to look. Dogfooding with a feedback path that lands somewhere.
- Point to make: by this tier, human judgment should be spent on taste and intent, because everything mechanical was settled upstream.

**How the tiers relate.** One short paragraph. Each tier filters for the next. A check that fails often in tier 3 is a signal to build a cheaper version of it in tier 2 or 1. The map is a ratchet; the goal over time is to push checks down a tier.

### Section 4: Closing (about 400 words)

**Return to the opening team.** Two paragraphs on what changed when they fixed it. Descriptive, not a victory lap: the agent loop got a one-command check, the PR tier got AI review ahead of human review and evals for the model-backed feature, and release acceptance shrank to the questions only people could answer. The queue didn't vanish, it moved to where judgment was actually needed.

**For leaders: three questions to ask your teams.**

1. How long does it take to know a change is right at each tier?
2. Which checks are humans doing that a machine could filter first?
3. Where are we spending judgment on things that don't need it?

**For engineers: the first three moves.**

1. Make the deterministic checks one command and fast, and put the command where the agent will find it.
2. Add a review skill to the agent's definition of done, and reuse it in the PR tier.
3. Pick the one non-deterministic check that currently gates releases and build a cheaper version of it one tier earlier.

**Last line.** Restates the thesis as a choice: AI made producing change cheap, and teams now choose between validating fast, validating slow, or not validating. Only one of those is acceleration.

## Voice and constraints

- First person where the evidence is personal; composite and past tense for the team stories. No names.
- Claims about AI exploration of the product stay hedged. Everything else is stated plainly.
- No vendor names in the body. "Agent," "assistant," and "review skill" are generic.
- Run the stop-slop skill on the draft before review.

## Open items for drafting

- The site has no blog section yet. Publishing location and format are a separate task.
- Decide whether the three-by-two tier map gets a table in addition to prose.
