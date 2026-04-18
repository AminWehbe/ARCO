import { useEffect } from "react";

// Attaches a keydown listener for the lifetime of the component.
// Pass deps that the handler closes over so the listener stays fresh.
export function useKeyNav(handler, deps = []) {
  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, deps);
}
