---
name: Repository_Mapper_Request
about: Request that the Repo-Mapper agent scan and update repository metadata
title: "Repository Mapping Requested"
labels: agent-request, mapper-request, maintenance
assignees:
---

## 🗺️ Repository Mapping Request

This issue requests that the Repo-Mapper Agent scan the repository and update the comprehensive metadata database.

### Scan Configuration

**Scan Type** (choose one):
- [ ] Full Scan - Complete repository analysis (recommended for major changes)
- [ ] Incremental Scan - Only analyze changed files (faster)
- [ ] Quick Scan - Basic structure update only

**Priority Areas** (optional):
- [ ] All files
- [ ] Code files only (JavaScript, CSS, HTML)
- [ ] Riddle files
- [ ] Documentation
- [ ] Infrastructure (workflows, configs)

### Expected Actions

The Repo-Mapper Agent will:
1. ✅ Connect to SQLite database (`system/database/`)
2. ✅ Scan repository structure and files
3. ✅ Perform AI-powered code analysis
4. ✅ Extract functions, classes, and dependencies
5. ✅ Build dependency graph
6. ✅ Calculate complexity metrics
7. ✅ Update database with all metadata
8. ✅ Generate output files:
   - `system/database/data/repo-map.json`
   - `system/database/data/code-index.json`
   - `system/database/data/ARCHITECTURE.md`
   - `system/database/data/metrics.json`
9. ✅ Create PR with changes

### Verification

After mapping, you can verify with:

```bash
cd system/database
npm run stats                    # View database statistics
./cli/repo-db.js files           # List all files
./cli/repo-db.js functions       # List all functions
./cli/repo-db.js search "term"   # Search database
./cli/repo-db.js deps            # View dependencies
./cli/repo-db.js complexity      # Complexity report
```

### Notes

- The agent uses the SQLite database system in `system/database/`
- Full scans take longer but provide complete analysis
- Incremental scans are faster for minor updates
- All scan history is tracked in the database
- The agent performs AI-powered analysis, not just regex parsing

---

*This issue will be automatically assigned to github-copilot[bot] for processing.*
*For details, see [.github/agents/repo-mapper.agent.md](.github/agents/repo-mapper.agent.md)*
