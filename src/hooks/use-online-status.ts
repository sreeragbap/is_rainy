"use client";

import { useEffect, useState } from "react";

/**
 * Whether the browser thinks it has a connection.
 *
 * Starts optimistic so server and first client render agree; the real value
 * arrives in the effect. `navigator.onLine` only proves the radio is on, so it
 * is used to explain a failure, never to predict one — requests are still
 * attempted while "offline".
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);

    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}
