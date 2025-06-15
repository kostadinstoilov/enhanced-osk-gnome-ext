// Debug script to test backspace behavior
// This script can be run in Looking Glass (Alt+F2, type 'lg', press Enter)

// Test the current implementation
function debugBackspaceLogic() {
    console.log("=== Debugging Backspace Logic ===");
    
    // Test cases for different selection scenarios
    const testCases = [
        { text: "Hello World", cursor: 5, anchor: 5, description: "No selection, cursor at 5" },
        { text: "Hello World", cursor: 0, anchor: 0, description: "No selection, cursor at start" },
        { text: "Hello World", cursor: 5, anchor: 0, description: "Forward selection: 0-5" },
        { text: "Hello World", cursor: 0, anchor: 5, description: "Backward selection: 0-5" },
        { text: "Hello World", cursor: 11, anchor: 6, description: "Forward selection: 6-11" },
        { text: "Hello World", cursor: 6, anchor: 11, description: "Backward selection: 6-11" },
    ];
    
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1}: ${testCase.description}`);
        console.log(`Text: "${testCase.text}", Cursor: ${testCase.cursor}, Anchor: ${testCase.anchor}`);
        
        let offset, len;
        const { text, cursor, anchor } = testCase;
        
        if (!text || (cursor === 0 && anchor === 0)) {
            console.log("Result: Early return - no text or both cursor and anchor at 0");
            return;
        }
        
        if (cursor > anchor) {
            // Selection from anchor to cursor (forward selection)
            offset = anchor - cursor;
            len = cursor - anchor;
            console.log(`Forward selection: offset=${offset}, len=${len}`);
        } else if (cursor < anchor) {
            // Selection from cursor to anchor (backward selection)
            offset = 0;
            len = anchor - cursor;
            console.log(`Backward selection: offset=${offset}, len=${len}`);
        } else {
            // No selection, delete single character before cursor
            if (cursor === 0) {
                console.log("Result: Early return - can't delete before start");
                return;
            }
            offset = -1;
            len = 1;
            console.log(`No selection: offset=${offset}, len=${len}`);
        }
        
        if (len > 0) {
            console.log(`Would call: Main.inputMethod.delete_surrounding(${offset}, ${len})`);
            // Simulate what would be deleted
            if (offset < 0) {
                const startPos = Math.max(0, cursor + offset);
                const endPos = Math.min(text.length, cursor);
                console.log(`Would delete: "${text.substring(startPos, endPos)}" (positions ${startPos}-${endPos})`);
            } else {
                const startPos = cursor + offset;
                const endPos = Math.min(text.length, startPos + len);
                console.log(`Would delete: "${text.substring(startPos, endPos)}" (positions ${startPos}-${endPos})`);
            }
        }
    });
}

// Test the corrected logic based on GNOME Shell implementation
function debugCorrectedLogic() {
    console.log("\n=== Testing Corrected Logic ===");
    
    const testCases = [
        { text: "Hello World", cursor: 5, anchor: 5, description: "No selection, cursor at 5" },
        { text: "Hello World", cursor: 0, anchor: 0, description: "No selection, cursor at start" },
        { text: "Hello World", cursor: 5, anchor: 0, description: "Forward selection: 0-5" },
        { text: "Hello World", cursor: 0, anchor: 5, description: "Backward selection: 0-5" },
        { text: "Hello World", cursor: 11, anchor: 6, description: "Forward selection: 6-11" },
        { text: "Hello World", cursor: 6, anchor: 11, description: "Backward selection: 6-11" },
    ];
    
    testCases.forEach((testCase, index) => {
        console.log(`\nCorrected Test Case ${index + 1}: ${testCase.description}`);
        console.log(`Text: "${testCase.text}", Cursor: ${testCase.cursor}, Anchor: ${testCase.anchor}`);
        
        let offset, len;
        const { text, cursor, anchor } = testCase;
        
        if (cursor === 0 && anchor === 0) {
            console.log("Result: Early return - both cursor and anchor at 0");
            return;
        }
        
        if (cursor > anchor) {
            // Forward selection: delete from anchor to cursor
            offset = anchor - cursor;  // negative
            len = -offset;             // positive
            console.log(`Forward selection: offset=${offset}, len=${len}`);
        } else if (cursor < anchor) {
            // Backward selection: delete from cursor to anchor
            offset = 0;
            len = anchor - cursor;
            console.log(`Backward selection: offset=${offset}, len=${len}`);
        } else {
            // No selection, delete single character before cursor
            if (cursor === 0) {
                console.log("Result: Early return - can't delete before start");
                return;
            }
            offset = -1;
            len = 1;
            console.log(`No selection: offset=${offset}, len=${len}`);
        }
        
        if (len > 0) {
            console.log(`Would call: Main.inputMethod.delete_surrounding(${offset}, ${len})`);
            // Simulate what would be deleted
            if (offset < 0) {
                const startPos = Math.max(0, cursor + offset);
                const endPos = cursor;
                console.log(`Would delete: "${text.substring(startPos, endPos)}" (positions ${startPos}-${endPos})`);
            } else {
                const startPos = cursor + offset;
                const endPos = Math.min(text.length, startPos + len);
                console.log(`Would delete: "${text.substring(startPos, endPos)}" (positions ${startPos}-${endPos})`);
            }
        }
    });
}

// Run the debug functions
debugBackspaceLogic();
debugCorrectedLogic();