# Critical Briefs

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Claude Skills](https://img.shields.io/badge/Claude-Agent_Skills-purple)](https://agentskills.io)
[![CampusAI](https://img.shields.io/badge/Made_by-CampusAI-orange)](https://campus.ai)

Agent Skills for Claude AI that validate business ideas, stress-test processes, and design MVPs through skeptical dialogue. Challenge assumptions, expose blind spots, and think clearly about reality before you build.

## What are Critical Briefs?

Critical Briefs use **challenging, skeptical dialogue** to create structured documents that help users:
- Validate business ideas by exposing weaknesses and testing assumptions
- Stress-test operational processes to find blind spots and failure points
- Design focused MVPs by ruthlessly cutting scope and challenging complexity
- Think clearly about reality instead of optimistic scenarios

These skills are **skeptical by design** - they find problems, ask tough questions, demand evidence, and cut ruthlessly. Think of them as experienced mentors who've seen failures and want to prevent them.

## Available Skills

### 🏢 critical-business-brief
Transforms vague business ideas into structured, reality-tested business briefs through critical dialogue. Systematically explores problem, customer, solution, business model, competition, and more. Challenges assumptions and demands evidence.

**Use when:**
- User presents an unclear or early-stage business idea
- Mentions starting a business or business opportunity
- Needs to validate assumptions about a concept
- Asks to clarify or validate a business opportunity

**Output:** Structured business brief in `.ideas/[idea-name]/business.md`

### ⚙️ critical-process-brief
Maps out and stress-tests operational processes to expose hidden complexity, bottlenecks, and scalability issues. Probes step-by-step flows, edge cases, failure points, and scale scenarios (2x, 10x, 100x).

**Use when:**
- User wants to map out business processes or operations
- Needs to think through "how this works operationally"
- Questions about delivery, workflows, or process details
- Needs to validate operational feasibility

**Output:** Detailed process brief in `.ideas/[idea-name]/process.md`

### 📱 critical-app-brief
Designs focused MVP applications through ruthless scope-cutting dialogue. Challenges every feature, pushes for simpler tech, and keeps laser focus on building minimum viable product to test core hypotheses.

**Use when:**
- User wants to turn business ideas and processes into an application
- Mentions "build an app", "MVP", or application design
- Needs help defining what to build and what to cut
- Ready to design application after clarifying business and processes

**Output:** MVP application brief in `.ideas/[idea-name]/app.md`

## Installation

### In Claude Code

1. **Register the marketplace:**
   ```bash
   /plugin marketplace add Przemocny/critical-briefs
   ```

2. **Install the plugin:**
   ```bash
   /plugin install critical-briefs@critical-briefs
   ```

3. **Use the skills** by mentioning them in conversation:
   - "I have a business idea..." (triggers critical-business-brief)
   - "How would this work operationally?" (triggers critical-process-brief)
   - "Let's build an MVP for this" (triggers critical-app-brief)

### Manual Installation

Clone the repository and copy skills to your local `~/.claude/skills/` directory:

```bash
git clone https://github.com/Przemocny/critical-briefs.git
cd critical-briefs
cp -r skills/* ~/.claude/skills/
```

## How It Works

All three skills follow a similar workflow:

1. **Initial Understanding** - Open questions to understand the concept
2. **Critical Exploration** - Systematic questioning across key categories
3. **Brief Creation** - Structured documentation with marked uncertainties
4. **Wrap-up** - Honest assessment and next steps

### Key Principles

- **Critical, not supportive** - Challenge assumptions, find weaknesses, cut ruthlessly
- **Reality over optimism** - Point out difficulties and obstacles
- **Natural dialogue** - Conversational flow, not rigid questionnaire
- **Evidence-based** - Push for concrete evidence, not assumptions
- **Structured output** - Map conversations to actionable briefs

## Output Format

Skills create structured briefs in `.ideas/[idea-name]/`:

```
.ideas/
└── my-business-idea/
    ├── business.md    # Business concept validation (critical-business-brief)
    ├── process.md     # Operational process analysis (critical-process-brief)
    └── app.md         # MVP application design (critical-app-brief)
```

Each skill includes:
- **Reference materials** in `references/` subdirectory:
  - `categories-guide.md` - Detailed explanation of each category
  - `questions-library.md` - Critical questions library
  - `red-flags.md` - Common warning signs and problems

Each brief includes:
- Detailed exploration of key categories
- **Uncertainties** marked explicitly
- **Red flags** identified clearly
- **Critical challenges** prioritized
- **Next steps** for validation/action

## Philosophy

These skills operate on the principle that **finding problems early is a gift**. It's better to discover fatal flaws in conversation than after months of work. The skills are designed to be:

- **Skeptical** - Assume issues exist until proven otherwise
- **Direct** - Point out contradictions and problems clearly
- **Realistic** - Provide context from common failures
- **Honest** - No sugarcoating of serious problems
- **Ruthless** - Default to cutting scope, challenging complexity, demanding evidence

## Contributing

This is a public repository for critical brief skills. Contributions are welcome for:
- Additional critical brief skills (product brief, marketing brief, financial brief, etc.)
- Additional critic skills (code review, architecture review, security review, etc.)
- Improvements to existing skills
- Additional reference materials (questions, red flags, categories)
- Bug fixes and clarifications

## License

Apache 2.0 (for skill implementations)

## Related

- [Anthropic Skills Repository](https://github.com/anthropics/skills)
- [Agent Skills Specification](https://agentskills.io)
- [CampusAI](https://campus.ai)
