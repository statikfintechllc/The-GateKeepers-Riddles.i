/**
 * RIDDLE TEMPLATE
 * 
 * This is a template for creating new riddles. Copy this file and rename it to
 * {name}.riddle.js, then fill in all the required fields below.
 * 
 * REQUIRED FIELDS:
 * - id: Unique identifier (lowercase, no spaces)
 * - title: Display title for the riddle
 * - text: The riddle text (can use backticks for multiline)
 * - correctAnswers: Array of strings that are correct answers (lowercase)
 * - closeAnswers: Array of strings that are close but not quite right (lowercase)
 * - hints: Array of hint strings to help users (6+ hints recommended)
 * - wrongAnswerFeedback: Message shown for wrong answers
 * - closeAnswerFeedback: Message shown for close answers
 * - explanation: Brief explanation of the answer
 * - answer: The official answer to display when solved/given up
 * 
 * USAGE:
 * 1. Copy this file to a new file: {name}.riddle.js
 * 2. Fill in all fields
 * 3. Import and add to riddles.js registry
 * 4. Test thoroughly with various answers
 */

export const riddle = {
    // Unique ID for this riddle (lowercase, no spaces, e.g., 'my-riddle')
    id: 'template',
    
    // Display title (e.g., 'The Template Riddle')
    title: 'The Template Riddle',
    
    // The riddle text - use backticks for multiline text
    text: `Replace this with your riddle text.
You can use multiple lines.
Make it mysterious and thought-provoking!`,
    
    // Correct answers - add all valid variations (all lowercase)
    correctAnswers: [
        'correct answer 1',
        'correct answer 2',
        'variation 1',
        'variation 2'
    ],
    
    // Close answers - things that are almost right (all lowercase)
    closeAnswers: [
        'close but not quite',
        'related concept',
        'similar idea'
    ],
    
    // Hints displayed in the hint modal (6+ hints recommended)
    // Progress from vague to more specific
    hints: [
        'First hint - very vague',
        'Second hint - slightly more specific',
        'Third hint - getting clearer',
        'Fourth hint - more direct',
        'Fifth hint - almost giving it away',
        'Sixth hint - final nudge in the right direction'
    ],
    
    // Feedback message for wrong answers
    wrongAnswerFeedback: 'Not quite. Think about...',
    
    // Feedback message for close answers
    closeAnswerFeedback: 'You\'re getting warm! Consider...',
    
    // Explanation shown after correct answer or giving up
    explanation: 'Explain why this is the answer and what it means.',
    
    // The official answer to display
    answer: 'The Official Answer'
};
