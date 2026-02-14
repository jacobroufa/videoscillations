<objective>
Add a git commit granularity rule to CLAUDE.md that ensures future development sessions produce clean, atomic commits. Each discrete, working change should be its own commit — nothing semi-working or broken should ever be committed.
</objective>

<context>
Read `./CLAUDE.md` for existing project rules.

This project uses a prompt-based development workflow where Claude executes prompts (`./prompts/*.md`) that may involve multiple file changes. Currently, all changes from a prompt get committed as a single large commit. The user wants finer-grained, atomic commits so the git history is clean and bisectable.
</context>

<requirements>
Add a new section to `./CLAUDE.md` titled "## Git commit rules" (after the existing sections) with these rules:

1. **Atomic commits**: Each discrete, self-contained change gets its own git commit. A "discrete change" is the smallest set of modifications that leaves the codebase in a fully working state.
2. **Never commit broken state**: Every commit must leave the application in a working state. If a change spans multiple files but they all must change together to work, that's one commit. If changes are independent, they're separate commits.
3. **Commit granularity per prompt**: A single prompt execution may produce one commit (simple change) or multiple commits (complex prompt with independent stages). The number of commits should match the number of discrete working changes, not be artificially collapsed into one.
4. **Commit message format**: Use conventional commits (`feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `test:`, `chore:`) with concise, lowercase descriptions.
5. **Stage specific files**: Always `git add` specific files by name. Never use `git add .` or `git add -A`.
</requirements>

<output>
Modify `./CLAUDE.md` — append the new section after the existing "Preset migration rule" section.
</output>

<verification>
- Read the updated CLAUDE.md and confirm the new section is present and well-formatted
- Confirm existing sections (Tech stack, Preset migration rule) are unchanged
</verification>

<success_criteria>
- CLAUDE.md contains a "Git commit rules" section with all 5 rules
- Existing content is preserved
- Rules are clear enough that a future Claude session will follow them without ambiguity
</success_criteria>
