<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Development Rules

## CRITICAL
- Existing working code is considered production code.
- NEVER modify working code unless it is directly required for the requested feature.
- NEVER refactor unrelated files.
- NEVER rename methods, properties, routes, APIs, or database fields without approval.
- NEVER change public method signatures.
- NEVER remove existing functionality.
- NEVER change CSS or UI unrelated to the requested task.

## Before Making Changes
1. Explain what files will change.
2. Explain WHY each file needs to change.
3. Ask for approval if more than 3 files will be modified.

## Implementation Rules
- Make the smallest possible change.
- Reuse existing code.
- Match the existing coding style.
- Preserve backwards compatibility.
- Do not "improve" unrelated code.
- Do not fix unrelated warnings.
- Do not optimize code unless asked.

## Verification
After implementation:
- Build the solution.
- Run tests.
- Verify no existing functionality was changed.
- Report exactly what changed.
