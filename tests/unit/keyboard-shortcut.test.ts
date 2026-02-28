import { describe, test, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcut } from "@/lib/hooks/useKeyboardShortcut";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fireKey(
  key: string,
  opts: { ctrlKey?: boolean; metaKey?: boolean; target?: HTMLElement } = {},
) {
  const event = new KeyboardEvent("keydown", {
    key,
    ctrlKey: opts.ctrlKey ?? false,
    metaKey: opts.metaKey ?? false,
    bubbles: true,
    cancelable: true,
  });

  // Override readonly `target` by dispatching from a specific element
  if (opts.target) {
    opts.target.dispatchEvent(event);
  } else {
    document.dispatchEvent(event);
  }
}

afterEach(() => {
  // Clean up any DOM elements added during tests
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

// ---------------------------------------------------------------------------
// Basic firing
// ---------------------------------------------------------------------------

describe("useKeyboardShortcut", () => {
  test("fires callback on Ctrl+key", () => {
    const cb = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: "e", ctrl: true }, cb));

    fireKey("e", { ctrlKey: true });
    expect(cb).toHaveBeenCalledOnce();
  });

  test("fires callback on Meta+key (Mac ⌘)", () => {
    const cb = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: "e", ctrl: true }, cb));

    fireKey("e", { metaKey: true });
    expect(cb).toHaveBeenCalledOnce();
  });

  test("does not fire without modifier when ctrl is required", () => {
    const cb = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: "e", ctrl: true }, cb));

    fireKey("e");
    expect(cb).not.toHaveBeenCalled();
  });

  test("does not fire for wrong key", () => {
    const cb = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: "e", ctrl: true }, cb));

    fireKey("s", { ctrlKey: true });
    expect(cb).not.toHaveBeenCalled();
  });

  test("matches key case-insensitively", () => {
    const cb = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: "e", ctrl: true }, cb));

    fireKey("E", { ctrlKey: true });
    expect(cb).toHaveBeenCalledOnce();
  });

  // ---------------------------------------------------------------------------
  // Enabled flag
  // ---------------------------------------------------------------------------

  test("does not fire when disabled", () => {
    const cb = vi.fn();
    renderHook(() =>
      useKeyboardShortcut({ key: "e", ctrl: true }, cb, { enabled: false }),
    );

    fireKey("e", { ctrlKey: true });
    expect(cb).not.toHaveBeenCalled();
  });

  test("re-enables when enabled changes to true", () => {
    const cb = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) =>
        useKeyboardShortcut({ key: "e", ctrl: true }, cb, { enabled }),
      { initialProps: { enabled: false } },
    );

    fireKey("e", { ctrlKey: true });
    expect(cb).not.toHaveBeenCalled();

    rerender({ enabled: true });
    fireKey("e", { ctrlKey: true });
    expect(cb).toHaveBeenCalledOnce();
  });

  // ---------------------------------------------------------------------------
  // Input field suppression
  // ---------------------------------------------------------------------------

  test("does not fire Ctrl+E when focus is in an <input>", () => {
    const cb = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: "e", ctrl: true }, cb));

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    fireKey("e", { ctrlKey: true, target: input });
    expect(cb).not.toHaveBeenCalled();
  });

  test("does not fire Ctrl+E when focus is in a <textarea>", () => {
    const cb = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: "e", ctrl: true }, cb));

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    fireKey("e", { ctrlKey: true, target: textarea });
    expect(cb).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Ctrl+Enter special case — allowed in textarea
  // ---------------------------------------------------------------------------

  test("fires Ctrl+Enter when focus is in a <textarea>", () => {
    const cb = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: "Enter", ctrl: true }, cb));

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    fireKey("Enter", { ctrlKey: true, target: textarea });
    expect(cb).toHaveBeenCalledOnce();
  });

  test("does not fire Ctrl+Enter when focus is in an <input>", () => {
    const cb = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: "Enter", ctrl: true }, cb));

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    fireKey("Enter", { ctrlKey: true, target: input });
    expect(cb).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  test("removes listener on unmount", () => {
    const cb = vi.fn();
    const { unmount } = renderHook(() =>
      useKeyboardShortcut({ key: "e", ctrl: true }, cb),
    );

    unmount();
    fireKey("e", { ctrlKey: true });
    expect(cb).not.toHaveBeenCalled();
  });
});
