import "./TitleBar.css";

import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

/* ── Icon primitives ─────────────────────────────────────────────────── */

function MinimizeIcon() {
  return (
    <svg
      width="10"
      height="2"
      viewBox="0 0 10 2"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="10" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="0.75"
        y="0.75"
        width="8.5"
        height="8.5"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      aria-hidden="true"
      focusable="false"
    >
      {/* Front window */}
      <rect
        x="2.5"
        y="0.75"
        width="6.75"
        height="6.75"
        rx="0.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Back window (bottom-left corner visible) */}
      <path
        d="M0.75 3.5v5.75h5.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      aria-hidden="true"
      focusable="false"
    >
      <line
        x1="1"
        y1="1"
        x2="9"
        y2="9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="9"
        y1="1"
        x2="1"
        y2="9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── Logo mark ───────────────────────────────────────────────────────── */

function LexoraLogo() {
  return (
    <svg
      className="title-bar__logo"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Stylised "L" — vertical stroke + horizontal base */}
      <rect x="4" y="4" width="4" height="16" rx="1" fill="currentColor" />
      <rect x="4" y="16" width="13" height="4" rx="1" fill="currentColor" />
    </svg>
  );
}

/* ── TitleBar component ──────────────────────────────────────────────── */

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const win = getCurrentWindow();

    // Sync initial maximized state
    win.isMaximized().then(setIsMaximized).catch(console.error);

    // Re-sync whenever the window is resized (covers maximize/restore)
    let unlisten: (() => void) | undefined;
    win
      .onResized(async () => {
        const maximized = await win.isMaximized();
        setIsMaximized(maximized);
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(console.error);

    return () => {
      unlisten?.();
    };
  }, []);

  const handleMinimize = () => {
    void getCurrentWindow().minimize();
  };

  const handleMaximizeToggle = () => {
    const win = getCurrentWindow();
    if (isMaximized) {
      void win.unmaximize();
    } else {
      void win.maximize();
    }
  };

  const handleClose = () => {
    void getCurrentWindow().close();
  };

  return (
    <header className="title-bar" role="banner">
      {/*
       * data-tauri-drag-region tells Tauri's JS runtime to intercept
       * mousedown events here and call the native window-drag API.
       * Interactive children (buttons) remain clickable because Tauri
       * checks element interactivity before starting the drag.
       * onDoubleClick provides the standard maximize-on-double-click UX;
       * it fires after two clicks with no drag motion between them.
       */}
      <div
        className="title-bar__drag"
        data-tauri-drag-region=""
        onDoubleClick={handleMaximizeToggle}
      >
        <div className="title-bar__brand">
          <LexoraLogo />
          <span className="title-bar__wordmark">Lexora</span>
        </div>
      </div>

      <nav className="title-bar__controls" aria-label="Window controls">
        <button
          className="title-bar__btn"
          onClick={handleMinimize}
          aria-label="Minimize"
          title="Minimize"
          tabIndex={0}
        >
          <MinimizeIcon />
        </button>

        <button
          className="title-bar__btn"
          onClick={handleMaximizeToggle}
          aria-label={isMaximized ? "Restore" : "Maximize"}
          title={isMaximized ? "Restore" : "Maximize"}
          tabIndex={0}
        >
          {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
        </button>

        <button
          className="title-bar__btn title-bar__btn--close"
          onClick={handleClose}
          aria-label="Close"
          title="Close"
          tabIndex={0}
        >
          <CloseIcon />
        </button>
      </nav>
    </header>
  );
}
