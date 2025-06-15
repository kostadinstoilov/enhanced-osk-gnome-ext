// Test script to check if the surrounding text API is working correctly
// This can be run in Looking Glass to test the API

function testSurroundingTextAPI() {
    console.log("=== Testing Surrounding Text API ===");
    
    try {
        // Check if Main.inputMethod exists
        if (!Main.inputMethod) {
            console.log("ERROR: Main.inputMethod is not available");
            return;
        }
        
        console.log("Main.inputMethod is available");
        
        // Check if getSurroundingText method exists
        if (typeof Main.inputMethod.getSurroundingText !== 'function') {
            console.log("ERROR: getSurroundingText method is not available");
            return;
        }
        
        console.log("getSurroundingText method is available");
        
        // Try to get surrounding text
        let surroundingText = Main.inputMethod.getSurroundingText();
        console.log("getSurroundingText() returned:", JSON.stringify(surroundingText));
        
        // Check if delete_surrounding method exists
        if (typeof Main.inputMethod.delete_surrounding !== 'function') {
            console.log("ERROR: delete_surrounding method is not available");
            return;
        }
        
        console.log("delete_surrounding method is available");
        
        // Check if request_surrounding method exists
        if (typeof Main.inputMethod.request_surrounding !== 'function') {
            console.log("ERROR: request_surrounding method is not available");
            return;
        }
        
        console.log("request_surrounding method is available");
        
        // Test connecting to surrounding-text-set signal
        let signalId = null;
        try {
            signalId = Main.inputMethod.connect('surrounding-text-set', () => {
                console.log("surrounding-text-set signal received");
                let text = Main.inputMethod.getSurroundingText();
                console.log("Signal handler - getSurroundingText():", JSON.stringify(text));
            });
            console.log("Successfully connected to surrounding-text-set signal, ID:", signalId);
            
            // Disconnect the signal
            Main.inputMethod.disconnect(signalId);
            console.log("Successfully disconnected signal");
        } catch (error) {
            console.log("ERROR connecting to surrounding-text-set signal:", error);
        }
        
        console.log("=== Surrounding Text API Test Complete ===");
        
    } catch (error) {
        console.log("ERROR in testSurroundingTextAPI:", error);
    }
}

// Test if the keyboard object exists and has the expected methods
function testKeyboardAPI() {
    console.log("=== Testing Keyboard API ===");
    
    try {
        // Check if Main.keyboard exists
        if (!Main.keyboard) {
            console.log("ERROR: Main.keyboard is not available");
            return;
        }
        
        console.log("Main.keyboard is available");
        
        // Check if Main.keyboard._keyboard exists
        if (!Main.keyboard._keyboard) {
            console.log("WARNING: Main.keyboard._keyboard is not available (keyboard might not be initialized)");
            return;
        }
        
        console.log("Main.keyboard._keyboard is available");
        
        // Check if _toggleDelete method exists
        if (typeof Main.keyboard._keyboard._toggleDelete !== 'function') {
            console.log("ERROR: _toggleDelete method is not available");
            return;
        }
        
        console.log("_toggleDelete method is available");
        
        // Check current state
        console.log("_deleteEnabled:", Main.keyboard._keyboard._deleteEnabled);
        console.log("_surroundingUpdateId:", Main.keyboard._keyboard._surroundingUpdateId);
        
        console.log("=== Keyboard API Test Complete ===");
        
    } catch (error) {
        console.log("ERROR in testKeyboardAPI:", error);
    }
}

// Run the tests
testSurroundingTextAPI();
testKeyboardAPI();