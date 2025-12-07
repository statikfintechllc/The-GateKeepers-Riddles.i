// Import riddle data
import { riddles, getRiddleByIndex, getRiddleCount, getRiddleIndex } from '../riddles/riddles.js';
import { isAuthenticated, createRiddleRequestIssue, createRiddleRequestPullRequest, openGitHubPullRequestTemplate, redirectToLogin, clearGitHubToken } from './auth.js';

// Game state
let currentRiddleIndex = 0;
let currentRiddle = null;
let attempts = 0;
let riddleProgress = {}; // Track progress for each riddle

// Load progress from localStorage
function loadProgress() {
    const saved = localStorage.getItem('riddleProgress');
    if (saved) {
        try {
            riddleProgress = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load progress:', e);
            riddleProgress = {};
        }
    }
}

// Save progress to localStorage
function saveProgress() {
    localStorage.setItem('riddleProgress', JSON.stringify(riddleProgress));
}

// Get current riddle index from localStorage or default to 0
function loadCurrentRiddleIndex() {
    const saved = localStorage.getItem('currentRiddleIndex');
    return saved ? parseInt(saved, 10) : 0;
}

// Save current riddle index to localStorage
function saveCurrentRiddleIndex() {
    localStorage.setItem('currentRiddleIndex', currentRiddleIndex.toString());
}

// Initialize the game
function initGame() {
    loadProgress();
    currentRiddleIndex = loadCurrentRiddleIndex();
    loadRiddle(currentRiddleIndex);
    updateNavigationButtons();
    updateAuthButton();
}

// Load a riddle by index
function loadRiddle(index) {
    currentRiddle = getRiddleByIndex(index);
    if (!currentRiddle) {
        console.error('Failed to load riddle at index:', index);
        return;
    }
    
    currentRiddleIndex = index;
    saveCurrentRiddleIndex();
    
    // Reset attempts for this riddle (or load saved attempts)
    const progress = riddleProgress[currentRiddle.id] || { attempts: 0, solved: false };
    attempts = progress.attempts;
    
    // Update UI
    document.getElementById('riddleTitle').textContent = currentRiddle.title;
    document.getElementById('riddleText').innerHTML = currentRiddle.text.replace(/\n/g, '<br>');
    document.getElementById('attempts').textContent = `Attempts: ${attempts}`;
    document.getElementById('guessInput').value = '';
    document.getElementById('feedback').textContent = '';
    document.getElementById('feedback').className = 'feedback';
    
    updateNavigationButtons();
}

// Navigate to previous riddle
function previousRiddle() {
    if (currentRiddleIndex > 0) {
        loadRiddle(currentRiddleIndex - 1);
    }
}

// Navigate to next riddle
function nextRiddle() {
    if (currentRiddleIndex < getRiddleCount() - 1) {
        loadRiddle(currentRiddleIndex + 1);
    }
}

// Update navigation button states
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) {
        prevBtn.disabled = currentRiddleIndex === 0;
    }
    if (nextBtn) {
        nextBtn.disabled = currentRiddleIndex >= getRiddleCount() - 1;
    }
}

// Show riddle selector modal
function showRiddleSelector() {
    const modal = document.getElementById('riddleSelectorModal');
    const grid = document.getElementById('riddleGrid');
    
    // Clear and populate grid
    grid.innerHTML = '';
    
    riddles.forEach((riddle, index) => {
        const progress = riddleProgress[riddle.id] || { attempts: 0, solved: false };
        const card = document.createElement('div');
        card.className = 'riddle-card';
        if (index === currentRiddleIndex) {
            card.classList.add('active');
        }
        
        // Progress indicator
        let indicator = '○'; // Not attempted
        if (progress.solved) {
            indicator = '✓'; // Solved
        } else if (progress.attempts > 0) {
            indicator = '○'; // Attempted
        }
        
        card.innerHTML = `
            <div class="riddle-card-indicator">${indicator}</div>
            <div class="riddle-card-title">${riddle.title}</div>
            <div class="riddle-card-stats">${progress.attempts} attempt${progress.attempts !== 1 ? 's' : ''}</div>
        `;
        
        card.onclick = () => {
            loadRiddle(index);
            closeRiddleSelector();
        };
        
        grid.appendChild(card);
    });
    
    modal.classList.add('active');
}

