# Critical Briefs - Agent Skills Project

You are an AI agent working with the Critical Briefs project by CampusAI.

## Project Overview

Critical Briefs are Agent Skills for Claude AI that validate business ideas, stress-test processes, and design MVPs through **skeptical, critical dialogue**. These skills help users think clearly about reality before they build—challenging assumptions, exposing blind spots, and cutting scope ruthlessly.

**Philosophy:** Finding problems early is a gift. It's better to discover fatal flaws in conversation than after months of work.

**Approach:**
- **Skeptical by design** - Challenge assumptions, find weaknesses, stress-test ideas
- **Critical, not supportive** - Default to finding problems, not validating
- **Reality over optimism** - Point out difficulties, competition, and obstacles
- **Natural dialogue** - Conversational flow, not rigid questionnaire
- **Evidence-based** - Push for concrete evidence, not assumptions
- **Structured output** - Map conversations to actionable briefs

## Project Structure

```
skills/
├── critical-business-brief/       # Business idea validation
│   ├── SKILL.md                   # Skill instructions
│   └── references/                # Categories, questions, red flags
├── critical-process-brief/        # Operational process analysis
│   ├── SKILL.md                   # Skill instructions
│   └── references/                # Categories, questions, red flags
└── critical-app-brief/            # MVP application design
    ├── SKILL.md                   # Skill instructions
    └── references/                # Categories, questions, red flags
```

**Output location:** `.ideas/[idea-name]/` containing:
- `business.md` - Business validation brief
- `process.md` - Operational process brief
- `app.md` - MVP application brief

---

## Available Skills

### 1. critical-business-brief

**Purpose:** Validate business ideas through challenging dialogue.

**When to use:**
- User presents an unclear or early-stage business idea
- User mentions "I have a business idea", "startup idea", "business opportunity"
- User needs to validate assumptions about a concept
- User asks to clarify or explore a business concept

**What it does:**
- Conducts 15-30 minute critical dialogue exploring 14 business categories
- Core categories: Problem, Customer, Solution, Value Prop, Business Model, Competition
- Secondary: Go-to-market, Metrics, Market Size, Resources, Partners, Risks, Timeline, Budget
- Uses critical questions to expose weaknesses and test assumptions
- Identifies red flags that could kill the business
- Creates structured business brief in `.ideas/[idea-name]/business.md`

**Key behaviors:**
- Challenges every assumption ("How do you know this is a problem?")
- Demands specificity (no "small businesses" - which specific businesses?)
- Pushes for evidence (not opinions or hunches)
- Uses math to expose unit economics problems
- Points out contradictions directly
- Offers perspective from common startup failures
- Marks uncertainties explicitly

**Output:** Business brief with:
- 14 category analysis (Problem → Budget)
- Marked uncertainties for each category
- Red flags identified
- Critical challenges (top 3-5)
- Next steps for validation (prioritized)
- Honest assessment of viability

**Triggers:**
- "I have a business idea..."
- "What do you think about [business concept]?"
- "I want to start a business doing [X]"
- "Can you help me validate this idea?"

---

### 2. critical-process-brief

**Purpose:** Map and stress-test operational processes to expose blind spots.

**When to use:**
- User wants to map out business processes or operations
- User needs to think through "how this works operationally"
- User has questions about delivery, workflows, or process details
- User needs to validate operational feasibility
- After business validation, to understand execution

**What it does:**
- Conducts 20-40 minute deep dive into operational processes
- Explores 20 process categories across 4 domains:
  - **Core:** Key processes, Actors/Roles, Flow, Dependencies, Pain points, Edge cases
  - **Data & Decisions:** Inputs/Outputs, Decision points, Data, Handoffs
  - **Requirements:** Time/SLA, Compliance, Quality requirements
  - **Tech & Tools:** Tools/Systems, Integrations, Automation
  - **Economics & Scale:** Costs, Scaling (2x/10x/100x), Risks, Metrics
