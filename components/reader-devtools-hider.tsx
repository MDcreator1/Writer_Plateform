"use client";

import { useEffect } from "react";

const DEVTOOLS_SELECTORS = [
  "#data-devtools-indicator",
  ".dev-tools-indicator-menu",
  ".dev-tools-indicator-inner",
  ".dev-tools-indicator-item",
  "[data-nextjs-toast]"
];

function hideDevtoolsIndicator(root: ParentNode) {
  DEVTOOLS_SELECTORS.forEach((selector) => {
    root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      element.style.setProperty("display", "none", "important");
      element.style.setProperty("visibility", "hidden", "important");
      element.style.setProperty("pointer-events", "none", "important");
    });
  });
}

export function ReaderDevtoolsHider() {
  useEffect(() => {
    const hide = () => {
      hideDevtoolsIndicator(document);
      document.querySelectorAll("nextjs-portal").forEach((portal) => {
        const shadowRoot = (portal as HTMLElement).shadowRoot;
        if (shadowRoot) {
          hideDevtoolsIndicator(shadowRoot);
        }
      });
    };

    hide();
    const observer = new MutationObserver(hide);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    const intervalId = window.setInterval(hide, 500);

    return () => {
      observer.disconnect();
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}

