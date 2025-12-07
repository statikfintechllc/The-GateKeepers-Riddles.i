# Automated Riddle Submission System

This document explains how the automated riddle submission system works using GitHub Copilot agent integration.

## Overview

The riddle submission system leverages GitHub Copilot's coding agent to automatically:
1. Accept issue requests for new riddles
2. Automatically assign GitHub Copilot agent to process the request
3. Let Copilot agent find or create high-quality riddles
4. Create new riddle files following the established format
5. Update the riddles registry
6. Open a pull request for review

## Workflow Configuration

### Key Components

1. **Issue Template**: `.github/ISSUE_TEMPLATE/riddle_request.md`
   - Users can request new riddles by creating an issue
   - Automatically assigns `github-copilot[bot]` as the assignee
   - Includes riddle-request label

2. **Auto-Assignment Workflow**: `.github/workflows/auto-assign-copilot.yml`
   - Triggers when riddle-request issues are opened
   - Assigns GitHub Copilot agent to the issue
   - Adds guidance comment for the agent

3. **Agent Instructions**: `.github/agents/riddle-finder.agent.md`
   - Defines the riddle-finder agent behavior
   - Specifies quality standards and output format
   - Provides examples and guidelines

### Permissions Required
- `issues: write` - To assign and comment on issues
- `contents: write` - To create commits
- `pull-requests: write` - To create PRs

## How It Works

### 1. Issue Creation
A user (or automated system) creates an issue using the riddle_request template:
- Issue is created with `riddle-request` label
- Issue template pre-assigns `github-copilot[bot]`
- Can specify preferences for source type and difficulty

### 2. Auto-Assignment
The `auto-assign-copilot.yml` workflow triggers:
- Detects riddle-request label
- Assigns GitHub Copilot agent to the issue
- Adds guidance comment linking to agent instructions

### 3. Copilot Agent Processing
GitHub Copilot agent takes over:
- Reads riddle-finder agent instructions
- Searches for or creates high-quality riddles
- Validates against quality standards
- Checks for duplicates in existing riddles

### 4. File Creation
Copilot agent creates new riddle file in `system/riddles/`:
- Follows naming convention: `{riddle-id}.riddle.js`
- Includes all required fields from template
- Adds metadata (source, date)

### 5. Registry Update
Copilot agent updates `system/riddles/riddles.js`:
- Adds import statement for new riddle
- Appends to riddles array
- Maintains proper formatting

### 6. Pull Request
Copilot agent opens a PR with:
- Descriptive title: "🧩 New Riddle: {Title}"
- Detailed body with riddle info
- Review checklist
- Appropriate labels
- Links to original issue

## Customization

### Modifying Agent Behavior

Edit `.github/agents/riddle-finder.agent.md` to customize:
- Riddle quality standards
- Preferred riddle sources
- Output format requirements
- Duplicate detection logic

### Adjusting Agent Instructions

The agent instructions include:
- Search strategy guidance
- Quality evaluation criteria
- Processing requirements
- Output format specifications

### Quality Standards

The riddle-finder agent follows strict quality checks:
- Riddle clarity and unambiguity
- Logical and verifiable answers
- Appropriate difficulty level
- Family-friendly content
- Theme consistency with repository

## Creating Riddle Requests

### Via Issue Template

1. Go to Issues tab in GitHub
2. Click "New Issue"
3. Select "Riddle Request Issue" template
4. Optionally specify preferences
5. Submit the issue
6. GitHub Copilot agent will be automatically assigned

### Manual Assignment

If creating a custom issue:
1. Add the `riddle-request` label
2. The auto-assign workflow will trigger
3. Copilot agent will be assigned automatically

## Reviewing Submissions

When a new riddle PR is created:

### Review Checklist
- [ ] **Riddle Quality**: Is it interesting and well-written?
- [ ] **Answers**: Are correct answers comprehensive?
- [ ] **Close Answers**: Do they make sense?
- [ ] **Hints**: Do they progress logically from vague to specific?
- [ ] **Feedback**: Are messages helpful and encouraging?
- [ ] **Explanation**: Does it make sense?
- [ ] **Uniqueness**: Not a duplicate of existing riddles?
- [ ] **Appropriate**: Family-friendly content?

### Actions
- ✅ **Approve**: Merge the PR to add the riddle
- ✏️ **Edit**: Make changes in the PR before merging
- ❌ **Close**: Reject if not suitable

## Troubleshooting

### Copilot Agent Not Assigned
Check that:
- Issue has `riddle-request` label
- Auto-assign workflow is enabled
- Repository has GitHub Copilot access

### Copilot Agent Doesn't Start Work
Possible reasons:
- Agent instructions may need clarification
- Issue description may be unclear
- Repository permissions may be insufficient

### No PRs Created
Check if:
- Copilot agent encountered duplicates
- Quality standards weren't met
- Agent instructions need adjustment
- Issue description was ambiguous

### Assignment Fails
The auto-assign workflow will:
- Log errors in Actions tab
- Add comment to issue explaining failure
- Suggest manual assignment

## Security Considerations

### GitHub Copilot Access
- Ensure your repository/organization has Copilot enabled
- Copilot agent operates in sandboxed environment
- All changes go through PR review process
- No direct merge access without approval

### Token Permissions
The workflows use minimal required permissions:
- `GITHUB_TOKEN` for issue/PR operations
- No additional secrets needed
- All operations logged in Actions

### Content Safety
- Agent instructions emphasize family-friendly content
- Manual review required before merging
- Duplicate detection prevents spam
- Quality standards filter inappropriate content

## Benefits of Copilot Integration

### Advantages
- **Intelligent Processing**: Copilot understands context and quality
- **No Scheduled Runs**: On-demand, issue-driven workflow
- **Natural Language**: No complex configuration needed
- **Iterative Improvement**: Can respond to feedback on PRs
- **Reduced Maintenance**: No custom CLI tools or dependencies

### vs. Traditional Automation
- Traditional: Scheduled runs, fixed logic, brittle parsing
- Copilot: On-demand, adaptive, intelligent processing

## Dependencies

The workflow uses:
- GitHub Copilot agent (cloud-based)
- GitHub Actions (`actions/github-script@v7`)
- No Node.js or npm dependencies required
- No external APIs or services needed

## Support

For issues or questions:
- Open an issue on GitHub
- Check workflow logs in Actions tab
- Review PR comments for feedback