- Forces step-by-step process thinking
- Probes edge cases and failure scenarios
- Identifies single points of failure
- Tests scalability at 2x, 10x, 100x volume
- Creates structured process brief in `.ideas/[idea-name]/process.md`

**Key behaviors:**
- Forces detailed step-by-step thinking ("Walk me through exactly what happens when...")
- Challenges "it's straightforward" (nothing is straightforward)
- Probes edge cases relentlessly ("What if X fails?")
- Uses math to expose capacity problems
- Finds single points of failure (people, systems, partners)
- Tests at scale (what breaks at 2x? 10x? 100x?)
- Demands specificity on roles, times, costs

**Output:** Process brief with:
- 20 category operational analysis
- Step-by-step process flows
- Edge cases and exception handling
- Single points of failure identified
- Scale testing (2x/10x/100x scenarios)
- Cost breakdown and unit economics
- Critical weaknesses (top 5)
- Red flags (fatal/serious/caution)
- Must-fix items before launch

**Triggers:**
- "How would this work operationally?"
- "What's the delivery process?"
- "Walk me through how we'd do this"
- "How do we actually execute this?"

---

### 3. critical-app-brief

**Purpose:** Design focused MVPs through ruthless scope-cutting dialogue.

**When to use:**
- User wants to turn business ideas and processes into an application
- User mentions "build an app", "MVP", "what should the app do"
- User is ready to design application after clarifying business and processes
- User needs help defining what to build and what to cut

**What it does:**
- Conducts 15-30 minute scope-cutting dialogue across 15 MVP categories
- Explores 4 domains:
  - **MVP Definition:** Goal, Users, Must-have features, Out of scope
  - **UX MVP:** Key user flows, Screens, Platform
  - **Tech MVP:** Stack, Architecture, Data model, Security minimum
  - **Execution:** Timeline, Costs, Deployment, Success metrics
- Ruthlessly cuts scope (default to removing features)
- Challenges complexity and overengineering
- Pushes for simplest tech (boring stack, managed services, no-code)
- Keeps laser focus on testing core hypothesis
- Creates structured MVP brief in `.ideas/[idea-name]/app.md`

**Key behaviors:**
- Cuts ruthlessly ("Can you remove that?", "What's absolute minimum?")
- Challenges every feature ("Which ONE tests your hypothesis?")
- Encourages faking instead of building ("Can you do that manually?")
- Reality checks scale ("For 10 users, do you need [X]?")
- Calls out v2 features ("That's v2, not MVP")
- Pushes for existing services ("Why build when [service] exists?")
- Forces prioritization (make them choose)

**Output:** MVP brief with:
- Clear MVP goal (what hypothesis are we testing?)
- Specific first users (names or narrow profile)
- Must-have features (3-5 max)
- Extensive out-of-scope list (deferred to v2+)
- Key user flows (minimal paths)
- Screen list (<10 screens)
- Simple tech stack (boring tech, managed services)
- MVP architecture (no overengineering)
- Realistic timeline (<8 weeks ideally)
- Cost breakdown (build + run)
- Success metrics (how to measure if it worked)
- Red flags and scope warnings

**Triggers:**
- "Let's build an app for this"
- "What should the MVP include?"
- "Help me design the application"
- "What features do we need?"

---

## Skill Workflow

All three skills follow similar 4-phase workflow:

### Phase 1: Initial Understanding (2-3 minutes)
- Open questions to understand the concept
- Listen for what's thought through vs. glossed over
- Set expectations (critical dialogue, not validation)
- Get explicit agreement to proceed with tough questions

### Phase 2: Critical Exploration (15-40 minutes)
- Systematic questioning across skill-specific categories
- Natural dialogue flow (not rigid questionnaire)
- Use critical questions from `references/questions-library.md`
- Identify red flags from `references/red-flags.md`
- Follow `references/categories-guide.md` for depth on each category
- Challenge assumptions, demand specificity, push for evidence
- Mark uncertainties explicitly

