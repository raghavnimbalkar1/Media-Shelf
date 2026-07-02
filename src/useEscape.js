import { useEffect } from "react";

// Close a modal/overlay when the user presses Escape.
export default function useEscape(onEscape) {
  useEffect(() => {
    function handle(e) {
      if (e.key === "Escape") onEscape();
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onEscape]);
}
