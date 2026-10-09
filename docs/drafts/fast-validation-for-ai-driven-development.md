# Elevate the constraint: validation in the AI era

## The queue nobody budgeted for

A team rolled out AI coding assistants. Within a month, pull requests had doubled, then tripled. The review queue, the QA cycle, and the release checks stayed as they were, so lead time held flat and then got worse. By the end of the quarter, leadership was asking why the AI investment had not shown up in the delivery numbers.

Writing code was never the only constraint on delivery, but it was the one most teams were tuned around. AI cut it to a fraction. Theory of constraints says throughput is set by the slowest step, and speeding up any other step builds inventory in front of it. The inventory here is unvalidated change. The textbook gives two responses to a constraint: subordinate everything to it, or elevate it. Subordinating here means throttling generation, which hands back the gain you paid for. Elevating means investing in validation until it stops being the constraint.

An agent can produce a plausible change in four minutes. If confirming it is right takes four days, you have not accelerated anything. You have moved the wait.

Faced with a pile of unvalidated change, teams do one of two things. The first is to leave validation as it is. The queue grows, engineers go back to waiting on review, someone blames the tooling, and the organization gets none of the acceleration it paid for. The assistants stay installed and the delivery numbers stay flat.

The second is to thin validation to keep pace. Reviews get shallower, suites get skipped, acceptance becomes a signature. This is the tempting one, because for a quarter it looks like progress. Then deliverables become unstable, and the cost shows up as incidents instead of lead time.

Both are ways of not elevating the constraint.

The only way through is validation fast enough to keep pace with generation. It has to be fast in both kinds: the checks a machine can run and the checks that need judgment. And fast means different things at different tiers.

## Two kinds of validation

A deterministic check gives the same verdict for the same input, every run. Type checks, lint, unit and integration tests, contract tests, builds, migration dry runs, and exact-match visual snapshots all qualify. A machine, including the agent, can run them with no one watching, and a pass means something. Their weakness is that they catch only what someone thought to encode.

A non-deterministic check can give a different verdict between runs or between judges. Three kinds matter here: an AI review of a change against its spec, an eval of a feature that contains model calls, and a human reviewing or accepting the work. Each applies judgment rather than a rule, so each can catch what nobody encoded. Each is slow and expensive, and a single pass or fail means little on its own. They need sampling, thresholds, and a record of judgments over time.

Deterministic checks are already fast on most teams, or can be made fast with known techniques, so the shortfall shows up in the non-deterministic ones. Teams treat those as slow by nature and push them to the end of the process, and that is how the queue forms. Thinning them is how teams fall into the second failure, because those are the checks that catch what the AI got wrong in a plausible-looking way.

The first principle is that judgment is scarce. Every non-deterministic check should have a deterministic check in front of it that filters out everything a machine could have caught. Don't spend judgment on type errors.

The second principle is to build judgment checks the way you build with AI. The instinct when adding AI review is to write a custom checklist of rules. That recreates the lint-rule problem: the list is brittle, it rots, and it encodes only what someone thought of for one repo and one model. The better move is the pattern that makes AI development work in the first place. Put the team's standards in a review skill (a reusable package of instructions the agent loads) or in an agent definition, and invoke it the same way in the agent loop, the PR, and the release. A skill describes how to judge rather than listing what to catch, so it generalizes to changes nobody anticipated, travels across repos and model versions, and improves in one place. Encode what a machine can check exactly; describe how to judge the rest.

A review skill is itself a non-deterministic check, so it gets the same treatment. Give it a small eval set, a dozen or so past PRs with known problems plus a few clean ones, and rerun it whenever the skill or the underlying model changes. The verdicts the agent loop records in each PR feed this set: each time a human disagrees with the skill, you have a labeled example. The loop is simple: run each case with and without the skill, several runs each, grade against written assertions with a grader that is not the skill, and report pass rate with variance. That is what makes the skill testable, and it is the concrete reason a skill beats a rules file. A rules file has no way to tell you it has gone stale.

I ran this loop on our design system review skill, using Anthropic's skill-creator benchmark tooling. The cases were a small set of component tasks. The agent ran the skill as a review pass over its own output before declaring done, and a separate grader agent scored that review against written assertions. Without the skill, the agent's review caught the design-standard problems 20 to 40 percent of the time. With it, 100 percent. The reason is plain: without a skill, an agent's idea of correct is whatever it absorbed in training plus whatever it can infer from the existing codebase, and neither of those is your design system. The codebase shows what was done, not what was intended, including every inconsistency you haven't fixed yet. A skill is where the intent lives. The set was small and the method deserves its own post, but it shows a review skill catching what unaided review misses, at least for one well-defined kind of standard.

