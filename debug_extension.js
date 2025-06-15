// Debug version of the extension to understand the backspace issue
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import { Extension, InjectionManager } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Keyboard from 'resource:///org/gnome/shell/ui/keyboard.js';

const A11Y_APPLICATIONS_SCHEMA = "org.gnome.desktop.a11y.applications";

let settings;
let debugLog = [];

function logDebug(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    debugLog.push(logEntry);
    console.log(`[DEBUG] ${logEntry}`);
    
    // Keep only last 100 entries
    if (debugLog.length > 100) {
        debugLog = debugLog.slice(-100);
    }
}

function getDebugLog() {
    return debugLog.join('\n');
}

// Enhanced debug version of the _toggleDelete override
function createDebugToggleDelete(originalMethod) {
    return function (enabled) {
        logDebug(`_toggleDelete called with enabled=${enabled}`);
        
        if (this._deleteEnabled === enabled) {
            logDebug(`_toggleDelete: early return, already ${enabled}`);
            return;
        }

        this._deleteEnabled = enabled;
        logDebug(`_toggleDelete: set _deleteEnabled to ${enabled}`);

        if (enabled) {
            logDebug(`_toggleDelete: enabling delete functionality`);
            
            // Initialize surrounding update ID if not set
            if (!this._surroundingUpdateId) {
                this._surroundingUpdateId = 0;
                logDebug(`_toggleDelete: initialized _surroundingUpdateId to 0`);
            }
            
            // Handle text selection properly for backspace
            let func = (text, cursor, anchor) => {
                logDebug(`func called with text="${text}", cursor=${cursor}, anchor=${anchor}`);
                
                if (!text || (cursor === 0 && anchor === 0)) {
                    logDebug(`func: early return - no text or both cursor and anchor at 0`);
                    return;
                }

                let offset, len;
                if (cursor > anchor) {
                    // Selection from anchor to cursor (forward selection)
                    offset = anchor - cursor;
                    len = cursor - anchor;
                    logDebug(`func: forward selection - offset=${offset}, len=${len}`);
                } else if (cursor < anchor) {
                    // Selection from cursor to anchor (backward selection)
                    offset = 0;
                    len = anchor - cursor;
                    logDebug(`func: backward selection - offset=${offset}, len=${len}`);
                } else {
                    // No selection, delete single character before cursor
                    if (cursor === 0) {
                        logDebug(`func: early return - can't delete before start`);
                        return;
                    }
                    offset = -1;
                    len = 1;
                    logDebug(`func: no selection - offset=${offset}, len=${len}`);
                }

                if (len > 0) {
                    logDebug(`func: calling Main.inputMethod.delete_surrounding(${offset}, ${len})`);
                    try {
                        Main.inputMethod.delete_surrounding(offset, len);
                        logDebug(`func: delete_surrounding call successful`);
                    } catch (error) {
                        logDebug(`func: delete_surrounding call failed: ${error}`);
                    }
                } else {
                    logDebug(`func: not calling delete_surrounding because len=${len}`);
                }
            };

            logDebug(`_toggleDelete: connecting to surrounding-text-set signal`);
            this._surroundingUpdateId = Main.inputMethod.connect(
                'surrounding-text-set', () => {
                    logDebug(`surrounding-text-set signal received`);
                    let surroundingText = Main.inputMethod.getSurroundingText();
                    logDebug(`getSurroundingText returned: ${JSON.stringify(surroundingText)}`);
                    
                    let text = surroundingText[0];
                    let cursor = surroundingText[1];
                    let anchor = surroundingText[2] !== undefined ? surroundingText[2] : cursor;
                    
                    logDebug(`parsed: text="${text}", cursor=${cursor}, anchor=${anchor}`);
                    func(text, cursor, anchor);
                });

            logDebug(`_toggleDelete: getting initial surrounding text`);
            let surroundingText = Main.inputMethod.getSurroundingText();
            logDebug(`initial getSurroundingText returned: ${JSON.stringify(surroundingText)}`);
            
            if (surroundingText && surroundingText[0]) {
                let text = surroundingText[0];
                let cursor = surroundingText[1];
                let anchor = surroundingText[2] !== undefined ? surroundingText[2] : cursor;
                logDebug(`initial parsed: text="${text}", cursor=${cursor}, anchor=${anchor}`);
                func(text, cursor, anchor);
            } else {
                logDebug(`_toggleDelete: requesting surrounding text`);
                Main.inputMethod.request_surrounding();
            }
        } else {
            logDebug(`_toggleDelete: disabling delete functionality`);
            if (this._surroundingUpdateId) {
                logDebug(`_toggleDelete: disconnecting signal ${this._surroundingUpdateId}`);
                Main.inputMethod.disconnect(this._surroundingUpdateId);
                this._surroundingUpdateId = 0;
            }
        }
        
        logDebug(`_toggleDelete: completed`);
    };
}

// Test if the override is working by adding a simple test override
function createTestOverride(originalMethod) {
    return function (...args) {
        logDebug(`Test override called with args: ${JSON.stringify(args)}`);
        return originalMethod.call(this, ...args);
    };
}

export default class DebugEnhancedOSK extends Extension {
    constructor(metadata) {
        super(metadata);
        logDebug(`DebugEnhancedOSK constructor called`);
    }

    enable() {
        logDebug(`DebugEnhancedOSK enable() called`);
        
        this._injectionManager = new InjectionManager();
        logDebug(`InjectionManager created`);

        settings = this.getSettings("org.gnome.shell.extensions.enhancedosk");
        logDebug(`Settings loaded`);

        // Test if injection manager is working
        this._injectionManager.overrideMethod(
            Keyboard.Keyboard.prototype, '_setActiveLevel',
            originalMethod => {
                return function (...args) {
                    logDebug(`_setActiveLevel override called with args: ${JSON.stringify(args)}`);
                    return originalMethod.call(this, ...args);
                };
            });

        // Override _toggleDelete with debug version
        logDebug(`Overriding _toggleDelete method`);
        this._injectionManager.overrideMethod(
            Keyboard.Keyboard.prototype, '_toggleDelete',
            originalMethod => {
                logDebug(`_toggleDelete override factory called`);
                return createDebugToggleDelete(originalMethod);
            });

        logDebug(`DebugEnhancedOSK enable() completed`);
        
        // Add a global function to get debug logs
        global.getOSKDebugLog = getDebugLog;
        global.clearOSKDebugLog = () => { debugLog = []; };
        
        logDebug(`Debug functions added to global scope`);
    }

    disable() {
        logDebug(`DebugEnhancedOSK disable() called`);
        
        if (this._injectionManager) {
            this._injectionManager.clear();
            this._injectionManager = null;
            logDebug(`InjectionManager cleared`);
        }

        settings = null;
        
        // Remove global debug functions
        delete global.getOSKDebugLog;
        delete global.clearOSKDebugLog;
        
        logDebug(`DebugEnhancedOSK disable() completed`);
    }
}