// Close riddle selector modal
function closeRiddleSelector() {
    const modal = document.getElementById('riddleSelectorModal');
    modal.classList.remove('active');
}

// Show request riddle sub-menu
function showRequestRiddleMenu() {
    toggleMoreMenu(); // Close the More menu
    const modal = document.getElementById('requestRiddleModal');
    if (modal) {
        modal.classList.add('active');
    }
}

// Close request riddle modal
function closeRequestRiddleModal() {
    const modal = document.getElementById('requestRiddleModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Request via email
function requestViaEmail() {
    closeRequestRiddleModal();
    const subject = encodeURIComponent('Riddle Request - [Your Suggestion]');
    const body = encodeURIComponent(`Hello,

I would like to suggest a new riddle for The Gatekeeper's Riddle game:

[Please describe your riddle idea here]

Riddle Theme/Topic:


Suggested Answer:


Thank you!`);
    
    window.location.href = `mailto:sfti_ai@icloud.com?subject=${subject}&body=${body}`;
}

// Request AI curated riddle
async function requestAICurated() {
    closeRequestRiddleModal();
    
    const feedback = document.querySelector('.feedback');
    
    // Check if user is authenticated
    if (!isAuthenticated()) {
        if (feedback) {
            feedback.textContent = '🔐 Please login to request AI-curated riddles';
            feedback.className = 'feedback';
            feedback.style.display = 'flex';
            feedback.style.color = '#ff4d4d';
            
            setTimeout(() => {
                feedback.style.display = 'none';
            }, 5000);
        }
        return;
    }
    
    // Show loading notification
    if (feedback) {
        feedback.textContent = '🤖 Creating GitHub pull request for AI riddle request...';
        feedback.className = 'feedback';
        feedback.style.display = 'flex';
        feedback.style.color = '#64ffda';
    }
    
    try {
        // Create GitHub issue to request a code-agent PR
        const issue = await createRiddleRequestIssue();
        
        if (feedback) {
            const id = issue?.number || 'unknown';
            feedback.textContent = `✅ AI riddle request submitted! Issue #${id} created. An agent will open a PR for this request — please refresh your feed in ~10 minutes.`;
            feedback.style.color = '#64ffda';
            
            // Hide after 10 seconds
            setTimeout(() => {
                feedback.style.display = 'none';
            }, 10000);
        }
        
        console.log('AI Curated Riddle Request: GitHub issue created:', issue.html_url);
    } catch (error) {
        console.error('Error requesting AI curated riddle:', error);
        if (feedback) {
            // If user is authenticated but issue creation failed, do NOT redirect them away — show an error and let them retry
            if (isAuthenticated()) {
                feedback.textContent = `⚠️ Could not create issue automatically${error && error.message ? ` (${error.message})` : ''}. Please check your GitHub token permissions and try again.`;
                feedback.style.color = '#ff8800';

                setTimeout(() => {
                    feedback.style.display = 'none';
                }, 7000);
            } else {
                feedback.textContent = `⚠️ Could not create issue automatically${error && error.message ? ` (${error.message})` : ''}. Opening GitHub issue form...`;
                feedback.style.color = '#ff8800';

                setTimeout(() => {
                    feedback.style.display = 'none';
                }, 5000);

                // Fallback to opening GitHub issue template for unauthenticated users
                setTimeout(() => {
                    openGitHubPullRequestTemplate();
                }, 1000);
            }
        }
    }
}

// Toggle more menu dropdown
function toggleMoreMenu() {
    const menu = document.getElementById('moreMenu');
    if (menu) {
        menu.classList.toggle('active');
    }
}

// Refresh PWA - clear cache and reload
async function refreshApp() {
    try {
        // Clear all caches
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            console.log('All caches cleared');
        }
        
        // Unregister all service workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(
                registrations.map(registration => registration.unregister())
            );
            console.log('All service workers unregistered');
        }
        
        // Reload the page after cache clearing
        window.location.reload();
    } catch (error) {
        console.error('Error refreshing app:', error);
        // Fallback to reload if cache clearing fails
        window.location.reload();
    }
}

