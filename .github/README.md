# The Gatekeeper's Riddle - Interactive

An interactive web-based riddle game that challenges players to solve philosophical puzzles about AI, code agents, digital identity, and more. Featuring multiple riddles with dynamic hints, custom feedback, and a sleek mobile-optimized interface.

## About

This is a beautifully designed Progressive Web App (PWA) with:
- **Multiple Riddles**: Collection of thought-provoking riddles including "The Gatekeeper's Riddle" and "The Mirror's Paradox"
- **Elegant Dark Theme**: Modern UI with gradient backgrounds and smooth animations
- **Dynamic Hints System**: Each riddle has its own progressive hints that update as you switch riddles
- **Custom Feedback**: Riddle-specific messages for wrong and close answers
- **Attempt Tracking**: Keep track of how many tries it takes to solve each riddle
- **Responsive Design**: Optimized for mobile with compact bubble button bar
- **PWA Support**: Works offline with service worker caching and manual refresh capability
- **Modal Reveals**: Dramatic answer reveal with thematic explanations

## Live Demo

Visit [The Gatekeeper's Riddle](https://statikfintechllc.github.io/The_GateKeepers_Riddles.i/) to start playing immediately!

## The Challenge

Can you solve all the riddles? Test your logic, lateral thinking, and understanding of technology, philosophy, and digital identity. Each riddle explores different themes at the intersection of code, reflection, and consciousness. With More to come.

## Features

### Core Gameplay
- **Multiple Riddles**: Expandable riddle system with easy addition of new challenges
- **Smart Answer Detection**: Accepts multiple variations of correct answers
- **Close Answer Recognition**: Get hints when you're on the right track
- **Progress Tracking**: Your attempts are saved per riddle

### User Interface
- **Compact Mobile UI**: Bubble button bar that fits under the input field
- **Previous/Next Navigation**: Easily move between riddles
- **Riddle Selection**: Choose any riddle from the selector modal
- **Help & Hints**: Access game instructions and progressive hints
- **Request New Riddles**: Built-in feedback system for suggesting riddles

### Technical Features
- **State-of-the-Art Database**: SQLite-based system with 29 tables, full-text search, and enterprise features
- **Modular Architecture**: Separate CSS, JavaScript, and riddle modules
- **PWA Capabilities**: Installable, works offline, can be refreshed manually
- **Service Worker**: Intelligent caching for optimal performance
- **No Dependencies**: Zero external libraries or frameworks required (except database)
- **ES6 Modules**: Clean, maintainable code structure
- **CLI Tools**: Comprehensive command-line interface for database management
    
## Project Structure
```txt
The GateKeepers Riddle/
├── LICENSE
├── _config.yml
├── docs
│   ├── AUTOMATED_RIDDLES.md
│   ├── BreakDown.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   └── ISSUE_RIDDLE_REQUESTS.md
├── .github
│   ├── ISSUE_TEMPLATE
│   │   └── riddle_request.md
│   ├── PULL_REQUEST_TEMPLATE
│   │   └── riddle_request.md
│   ├── README.md
│   ├── agents
│   │   ├── repo-mapper.agent.md
│   │   └── riddle-finder.agent.md
│   └── workflows
│       ├── auto-assign-copilot.yml
│       ├── repo-mapper-agent.yml
│       └── riddle-finder-agent.yml
├── index.html
└── system
    ├── css
    │   └── game.css
    ├── database
    │   ├── COMPARISON.md
    │   ├── QUICKSTART.md
    │   ├── README.md
    │   ├── cli
    │   │   └── repo-db.js
    │   ├── data
    │   │   ├── ARCHITECTURE.md
    │   │   ├── code-index.json
    │   │   ├── metrics.json
    │   │   └── repo-map.json
    │   ├── lib
    │   │   ├── database.js
    │   │   ├── init_db.sh
    │   │   └── migrate.js
    │   ├── package.json
    │   └── schema
    │       └── core.sql
    ├── js
    │   ├── auth.js
    │   ├── game.js
    │   └── sw.js
    ├── riddle.html
    ├── riddles
    │   ├── riddle.template.js
    │   └── riddles.js
    ├── scripts
    │   └── l.h.s.script
    └── storage
        ├── icon.logo.png
        └── manifest.json
```

<div align="center">
    
***18 directories, 41 files, &#8734; Riddles***

</div>

## 🗄️ State-of-the-Art Database System

This repository now features a **comprehensive database system** that rivals PostgreSQL in functionality, transforming it into a true state-of-the-art mono-repo with enterprise-grade data management.

### Database Features
- **29 Interconnected Tables** with full relational integrity
- **SQLite Engine** with WAL mode for performance
- **Full-Text Search** (FTS5) across files and functions
- **ACID Transactions** for data consistency
- **30+ Indexes** for fast queries
- **6 Optimized Views** for common operations
- **CLI Management Tool** with 8+ commands
- **JavaScript API** for programmatic access
- **Migration Tools** from JSON to database
- **Backup & Restore** capabilities

### Quick Start

```bash
cd system/database
npm install
npm run init      # Initialize database
npm run migrate   # Migrate existing JSON data
npm run stats     # View statistics
```

See the [Database Documentation](system/database/README.md) for complete details.

## How to Play

1. **Clone or Download** this repository
2. **Open** `index.html` in any modern web browser (or host it on a web server)
3. **Read** the riddle carefully
4. **Enter** your answer in the input field
5. **Submit** your guess and get feedback
6. **Use hints** if you're stuck (click the hints button)
7. **Switch riddles** using Previous/Next or the riddle selector
8. **Give up** to reveal the answer if needed

## Adding New Riddles

Want to add your own riddle? It's easy!

1. **Copy** the `riddle.template.js` file
2. **Rename** it to `{your-riddle-name}.riddle.js`
3. **Fill in** all the required fields:
   - `id`: Unique identifier (lowercase, no spaces)
   - `title`: Display title
   - `text`: The riddle text (use backticks for multiline)
   - `correctAnswers`: Array of valid answers (lowercase)
   - `closeAnswers`: Array of near-miss answers (lowercase)
   - `hints`: Array of 6+ progressive hints
   - `wrongAnswerFeedback`: Message for incorrect answers
   - `closeAnswerFeedback`: Message for close answers
   - `explanation`: Why this is the answer
   - `answer`: Official answer to display
4. **Import** your riddle in `riddles.js`
5. **Add** it to the riddles array
6. **Test** your riddle in the game!

### Example Riddle Structure

```javascript
export const riddle = {
    id: 'my-riddle',
    title: 'My Amazing Riddle',
    text: `What walks on four legs in the morning,
two legs at noon,
and three legs in the evening?`,
    correctAnswers: ['human', 'person', 'man'],
    closeAnswers: ['animal', 'creature', 'being'],
    hints: [
        'Think about the stages of life',
        'Morning, noon, and evening represent different times',
        // ... more hints
    ],
    wrongAnswerFeedback: 'Not quite. Think metaphorically...',
    closeAnswerFeedback: 'You\'re warm! Consider the riddle\'s metaphor.',
    explanation: 'Humans crawl as babies, walk on two legs as adults, and use a cane in old age.',
    answer: 'A Human'
};
```

## PWA Features

### Offline Support
The app uses a service worker to cache all resources, allowing you to play even without an internet connection.

### Manual Refresh
If you need to force-update the app:
1. Click the **More** button (three dots)
2. Select **Refresh App**
3. This clears all caches and reloads the latest version

### Installation
On mobile devices, you can install this as a standalone app:
- **iOS**: Tap Share → Add to Home Screen
- **Android**: Tap Menu → Install App

## Development

### Local Development
Simply open `index.html` in a browser or use a local server:

```bash
# Python 3 (recommended)
python3 -m http.server 8080
# Node.js
npx http-server
```

### Service Worker
The service worker is configured to cache:
- HTML, CSS, and JavaScript files
- Riddle module files
- App icons and manifest

External resources (badges, CDN content) are intentionally not cached to keep cache size minimal.

## Browser Support

Works on all modern browsers:
- Chrome/Edge (90+)
- Firefox (88+)
- Safari (14+)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

We welcome contributions! Here are some ways to help:
- **Submit new riddles** via pull request (use the template!)
- **Report bugs** or suggest features via issues
- **Improve documentation** or add examples
- **Enhance UI/UX** with design improvements

## Automated Systems

This repository includes two intelligent automation systems plus a UI-initiated PR flow:
- **UI PR Riddle Request**: The game UI now opens a pull request using the `riddle_request` PR template. Expect the app feed to refresh in ~10 minutes after the PR is processed. No issue workflow is required.
- **UI Issue-based Riddle Request**: The game UI now opens an issue using the `riddle_request` issue template which requests the Riddle Finder Agent to open a code-agent PR. The issue is automatically assigned to three Copilot agent accounts and one maintainer for Notes review; the repository workflow will trigger the Riddle Finder Agent, watch the generated PR, and approve/merge it when the agent work is complete (target: within 10 minutes).
- **Riddle Finder Agent**: Automatically searches for and submits new riddles daily or when requested via an issue. See [agent instructions](.github/agents/riddle-finder.agent.md) and [workflow](.github/workflows/riddle-finder-agent.yml).
- **Repository Mapper Agent**: Maintains comprehensive repository documentation and code maps. See [agent instructions](.github/agents/repo-mapper.md) and [workflow](.github/workflows/repo-mapper-agent.yml).

---

<div align="center">
  <a href="https://github.com/sponsors/statikfintechllc">
    <img src="https://raw.githubusercontent.com/statikfintechllc/statikfintechllc/master/badges/L.W.badge.svg" alt="Like my work?" />
  </a>
</div>
<div align="center">
<a href="https://github.com/sponsors/statikfintechllc">
  <img src="https://raw.githubusercontent.com/statikfintechllc/statikfintechllc/master/badges/git.sponsor.svg">
</a><br>
<a href="https://ko-fi.com/statikfintech_llc">
  <img src="https://raw.githubusercontent.com/statikfintechllc/statikfintechllc/master/badges/kofi.sponsor.svg">
</a><br>
<a href="https://patreon.com/StatikFinTech_LLC">
  <img src="https://raw.githubusercontent.com/statikfintechllc/statikfintechllc/master/badges/patreon.sponsor.svg">
</a><br>
<a href="https://cash.app/$statikmoney8">
  <img src="https://raw.githubusercontent.com/statikfintechllc/statikfintechllc/master/badges/cashapp.sponsor.svg">
</a><br>
<a href="https://paypal.me/statikmoney8">
  <img src="https://raw.githubusercontent.com/statikfintechllc/statikfintechllc/master/badges/paypal.sponsor.svg">
</a><br>
<a href="https://www.blockchain.com/explorer/addresses/btc/bc1qarsr966ulmcs3mlcvae7p63v4j2y2vqrw74jl8">
  <img src="https://raw.githubusercontent.com/statikfintechllc/statikfintechllc/master/badges/bitcoin.sponsor.svg">
</a><br>
<a href="https://etherscan.io/address/0xC2db50A0fc6c95f36Af7171D8C41F6998184103F">
  <img src="https://raw.githubusercontent.com/statikfintechllc/statikfintechllc/master/badges/ethereum.sponsor.svg">
</a><br>
<a href="https://app.chime.com/link/qr?u=StatikSmokTM">
  <img src="https://raw.githubusercontent.com/statikfintechllc/statikfintechllc/master/badges/chime.sponsor.svg">
</a>
</div>
<div align="center">

  <br/> [© 2025 StatikFinTech, LLC](https://www.github.com/statikfintechllc/The-GateKeepers-Riddles.i/blob/master/LICENSE)

  <a href="https://github.com/statikfintechllc">
    <img src="https://img.shields.io/badge/-000000?logo=github&logoColor=white&style=flat-square" alt="GitHub">
  </a>
  <a href="https://www.linkedin.com/in/daniel-morris-780804368">
    <img src="https://img.shields.io/badge/In-e11d48?logo=linkedin&logoColor=white&style=flat-square" alt="LinkedIn">
  </a>
  <a href="mailto:ascend.gremlin@gmail.com">
    <img src="https://img.shields.io/badge/-D14836?logo=gmail&logoColor=white&style=flat-square" alt="Email">
  </a>
  <a href="https://www.youtube.com/@Gremlins_Forge">
    <img src="https://img.shields.io/badge/-FF0000?logo=youtube&logoColor=white&style=flat-square" alt="YouTube">
  </a>
  <a href="https://x.com/GremlinsForge">
    <img src="https://img.shields.io/badge/-000000?logo=x&logoColor=white&style=flat-square" alt="X">
  </a>
  <a href="https://medium.com/@ascend.gremlin">
    <img src="https://img.shields.io/badge/-000000?logo=medium&logoColor=white&style=flat-square" alt="Medium">
  </a>
</div>

<!--
<div align="center">
  <img src="https://komarev.com/ghpvc/?username=statikfintechllc&color=8b0000&style=flat-square" alt="Profile Views">
</div>
-->