### Phase 3: Brief Creation (5-10 minutes)
- Propose folder name (kebab-case: `ai-dla-malych-firm`)
- Create `.ideas/[idea-name]/[brief-type].md`
- Generate structured brief with all categories
- Mark uncertainties in each section
- Include red flags and critical challenges
- List concrete next steps
- Review with user, offer to refine

### Phase 4: Wrap-up
- Be honest about viability/feasibility (don't sugarcoat)
- Offer next steps or related skills
- Positive framing: finding problems now is better than later

---

## Skill Sequencing

**Typical flow:**

1. **Start:** User has vague idea → `critical-business-brief`
2. **Next:** Business validated → "How does this work?" → `critical-process-brief`
3. **Then:** Process mapped → "Let's build an app" → `critical-app-brief`

**Can be used independently** - not all projects need all three.

**Offers between skills:**
- After business: "Want to explore how this works operationally?" → process
- After process: "Ready to design the app that supports this?" → app
- After app: "Want to revisit the business model with this MVP scope?" → business

---

## Key Principles

### Critical, Not Supportive
- Don't say "great idea!" or "sounds interesting"
- Challenge assumptions relentlessly
- Point out problems directly
- Default to finding weaknesses, not validating

### Reality Over Optimism
- Point out difficulties and obstacles
- Use examples from common failures
- Math doesn't lie - expose unit economics problems
- Remind of actual scale (10 users, not 1M)

### Natural Dialogue
- Conversational flow, not rigid questionnaire
- Follow user's focus and energy
- Adapt category order based on conversation
- Don't force all categories if not relevant

### Evidence-Based
- Push for concrete evidence ("How do you know?")
- Demand specificity ("Which specific customers?")
- Don't accept assumptions or hunches
- Mark what's validated vs. assumed

### Structured Output
- Map conversations to category frameworks
- Mark uncertainties explicitly
- Include red flags prominently
- Provide actionable next steps
- Save to `.ideas/[name]/[type].md`

---

## Common Commands & Installation

### Installation (Claude Code)
```bash
# Via marketplace (recommended)
/plugin marketplace add Przemocny/critical-briefs
/plugin install critical-briefs@critical-briefs

# Skills become auto-discoverable
```

### Manual Installation
```bash
# Clone repository
git clone https://github.com/Przemocny/critical-briefs.git
cd critical-briefs

# Copy to local skills directory
cp -r skills/* ~/.claude/skills/
```

### Development & Testing
```bash
# Edit skills
vim skills/critical-business-brief/SKILL.md

# Test locally
cp -r skills/* ~/.claude/skills/
# Then test in Claude Code conversations
```

---

## File Structure & References

### Each Skill Contains:

**SKILL.md** - Complete skill instructions
- Overview and principles
- Detailed workflow (4 phases)
- Dialogue style and tactics
- Brief creation structure
- Special cases handling
- Quality checklist
- Key reminders

**references/categories-guide.md** - Deep dive on each category
- What each category explores
- Why it matters
- Common mistakes
- Good vs. bad examples

**references/questions-library.md** - Critical questions per category
- Skeptical questions to expose weaknesses
- Probing questions for specificity
- Reality-check questions

**references/red-flags.md** - Warning signs per category
- Fatal red flags (show-stoppers)
- Serious red flags (major concerns)
- Caution flags (watch carefully)

---

## Output Format

Skills create structured briefs in `.ideas/[idea-name]/`:

```
.ideas/
└── my-startup-idea/
    ├── business.md      # From critical-business-brief
    ├── process.md       # From critical-process-brief
    └── app.md           # From critical-app-brief
```

### Business Brief Structure
- 14 categories (Problem → Budget)
- Uncertainties per category
- Red flags identified
- Summary assessment (strengths, challenges, next steps)

### Process Brief Structure
- 20 categories (4 domains: Core, Data, Requirements, Tech+Scale)
- Step-by-step flows
- Edge cases and exceptions
- Scale testing (2x/10x/100x)
- Summary assessment (weaknesses, red flags, must-fix items)

### App Brief Structure
- 15 categories (4 domains: Definition, UX, Tech, Execution)
- Must-have vs. out-of-scope
- Key flows and screens
- Simple tech stack
- Timeline and costs
- Summary assessment (scope check, red flags)

---

## Contributing

This is a public repository for critical brief skills.

### Contributions Welcome:
- Additional critical brief skills (product, marketing, financial, etc.)
- Additional critic skills (code review, architecture review, security review)
- Improvements to existing skills
- Additional reference materials (questions, red flags, categories)
- Bug fixes and clarifications

### Pull Request Guidelines:
1. Test skill with real users before submitting
2. Follow existing skill structure (4-phase workflow)
3. Include comprehensive references/ subdirectory
4. Update README.md if adding new skill
5. Maintain critical/skeptical tone throughout

---

## Coding Conventions

### Markdown Style
- **Headers:** ATX style (`#`, `##`, etc.)
- **Lists:** Consistent indentation (2 spaces for nested)
- **Code blocks:** Fenced with triple backticks and language identifier
- **Emphasis:** `**bold**` for important, `*italic*` for subtle

### Skill Development
- Follow Agent Skills specification from [skill.md](https://skill.md/)
- Include YAML frontmatter with name and description
- Structure: Overview → Workflow → Special Cases → Quality Checklist → Reminders
- Always include references/ subdirectory with 3 files:
  - `categories-guide.md` (detailed category explanations)
  - `questions-library.md` (critical questions library)
  - `red-flags.md` (warning signs and problems)

### File Naming
- Skills: `critical-[topic]-brief` (kebab-case)
- Ideas: `.ideas/[idea-name]/` (kebab-case folder names)
- Briefs: `business.md`, `process.md`, `app.md` (lowercase, descriptive)

### Testing Requirements
- Test with real user scenarios before committing
- Verify brief output is high quality
- Check that reference files are comprehensive
- Ensure critical tone is maintained throughout
- Validate that uncertainties are marked properly

---

## Design Philosophy

### Skeptical by Design
These skills are intentionally tough. They find problems, ask hard questions, demand evidence, and cut ruthlessly. Think of them as experienced mentors who have seen failures and want to prevent them.

### Finding Problems Is a Gift
It's better to discover fatal flaws in a 30-minute conversation than after 6 months of work. The most valuable thing these skills do is expose problems early, when they're cheap to fix (or pivot from).

### Three Types of Critical Thinking

1. **Business Critical** (critical-business-brief)
   - Is this a real problem? For whom? How do you know?
   - Why would customers pay? What are they doing today?
   - Who else is solving this? Why haven't they succeeded?

2. **Process Critical** (critical-process-brief)
   - How exactly does this work? Step by step?
   - What breaks when volume doubles? When John is sick?
   - Where are the single points of failure? What's the backup?

3. **Scope Critical** (critical-app-brief)
   - Which ONE feature tests your hypothesis?
   - Can you cut that? What's the absolute minimum?
   - For 10 users, do you need [complex feature]?

### Reality Over Aspiration
These skills assume:
- User hasn't thought through details (often true)
- Things are more complex than they appear (always true)
- Scope creeps (inevitably happens)
- Resources are limited (always)
- Users overestimate what they know (common)

Better to be skeptical and discover it was fine, than optimistic and waste months.

---

## Related Resources

- [Anthropic Skills Repository](https://github.com/anthropics/skills) - Official skills examples
- [Agent Skills Specification](https://agentskills.io) - Format documentation
- [CampusAI](https://campus.ai) - Project creator

---

## License

Apache 2.0

---

**Made by CampusAI** | **Version 1.0.0** | [GitHub](https://github.com/Przemocny/critical-briefs)