// Register Service Worker for PWA offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Get the base path for proper service worker registration
        // When in /system/riddle.html, we need to find the project root
        const currentPath = window.location.pathname;
        
        // Extract base path - remove /system/riddle.html part
        let basePath = '';
        if (currentPath.includes('/system/')) {
            basePath = currentPath.substring(0, currentPath.indexOf('/system/'));
        } else {
            // Fallback: remove filename from path
            basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
        }
        
        const swPath = basePath ? `${basePath}/system/js/sw.js` : '/system/js/sw.js';
        const scope = basePath ? `${basePath}/` : '/';
        
        navigator.serviceWorker.register(swPath, { 
            scope: scope
        })
            .then((registration) => {
                console.log('Service Worker registered successfully:', registration.scope);
            })
            .catch((error) => {
                console.error('Service Worker registration failed:', error);
            });
    });
}

// Initialize game on load
window.addEventListener('DOMContentLoaded', initGame);

// Make functions available globally for onclick handlers
window.checkAnswer = checkAnswer;
window.giveUp = giveUp;
window.previousRiddle = previousRiddle;
window.nextRiddle = nextRiddle;
window.showRiddleSelector = showRiddleSelector;
window.closeRiddleSelector = closeRiddleSelector;
window.showRequestRiddleMenu = showRequestRiddleMenu;
window.closeRequestRiddleModal = closeRequestRiddleModal;
window.requestViaEmail = requestViaEmail;
window.requestAICurated = requestAICurated;
window.toggleMoreMenu = toggleMoreMenu;
window.refreshApp = refreshApp;
window.showModal = showModal;
window.closeModal = closeModal;
window.showHelpModal = showHelpModal;
window.closeHelpModal = closeHelpModal;
window.showHintModal = showHintModal;
window.closeHintModal = closeHintModal;

function checkAnswer() {
    if (!currentRiddle) return;
    
    const input = document.getElementById('guessInput');
    const guess = input.value.trim().toLowerCase();
    const feedback = document.getElementById('feedback');
    
    if (!guess) {
        feedback.className = 'feedback wrong';
        feedback.textContent = 'Please enter an answer!';
        return;
    }

    attempts++;
    document.getElementById('attempts').textContent = `Attempts: ${attempts}`;
    
    // Update progress
    riddleProgress[currentRiddle.id] = riddleProgress[currentRiddle.id] || { attempts: 0, solved: false };
    riddleProgress[currentRiddle.id].attempts = attempts;

    // Check if correct
    if (currentRiddle.correctAnswers.some(answer => guess.includes(answer))) {
        riddleProgress[currentRiddle.id].solved = true;
        saveProgress();
        showModal(true);
        return;
    }

    // Check if close
    if (currentRiddle.closeAnswers.some(answer => guess.includes(answer))) {
        feedback.className = 'feedback close';
        feedback.textContent = currentRiddle.closeAnswerFeedback || 'You\'re getting warm... but not quite there.';
    } else {
        feedback.className = 'feedback wrong';
        feedback.textContent = currentRiddle.wrongAnswerFeedback || 'Not quite. Think deeper about the riddle...';
    }
    
    saveProgress();
    input.value = '';
}

function giveUp() {
    showModal(false);
}

function showModal(won) {
    if (!currentRiddle) return;
    
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const message = document.getElementById('modalMessage');
    const answerText = document.querySelector('.answer-text');
    const explanationText = document.querySelector('.explanation-text');

    if (won) {
        title.textContent = '🎯 You Solved It!';
        message.textContent = `Incredible! You got it in ${attempts} attempt${attempts !== 1 ? 's' : ''}. The answer is:`;
    } else {
        title.textContent = '🔓 The Answer Revealed';
        message.textContent = `After ${attempts} attempt${attempts !== 1 ? 's' : ''}, here's what you were seeking:`;
    }
    
    answerText.textContent = currentRiddle.answer;
    explanationText.textContent = currentRiddle.explanation;

    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('active');
}

