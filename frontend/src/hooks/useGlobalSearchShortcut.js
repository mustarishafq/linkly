import { useEffect } from "react";

/** Opens global search on ⌘K / Ctrl+K */
export function useGlobalSearchShortcut(onOpen) {
  useEffect(() => {
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpen();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onOpen]);
}
