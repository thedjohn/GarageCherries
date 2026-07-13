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

## Auditing Requirements Against Code
Whenever asked whether the code satisfies a requirement, feature claim, or prior "we fixed this" statement:
1. Do not rely on memory or assumptions about what the code "probably" does. Read the actual files before making any claim.
2. For every requirement, quote the specific line(s) or file(s) that satisfy it. If no matching code is found, say so explicitly — do not infer that it "likely exists elsewhere."
3. If a requirement is ambiguous or the code is unclear, flag it as a question rather than guessing the intended behavior.
4. Output as a table: | Requirement | Code location (file:line) | Status (Met/Not Met/Unclear) | Evidence |
5. End with a "Verified vs Assumed" section listing anything not directly confirmed.
