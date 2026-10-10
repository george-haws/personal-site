## The gates are code

When a leader hears "elevate validation," they hear a quarter of engineering time spent on test infrastructure. [Post one](/writing/fast-validation-for-ai-driven-development) made the case that they have to do it anyway. This post is about why the bill is smaller than it sounds.

Gates are code. Tests, fixtures, mocks, eval harnesses, review instructions: all of it is code or prose, and an agent produces both fast. The cost of elevating the constraint is mostly the cost of checking what the agent built, and that is a fraction of the cost of building it by hand.

One catch, stated up front. A gate the agent wrote is itself unvalidated change. Every story below has a step where a person or a second check confirms the gate is worth keeping. That step is where the judgment goes. Skip it and you end up with a green suite that means nothing.

Four things I had agents build, in the order you would build them: missing tests, a fast suite, an eval set, a review skill. For each, what I asked for, what the agent got wrong, and how I checked it.

## The missing tests

The codebase had thin coverage. I set a coverage target, split the codebase by section, and gave each section to a subagent.

The agents hit the number. They did it by asserting content and static attributes instead of logic and behavior. A test that checks a button says "Submit" counts toward coverage and catches nothing.

I read a sample of the generated tests myself, then added a review pass with one rule, assert behavior not content, and reran. Coverage is a deterministic number, and an agent will satisfy it by the cheapest route available. The rule in the review pass is where the intent went.

## The slow suite

The product was a database-as-a-service platform. The suite took over an hour and was expensive, because tests created real databases and depended on persistent clusters that had to stay up at all times. I asked the agent to make it fast: parallelize, and mock the integration boundaries.

It did, and it reinvented the wheel along the way. It wrote a factory system by hand instead of reaching for Fishery, which already existed. The hand-rolled version works, but now the team owns it.

I introduced failures on purpose and confirmed the fast suite caught them. The persistent clusters went away, and the parallelized suite ran in under ten minutes.

This failure differs from the first story. The agent did what was asked, did it competently, and still produced a maintenance burden. Watch for hand-rolled infrastructure and ask for the battle-tested tool by name. The planted-failure check is the one that matters, because the usual way a fast suite goes wrong is by mocking away the thing the test existed to catch.

## The eval set

An eval set is a fixed set of cases with written assertions, used to score a non-deterministic check. I gathered the cases from past PRs with known problems, plus the existing misses: changes the review process had let through. I asked the agent to label each case with what should have been caught, under written guidance.

Every label was verified by a person before the set was trusted.

No failure here is worth telling. This one went smoothly, and the reason is the point. The input was curated and every label was checked. A mislabeled eval set corrupts everything downstream, so this is the one gate where verifying the whole set, rather than a sample, was worth it. Compare the sampling in the first story: the size and the stakes decide how much of the agent's output a person reads.

## The review skill

A review skill is a reusable package of instructions the agent loads that describes how to judge a change. Two codebases matter here: the design system's own codebase, where the intent lives, and the product codebases that consume it, which show what was done.

The design standards lived in two places, Figma and the design system's codebase, and the two had drifted. I asked the agent to draft a review skill from the team's standards.

The first draft hardcoded rules into the skill. That made a third source of truth that could drift from the other two, and it recreated the lint-rule problem from the other direction: a list that is brittle, rots, and encodes only what someone thought of.

I made the design system's codebase the single source of truth, demoted Figma, and rewrote the skill to point at that codebase and describe how to judge against it, with no rules of its own. Encode what a machine can check exactly; describe how to judge the rest. A skill holds the how-to-judge and knows where the intent lives. It does not hold a copy of the intent. Built that way, it generalizes to changes nobody anticipated, travels across repos and model versions, and improves in one place.

## Check the checker

A review skill is a non-deterministic check, so it gets the same treatment as any other: sampling, thresholds, a record of judgments. Give it the eval set from the third story and rerun whenever the skill or the underlying model changes. Run each case with and without the skill, several runs each, grade against written assertions with a grader that is not the skill, and report pass rate with variance. The verdicts recorded in each PR feed the set: every time a human disagrees with the skill, that is a new labeled case. This is why the skill beats the rules file. A rules file has no way to tell you it has gone stale.

I ran this loop on the design system review skill from the fourth story, using Anthropic's skill-creator benchmark tooling, on a small set of component tasks. The agent ran the skill as a review pass over its own output before declaring done, and a separate grader agent scored that review against written assertions. Without the skill, the agent's review caught the design-standard problems 20 to 40 percent of the time. With it, 100 percent.

The reason comes back to the two codebases. Without a skill, the agent's idea of correct is whatever it absorbed in training plus whatever it infers from the product codebase it is working in, and that codebase shows what was done, including every inconsistency not yet fixed. The skill tells the agent to look at the design system's codebase instead, and how to judge against it. That is the whole difference, and it is why the skill holds the pointer and the method rather than the rules.

The benchmark measured design-standard conformance, one well-defined kind of standard; the broader claim that a skill catches "isn't what was asked" is a reasonable extension, not a measured result.

## Three moves, and who makes them

1. Have the agent make the deterministic checks one command and fast, and put the command where the agent will find it. You plant failures to confirm the fast suite still catches them.
2. Have the agent draft a review skill that points at your source of truth and describes how to judge. You cut any rule it hardcodes. Add the skill to the agent's definition of done and reuse it in the PR tier.
3. Have the agent label an eval set from past misses. You verify every label. Then run the loop every time the skill or the model changes.

The agents moved the constraint, and they are the cheapest way to elevate it. Let them build the gates and spend your judgment checking them. Checking costs a fraction of building by hand, and that fraction is the whole gain.
