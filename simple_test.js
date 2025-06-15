// Simple test to check if method overrides are working
import { Extension, InjectionManager } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Keyboard from 'resource:///org/gnome/shell/ui/keyboard.js';

let testLog = [];

function logTest(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    testLog.push(logEntry);
    console.log(`[TEST] ${logEntry}`);
}

export default class SimpleTestOSK extends Extension {
    constructor(metadata) {
        super(metadata);
        logTest(`SimpleTestOSK constructor called`);
    }

    enable() {
        logTest(`SimpleTestOSK enable() called`);
        
        this._injectionManager = new InjectionManager();

        // Test if we can override a simple method
        this._injectionManager.overrideMethod(
            Keyboard.Keyboard.prototype, '_setActiveLevel',
            originalMethod => {
                return function (...args) {
                    logTest(`_setActiveLevel override called with args: ${JSON.stringify(args)}`);
                    return originalMethod.call(this, ...args);
                };
            });

        // Test _toggleDelete override
        this._injectionManager.overrideMethod(
            Keyboard.Keyboard.prototype, '_toggleDelete',
            originalMethod => {
                return function (enabled) {
                    logTest(`_toggleDelete override called with enabled=${enabled}`);
                    
                    // Call original method first
                    const result = originalMethod.call(this, enabled);
                    
                    logTest(`_toggleDelete original method completed`);
                    return result;
                };
            });

        // Test _commitAction override
        this._injectionManager.overrideMethod(
            Keyboard.Keyboard.prototype, '_commitAction',
            originalMethod => {
                return async function (keyval, str) {
                    logTest(`_commitAction override called with keyval=${keyval}, str="${str}"`);
                    
                    if (keyval === 65288) { // BackSpace keyval
                        logTest(`_commitAction: BACKSPACE DETECTED!`);
                    }
                    
                    return await originalMethod.call(this, keyval, str);
                };
            });

        logTest(`SimpleTestOSK enable() completed`);
        
        // Add global function to get test logs
        global.getOSKTestLog = () => testLog.join('\n');
        global.clearOSKTestLog = () => { testLog = []; };
        
        logTest(`Test functions added to global scope`);
    }

    disable() {
        logTest(`SimpleTestOSK disable() called`);
        
        if (this._injectionManager) {
            this._injectionManager.clear();
            this._injectionManager = null;
            logTest(`InjectionManager cleared`);
        }
        
        // Remove global test functions
        delete global.getOSKTestLog;
        delete global.clearOSKTestLog;
        
        logTest(`SimpleTestOSK disable() completed`);
    }
}