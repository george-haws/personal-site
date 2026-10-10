# Blog post outline: Let the agents build the gates

**Status:** outline drafted in brainstorming, awaiting review
**Target length:** about 1000 words
**Working title:** Let the agents build the gates
**Slug:** `agents-build-the-gates`
**Companion change:** the live post `fast-validation-for-ai-driven-development` is trimmed to about 1100 words at the same time. See the last section.

## Thesis

Elevating validation sounds like a quarter of engineering time. It is not, because validation gates are code and the same agents that flooded the queue write code. The scarce human judgment goes into checking what the agent built, not building it. Four first-hand stories show the pattern and what to watch for in each.

## Audience

Senior engineers and tech leads who build the validation. They need the mechanics: what to ask the agent for, what it gets wrong, and how to check the result. Leaders get the cost point in the opening and nothing more, because post one already made the argument to them and closed with its bridge to this post.

## Relationship to post one

Post one ("Elevate the constraint: validation in the AI era") argued that the constraint moved to validation and mapped the two kinds of checks across three tiers. It ends with a one-paragraph bridge: elevating is cheaper than it sounds because agents build the gates, and the next post shows how. This post is that next post. It opens with a one-line pointer back and does not restate the map. It assumes the reader knows the terms deterministic check, non-deterministic check, and the three tiers, and uses them without redefining.

Material moved here from post one, lightly rewritten to fit: the "build judgment checks the way you build with AI" principle (now inside story four), check the checker, the design system benchmark, and the three engineer moves.

## Definitions the post relies on

- **Review skill:** a reusable package of instructions the agent loads that describes how to judge a change. Define on first use, in story four.
- **Eval set:** a fixed set of cases with written assertions, used to score a non-deterministic check. Define on first use, in story three.
- The rest (deterministic, non-deterministic, tiers, quick lane) comes from post one and is used without definition.

## Structure

### Section 1: Opening (about 150 words)

**The objection.** When a leader hears "elevate validation," they hear a quarter of engineering time spent on test infrastructure. One line pointing to post one for the argument that they have to do it anyway.

**The reframe.** Gates are code. Tests, fixtures, mocks, eval harnesses, review instructions: all of it is code or prose that an agent produces fast. The cost of elevating the constraint is mostly the cost of checking what the agent built, and that is a fraction of the cost of building it by hand.

**The catch, stated up front.** A gate the agent wrote is itself unvalidated change. Every story below has a step where a human or a second check confirms the gate is worth keeping. That step is where the judgment goes, and skipping it is how a team ends up with a green suite that means nothing.

**Signpost.** Four things I had agents build, in the order you would build them: missing tests, a fast suite, an eval set, a review skill. Each with what I asked for, what the agent got wrong, and how I checked it.

### Section 2: Four stories (about 500 words, roughly 125 each)

All four are first person, past tense, no company names, no numbers beyond the ones listed here. Each story has the same three beats: the ask, the failure, the check. Keep the beats visible so a reader can pattern-match to their own situation.

**Story one: the missing tests.** Codebase with thin coverage. Ask: a coverage target, codebase split by section, a subagent per section. Failure: the agent hits the number by asserting content and static attributes instead of logic and behavior. A test that checks a button says "Submit" counts toward coverage and catches nothing. Check: read a sample of the generated tests myself, then add a review pass with one rule, assert behavior not content, and rerun. Point: coverage is a deterministic number and the agent will satisfy it by the cheapest route. The rule in the review pass is where the intent went.

**Story two: the slow suite.** The product was a database-as-a-service platform. The suite took over an hour and was expensive, because tests created real databases and depended on persistent clusters that had to stay up at all times. Ask: make it fast, parallelize, mock the integration boundaries. Failure: the agent reinvented the wheel. It wrote a factory system by hand instead of reaching for an existing one (Fishery, in this case). It works, but now the team owns it. Check: introduced failures on purpose and confirmed the fast suite caught them. Result: the persistent clusters went away and the parallelized suite ran in under ten minutes. Point: this failure is different from story one. The agent did what was asked and did it competently, and still produced a maintenance burden. Watch for hand-rolled infrastructure and ask for the battle-tested tool by name. The planted-failure check is the one that matters, because the usual way a fast suite goes wrong is mocking away the thing the test existed to catch.

**Story three: the eval set.** Define eval set on first use. Source: past PRs with known problems, plus the existing misses, meaning changes the review process let through. Ask: label each case with what should have been caught, under written guidance. Check: every label manually verified before the set was trusted. Failure: none worth telling. This one went smoothly, and the reason is the point. The input was carefully curated and every label was checked by a person. A mislabeled eval set corrupts everything downstream, so this is the one gate where human verification of the whole set, not a sample, was worth it. Contrast with the sampling in story one: the size and the stakes decide how much of the agent's output a human reads.

