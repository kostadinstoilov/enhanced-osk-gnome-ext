// Comprehensive debug version to understand the backspace issue
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import { Extension, InjectionManager } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Keyboard from 'resource:///org/gnome/shell/ui/keyboard.js';

const A11Y_APPLICATIONS_SCHEMA = "org.gnome.desktop.a11y.applications";
const KEY_RELEASE_TIMEOUT = 100;

let settings;
let keyReleaseTimeoutId;
let debugLog = [];

function logDebug(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    debugLog.push(logEntry);
    console.log(`[DEBUG] ${logEntry}`);
    
    // Keep only last 200 entries
    if (debugLog.length > 200) {
        debugLog = debugLog.slice(-200);
    }
}

function getDebugLog() {
    return debugLog.join('\n');
}

export default class ComprehensiveDebugOSK extends Extension {
    constructor(metadata) {
        super(metadata);
        logDebug(`ComprehensiveDebugOSK constructor called`);
    }

    enable() {
        logDebug(`ComprehensiveDebugOSK enable() called`);
        
        this._injectionManager = new InjectionManager();
        settings = this.getSettings("org.gnome.shell.extensions.enhancedosk");

        // Override _toggleDelete with comprehensive debugging
        this._injectionManager.overrideMethod(
            Keyboard.Keyboard.prototype, '_toggleDelete',
            originalMethod => {
                return function (enabled) {
                    logDebug(`_toggleDelete called with enabled=${enabled}`);
                    logDebug(`_toggleDelete: this._deleteEnabled=${this._deleteEnabled}`);
                    
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
                            
                            if (cursor === 0 && anchor === 0) {
                                logDebug(`func: early return - both cursor and anchor at 0`);
                                return;
                            }

                            let offset, len;
                            if (cursor > anchor) {
                                // Forward selection: delete from anchor to cursor
                                offset = anchor - cursor;  // negative value
                                len = -offset;             // positive length
                                logDebug(`func: forward selection - offset=${offset}, len=${len}`);
                            } else if (cursor < anchor) {
                                // Backward selection: delete from cursor to anchor
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
            });

        // Override _commitAction to see if backspace goes through this path
        this._injectionManager.overrideMethod(
            Keyboard.Keyboard.prototype, '_commitAction',
            originalMethod => {
                return async function (keyval, str) {
                    logDebug(`_commitAction called with keyval=${keyval}, str="${str}"`);
                    
                    // Check if this is a backspace key
                    if (keyval === Clutter.KEY_BackSpace) {
                        logDebug(`_commitAction: BACKSPACE KEY DETECTED! keyval=${keyval}`);
                        logDebug(`_commitAction: this._deleteEnabled=${this._deleteEnabled}`);
                        logDebug(`_commitAction: this._modifiers.size=${this._modifiers.size}`);
                        logDebug(`_commitAction: Main.inputMethod.currentFocus=${Main.inputMethod.currentFocus}`);
                    }
                    
                    // Handle virtual key completion if available
                    if (this._modifiers.size === 0 && str !== '' && keyval) {
                        // Try to use virtual key handling if available
                        try {
                            if (Main.inputMethod.handleVirtualKey && await Main.inputMethod.handleVirtualKey(keyval)) {
                                logDebug(`_commitAction: handleVirtualKey succeeded for keyval=${keyval}`);
                                return;
                            }
                        } catch (e) {
                            logDebug(`_commitAction: handleVirtualKey failed: ${e}`);
                            // handleVirtualKey might not be available, continue with normal processing
                        }
                    }

                    if (str === '' || !Main.inputMethod.currentFocus ||
                        this._modifiers.size > 0 ||
                        !this._keyboardController.commitString(str, true)) {
                        if (keyval !== 0) {
                            logDebug(`_commitAction: using keyval path for keyval=${keyval}`);
                            this._forwardModifiers(this._modifiers, Clutter.EventType.KEY_PRESS);
                            this._keyboardController.keyvalPress(keyval);
                            keyReleaseTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, KEY_RELEASE_TIMEOUT, () => {
                                this._keyboardController.keyvalRelease(keyval);
                                this._forwardModifiers(this._modifiers, Clutter.EventType.KEY_RELEASE);
                                // Don't disable modifiers if caps lock is active (long press)
                                if (!this._longPressed)
                                    this._disableAllModifiers();
                                return GLib.SOURCE_REMOVE;
                            });
                        }
                    } else {
                        logDebug(`_commitAction: using commitString path for str="${str}"`);
                    }
                };
            });

        // Override key press handling to see what keys are being pressed
        this._injectionManager.overrideMethod(
            Keyboard.Keyboard.prototype, '_onKeyPressed',
            originalMethod => {
                return function (key) {
                    logDebug(`_onKeyPressed called with key: ${JSON.stringify({
                        keyval: key.keyval,
                        label: key.label,
                        action: key.action
                    })}`);
                    
                    if (key.keyval === Clutter.KEY_BackSpace) {
                        logDebug(`_onKeyPressed: BACKSPACE KEY PRESSED!`);
                    }
                    
                    return originalMethod.call(this, key);
                };
            });

        logDebug(`ComprehensiveDebugOSK enable() completed`);
        
        // Add global functions to get debug logs
        global.getOSKDebugLog = getDebugLog;
        global.clearOSKDebugLog = () => { debugLog = []; };
        
        logDebug(`Debug functions added to global scope`);
    }

    disable() {
        logDebug(`ComprehensiveDebugOSK disable() called`);
        
        if (this._injectionManager) {
            this._injectionManager.clear();
            this._injectionManager = null;
            logDebug(`InjectionManager cleared`);
        }

        settings = null;
        
        if (keyReleaseTimeoutId) {
            GLib.Source.remove(keyReleaseTimeoutId);
            keyReleaseTimeoutId = null;
        }
        
        // Remove global debug functions
        delete global.getOSKDebugLog;
        delete global.clearOSKDebugLog;
        
        logDebug(`ComprehensiveDebugOSK disable() completed`);
    }
}