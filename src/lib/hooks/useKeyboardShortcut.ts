import { useEffect, useRef } from "react";

interface ShortcutDescriptor {
  /** The key to listen for (case-insensitive, matched against `event.key`). */
  key: string;
  /** Require Ctrl (Windows/Linux) or ⌘ (Mac). */
  ctrl?: boolean;
}

interface ShortcutOptions {
  /** When false, the shortcut is disabled (listener is a no-op). Defaults to true. */
  enabled?: boolean;
}

const TEXT_INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Registers a global `keydown` listener for a keyboard shortcut.
 *
 * - `ctrl: true` matches both `Ctrl` and `⌘` (Meta) automatically.
 * - Suppresses firing when focus is in a text input, **except** for
 *   `Ctrl+Enter` in a `<textarea>` (the generate-form use case).
 */
export function useKeyboardShortcut(
  descriptor: ShortcutDescriptor,
  callback: () => void,
  options: ShortcutOptions = {},
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const { key, ctrl = false } = descriptor;
  const enabled = options.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      // Check modifier
      if (ctrl && !(event.ctrlKey || event.metaKey)) return;

      // Check key (case-insensitive)
      if (event.key.toLowerCase() !== key.toLowerCase()) return;

      // Skip when focus is inside text inputs — with an exception for
      // Ctrl+Enter inside a <textarea> (the primary generate-form shortcut).
      const target = event.target as HTMLElement | null;
      if (target && TEXT_INPUT_TAGS.has(target.tagName)) {
        const isContentEditable = target.isContentEditable;
        const isCtrlEnterInTextarea =
          key.toLowerCase() === "enter" && ctrl && target.tagName === "TEXTAREA";

        if (!isCtrlEnterInTextarea && !isContentEditable) return;
        if (isContentEditable) return;
      }

      event.preventDefault();
      callbackRef.current();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [key, ctrl, enabled]);
}

/** Returns true if the current platform is macOS (for displaying ⌘ vs Ctrl). */
export function isMac(): boolean {
  // navigator.platform is deprecated but still works everywhere and is
  // simpler than parsing userAgentData for this cosmetic purpose.
  return typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}