**Story four: the review skill.** Define review skill on first use. Starting state: the design standards lived in two places, Figma and the component source, and the two had drifted. Ask: draft a review skill from the team's standards. Failure: the first draft hardcoded rules into the skill. That made a third source of truth that could drift from the other two, and it recreated the lint-rule problem from the other direction: a list that is brittle, rots, and encodes only what someone thought of. Iteration: made the component source the single source of truth, demoted Figma, and rewrote the skill to point at the source and describe how to judge against it, with no rules of its own. Point, carrying the principle from post one: encode what a machine can check exactly, describe how to judge the rest. A skill holds the how-to-judge and knows where the truth lives. It does not hold a copy of the truth. The moved principle lives here in compressed form: a skill generalizes to changes nobody anticipated, travels across repos and model versions, and improves in one place.

### Section 3: Check the checker (about 220 words)

**The loop.** A review skill is a non-deterministic check, so it gets the same treatment as any other: sampling, thresholds, a record of judgments. Give it the eval set from story three and rerun whenever the skill or the underlying model changes. Run each case with and without the skill, several runs each, grade against written assertions with a grader that is not the skill, report pass rate with variance. The verdicts recorded in each PR feed the set: every time a human disagrees with the skill, that is a new labeled case. This is what makes the skill testable, and it is why the skill beats the rules file. A rules file has no way to tell you it has gone stale.

**The benchmark, moved from post one with its wording largely intact.** I ran this loop on the design system review skill from story four, using Anthropic's skill-creator benchmark tooling (the one vendor tool named, as method disclosure). A small set of component tasks. The agent ran the skill as a review pass over its own output before declaring done; a separate grader agent scored that review against written assertions. Without the skill, the agent's review caught the design-standard problems 20 to 40 percent of the time. With it, 100 percent. Say "small set."

**Why, reconciled with story four.** Without a skill, the agent's idea of correct is whatever it absorbed in training plus whatever it infers from the app code, and the app code shows what was done, not what was intended, including every inconsistency not yet fixed. The skill tells it where the standard actually lives and how to judge against it. That is the whole difference, and it is why the skill holds the pointer and the method rather than the rules.

**Honest scope.** The benchmark measured design-standard conformance, one well-defined kind of standard. The broader claim that a skill catches "isn't what was asked" is the reasonable extension, not the measured result. One clause.

### Section 4: Closing (about 130 words)

**The three moves, revised from post one so each says who does the building.**

1. Have the agent make the deterministic checks one command and fast, and put the command where the agent will find it. You plant failures to confirm the fast suite still catches them.
2. Have the agent draft a review skill that points at your source of truth and describes how to judge. You cut any rule it hardcodes. Add the skill to the agent's definition of done and reuse it in the PR tier.
3. Have the agent label an eval set from past misses. You verify every label. Then run the loop every time the skill or the model changes.

**Last line.** The agents moved the constraint, and they are the cheapest way to elevate it. Let them build the gates and spend your judgment checking them. Checking costs a fraction of building by hand, and that fraction is the whole gain.

## Voice and constraints

- First person throughout the four stories and the benchmark. Past tense. No company names. The platform is described as "a database-as-a-service platform," not named.
- Numbers allowed: over an hour to under ten minutes (story two), 20 to 40 percent versus 100 percent on a small set (benchmark). No others.
- Tools named: Fishery (story two, as the concrete example of the battle-tested tool the agent skipped) and Anthropic's skill-creator (benchmark, as method disclosure). No other vendor names.
- "Agent," "subagent," and "review skill" stay generic.
- No restating post one's argument. One pointer back in the opening, none elsewhere.
- Run the stop-slop skill on the draft before review.
- No H1 in the MDX body. The title comes from the registry.

## Companion change: trim post one

Post one is live at `/writing/fast-validation-for-ai-driven-development`. Its slug, title, and published date stay. It is edited in place on the same branch as this post and the two ship together.

**Cuts.**

- The "second principle" paragraph (build judgment checks the way you build with AI). The sentence "The first principle is that judgment is scarce" becomes "The principle that follows is that judgment is scarce" or similar, since there is no longer a second.
- The check-the-checker paragraph.
- The benchmark paragraph.
- The three engineer moves and their lead-in sentence.

**Generalizations.** "The team's review skill" and "using one shared skill" become "AI review" wherever they appear, in the table and the tier prose and the team's return paragraph. The tier one prose keeps the line about recording the verdict in the PR so a human can disagree later, but drops the clause about feeding the skill's eval set. The tier two routing paragraph keeps the spot-check sentence but drops the eval-set clause the same way.

**Trim.** Tier prose comes down by roughly 200 words. The table already holds the inventory, so cut sentences that repeat table cells.

**Addition.** One bridge paragraph after the four leader questions, before the last line, about 80 words. Content: elevating the constraint sounds like a quarter of engineering time spent on test infrastructure. It is not, because the gates are code and the agents write code. The scarce judgment goes into checking what they built. The next post shows how, with four examples. Link to this post by slug.

**Target:** about 1100 words.

**Other files.**

- `src/data/posts.ts`: post one's description stays as is, since it never mentioned the benchmark or the engineer moves. This post gets its own entry.
- `docs/drafts/fast-validation-linkedin.md`: drop the benchmark sentence, since the result now lives in this post. A second LinkedIn draft for this post is a separate task.
- `docs/superpowers/specs/2026-10-09-fast-validation-blog-post-outline.md`: add a status line noting the split and pointing here.
- `src/app/writing/page.test.tsx`: add a link assertion for this post.
