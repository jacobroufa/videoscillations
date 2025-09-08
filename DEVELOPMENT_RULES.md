# Development Rules for Hypnewcade

## Core Principles

### 1. Prioritize Simplicity
- Keep components, hooks, and methods simple and focused
- Avoid over-engineering or premature optimization
- Prefer readable code over clever solutions
- Break down complex problems into smaller, manageable pieces

### 2. Separate Data from Components
- Use centralized state management (Zustand)
- Keep business logic out of UI components
- Components should primarily handle rendering and user interaction
- Data transformations should live in utility functions

### 3. Add Unit Tests for Non-Rendering Code
- All utility functions must have comprehensive tests
- All store/state management must be tested
- Business logic must be tested in isolation
- Aim for high test coverage on logic, not rendering

### 4. Version Control Everything
- **COMMIT AFTER EACH USER INSTRUCTION** - Never batch multiple user requests into one commit
- **Commit immediately** after implementing each piece of user feedback or new instruction
- Use descriptive commit messages that capture the specific change made
- Use semantic commit messages when possible
- Track incremental progress with individual commits, not just final states
- If implementing multiple sub-tasks from one instruction, commit each sub-task individually

### 5. Run Tests on Change
- Tests should run in watch mode alongside the development server
- Continuous feedback on code changes
- Fix tests immediately when they break

### 6. Change Approach When Repeating
- If the same request is made more than twice, step back
- Consider if the approach needs to change
- Ask for clarification or disambiguation
- Don't keep trying the same failing approach

## Project-Specific Rules

### 7. Start Simple, Build Up
- Begin with basic shapes (spheres only)
- Add complexity incrementally
- Test each addition thoroughly before moving on

### 8. Consistent Naming
- "Frequency" not "Diameter" for tiling density
- Avoid duplicate/confusing parameters
- Use clear, descriptive names

### 9. Central Coordinate System
- All rotations around (0, 0, 0) in viewport center
- Consistent 3D coordinate system throughout

### 10. Read Before Acting
- Always read the full request before beginning execution
- Confirm understanding of complex requests
- Break down multi-part requests into clear steps

## Reference This File
At the start of each development session, reference these rules to ensure consistent development practices.