function showHelpModal() {
    const modal = document.getElementById('helpModal');
    modal.classList.add('active');
}

function closeHelpModal() {
    const modal = document.getElementById('helpModal');
    modal.classList.remove('active');
}

function showHintModal() {
    if (!currentRiddle) return;
    
    const modal = document.getElementById('hintModal');
    if (!modal) return;
    
    const hintContent = modal.querySelector('.hint-content');
    if (!hintContent) return;
    
    // Clear existing hints
    hintContent.innerHTML = '';
    
    // Add hints from current riddle
    if (currentRiddle.hints && currentRiddle.hints.length > 0) {
        currentRiddle.hints.forEach((hint, index) => {
            const p = document.createElement('p');
            // Last hint gets special styling
            if (index === currentRiddle.hints.length - 1) {
                p.style.fontStyle = 'italic';
                p.style.color = '#64ffda';
                p.style.marginTop = '10px';
                p.textContent = hint;
            } else {
                p.textContent = '• ' + hint;
            }
            hintContent.appendChild(p);
        });
    } else {
        // Fallback hints if riddle doesn't have any
        hintContent.innerHTML = '<p>No hints available for this riddle yet.</p>';
    }
    
    modal.classList.add('active');
}

function closeHintModal() {
    const modal = document.getElementById('hintModal');
    modal.classList.remove('active');
}

// Allow Enter key to submit
document.getElementById('guessInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        checkAnswer();
    }
});

// Close modal on background click
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// Close help modal on background click
document.getElementById('helpModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeHelpModal();
    }
});

// Close hint modal on background click
document.getElementById('hintModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeHintModal();
    }
});

// Close riddle selector modal on background click
document.addEventListener('DOMContentLoaded', () => {
    const riddleSelectorModal = document.getElementById('riddleSelectorModal');
    if (riddleSelectorModal) {
        riddleSelectorModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeRiddleSelector();
            }
        });
    }
    
    // Close more menu when clicking outside - set up once on DOM load
    const dropdown = document.querySelector('.bubble-dropdown');
    const menu = document.getElementById('moreMenu');
    if (dropdown && menu) {
        document.addEventListener('click', function(e) {
            if (!dropdown.contains(e.target)) {
                menu.classList.remove('active');
            }
        });
    } else {
        if (!dropdown && !menu) {
            console.warn("Dropdown menu initialization: Both '.bubble-dropdown' and '#moreMenu' elements are missing from the DOM.");
        } else if (!dropdown) {
            console.warn("Dropdown menu initialization: '.bubble-dropdown' element is missing from the DOM.");
        } else if (!menu) {
            console.warn("Dropdown menu initialization: '#moreMenu' element is missing from the DOM.");
        }
    }
});

// Close modals with ESC key for accessibility
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
        closeHelpModal();
        closeHintModal();
        closeRiddleSelector();
        closeRequestRiddleModal();
    }
});

// Authentication-related functions
function updateAuthButton() {
    const authButton = document.getElementById('authButton');
    if (authButton) {
        if (isAuthenticated()) {
            authButton.textContent = 'Logout';
            authButton.setAttribute('aria-label', 'Logout from GitHub');
        } else {
            authButton.textContent = 'Login';
            authButton.setAttribute('aria-label', 'Login with GitHub');
        }
    }
}

function handleAuthAction() {
    if (isAuthenticated()) {
        // User is logged in, show confirmation dialog
        if (confirm('Are you sure you want to logout? You will need to login again to request AI-curated riddles.')) {
            clearGitHubToken();
            redirectToLogin();
        }
    } else {
        // User is not logged in, redirect to login page
        redirectToLogin();
    }
}

// Make functions globally available
window.handleAuthAction = handleAuthAction;