## Three tiers, two columns

| Tier | Deterministic | Non-deterministic |
|---|---|---|
| **1. Agent loop** (seconds to a few minutes) | Typecheck, lint, unit tests on changed files, a build | AI self-review against the spec, using the team's review skill, verdict recorded in the PR |
| **2. Pull request** (machine checks under twenty minutes, whole tier under an hour) | Full suite, integration and contract tests, migration checks, visual snapshots, dependency and security scanning | AI review as a first pass, eval run for model-backed features, then risk-based routing into a quick lane or careful human review |
| **3. Release** (same day a candidate is cut) | Smoke tests on the release build, data and config checks, rollback verified | Full eval set rerun for regressions, human exploratory testing and acceptance |

In the agent loop, the agent itself is waiting, before any human looks. The deterministic checks must run from one command, documented where the agent will read it, and cost little enough to run after every edit; the agent runs them unprompted and self-corrects. A slow suite here is the first fix a team should make. The non-deterministic check is a self-review against the spec or acceptance criteria, using the team's review skill, before the agent declares done. It is cheap, and it catches much of "technically works, isn't what was asked." Record the verdict in the PR so a human can disagree with it later; those disagreements feed the skill's eval set.

At the pull request, the author and the reviewer are waiting. Deterministic checks come back in under twenty minutes and the whole tier, AI review and evals included, in under an hour, with no human in the critical path except final review. Dependency and security scanning joins the deterministic column because agents invent package names and pull in unvetted ones, so this check is specific to AI-written code. Parallelize and cache to hold the bar.

AI review goes first, using the same review skill as the agent loop, commenting like a reviewer and treated like one rather than as a gate. For features with model calls, run an eval against a fixed set with a threshold rather than exact assertions. Human review happens last, on a change that has already been filtered, with the AI's findings in front of it. Agents driving a preview deploy through the changed flows are being tried and are worth watching, but there isn't enough evidence yet to make the process depend on them.

Then route by risk. The AI review's output, plus signals the machine already has (files touched, whether a migration, auth path, or public interface is involved, test coverage of the diff), sorts each change into one of two lanes. Low blast radius and a clean AI review go to a quick lane, where a human confirms the findings in a minute or two. Anything else gets a careful review. The weak spot is that the quick lane is only as good as the skill's miss rate, so now and then pull a quick-lane change into careful review; those spot checks are more labeled examples for the eval set.

This is where the review queue from the opening dissolves. Per-review cost drops because the human is deciding, not discovering, and review count drops because most volume goes through the quick lane. Human attention concentrates where blast radius is high. Without routing, tripled PR volume still means tripled reviews, and a skeptical leader will do that math.

At the release, users and the business are waiting. Smoke tests run against the release build, data and config checks pass, and someone verifies rollback. Rerun the full eval set to catch regressions. Exploratory testing and acceptance are scoped to taste and intent, with the AI review record from each PR available so testers know where to look. By this tier, people should be spending judgment on taste and intent, because the earlier tiers settled everything mechanical.

Each tier filters for the next. A check that fails often at release is a signal to build a cheaper version of it in the PR or the agent loop. The map is a ratchet; the goal over time is to push checks down a tier. Dogfooding sits outside the tiers. It runs on whatever is deployed, it is not a gate, and its findings are the main source of new checks to push down. A bug found in dogfooding becomes a deterministic test or a review criterion, not a release checklist item.

## What the team did, and what to ask

The team from the opening fixed it in roughly this order: a one-command check in the agent loop, AI review ahead of human review in the PR tier using one shared skill, an eval for the model-backed feature, then the quick lane. What changed most was how the work felt. Reviewers confirmed findings instead of discovering them, and saved their careful reading for changes that touched auth, data, or a public interface. The quick lane absorbed the volume. Release acceptance shrank to the questions only people could answer: whether the feature felt right, and whether it was what they meant to build. Lead time started coming down within a couple of months. The queue didn't vanish. It moved to where judgment was needed.

If you lead an engineering organization, there are four questions to ask your teams.

1. How long does it take to know a change is right at each tier?
2. Which checks are humans doing that a machine could filter first?
3. Where are we spending judgment on things that don't need it?
4. What share of our changes actually need a careful human read, and do we know which ones?

If you build the validation, there are three moves to make first.

1. Make the deterministic checks one command and fast, and put the command where the agent will find it.
2. Add a review skill to the agent's definition of done, and reuse it in the PR tier.
3. Pick the one non-deterministic check that currently gates releases and build a cheaper version of it one tier earlier.

AI made producing change cheap. Teams now choose between validating fast, validating slow, or not validating. Only one of those is acceleration.
