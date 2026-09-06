"use client";

import { useEffect, useState } from "react";

/** True once the viewport is at/below the given breakpoint (default lg). */
export function useIsMobile(breakpoint = 1024): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth < breakpoint,
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
}
