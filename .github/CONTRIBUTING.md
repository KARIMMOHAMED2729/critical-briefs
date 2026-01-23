# Contributing to Critical Briefs

Thank you for your interest in contributing! This repository welcomes contributions that improve critical brief creation for Claude AI users.

## How to Contribute

### 1. Report Issues

Found a bug or have a suggestion?
- Open an [Issue](../../issues)
- Describe the problem or idea clearly
- Include examples if applicable

### 2. Improve Existing Skills

You can help by:
- Adding more critical questions to `references/questions-library.md`
- Expanding red flags in `references/red-flags.md`
- Improving category explanations in `references/categories-guide.md`
- Fixing typos or clarifying instructions in `SKILL.md` files
- Adding examples of good/bad dialogue

### 3. Create New Skills

We welcome new critic skills! Consider:

**Additional Critical Brief Skills:**
- `critical-product-brief` - Product strategy validation
- `critical-marketing-brief` - Marketing plan stress-testing
- `critical-financial-brief` - Financial model analysis
- `critical-hiring-brief` - Team structure validation

**Additional Critical Brief Skills:**
- `code-critic` - Critical code review
- `architecture-critic` - System architecture analysis
- `security-critic` - Security assessment
- `ux-critic` - UX/UI critical evaluation

### New Skill Requirements

Each new skill must include:
1. `SKILL.md` with proper YAML frontmatter (name, description)
2. Clear instructions for Claude
3. Reference files if needed (questions, red flags, categories)
4. Examples of good dialogue
5. Documentation of output format

### 4. Pull Request Process

1. **Fork** the repository
2. **Create a branch** for your contribution:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**:
   - Follow existing code style and structure
   - Test with Claude to ensure it works
   - Update documentation if needed
4. **Commit** with clear messages:
   ```bash
   git commit -m "Add critical questions for market sizing"
   ```
5. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request** with:
   - Clear description of what changed and why
   - Examples of the improvement in action
   - Reference any related issues

## Contribution Guidelines

### Writing Style

- **Be direct and skeptical** - These skills are meant to challenge, not validate
- **Use examples** - Show good/bad dialogue patterns
- **Keep it concise** - Skills are loaded into context, avoid bloat
- **Mark uncertainties** - Note what's not yet perfected

### Skill Design Principles

1. **Skeptical by default** - Assume problems exist
2. **Evidence-based** - Demand proof, not assumptions
3. **Practical** - Real questions that expose real problems
4. **Structured** - Map dialogue to actionable outputs
5. **Natural** - Conversational flow, not rigid templates

### Code of Conduct

- Be respectful and constructive
- Focus on improving the skills, not criticizing contributors
- Assume good intent
- Help others learn

## Testing Your Contribution

Before submitting:
1. Install your changed/new skill in Claude
2. Test with real scenarios
3. Verify the output format is correct
4. Check that reference files are properly linked
5. Ensure documentation is clear

## Questions?

- Open a [Discussion](../../discussions) for general questions
- Check existing [Issues](../../issues) for similar questions
- Review [DOCUMENTATION.md](../DOCUMENTATION.md) for skill structure details

## Recognition

Contributors will be:
- Listed in release notes
- Acknowledged in commit history
- Appreciated by the community 🙏

---

**Remember:** The goal is to help people find problems early, think clearly, and build better. Every contribution that advances this goal is valuable.
