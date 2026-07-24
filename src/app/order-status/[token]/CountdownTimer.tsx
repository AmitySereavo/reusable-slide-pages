"use client";

import { useEffect, useMemo, useState } from "react";

export default function CountdownTimer({
  expiresAt,
}: {
  expiresAt: string | null;
}) {
  const targetTime = useMemo(
    () => (expiresAt ? new Date(expiresAt).getTime() : 0),
    [expiresAt]
  );
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, targetTime - Date.now())
  );

  useEffect(() => {
    if (!targetTime) {
      return;
    }

    const interval = window.setInterval(() => {
      setRemainingMs(Math.max(0, targetTime - Date.now()));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [targetTime]);

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <strong>
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </strong>
  );
}
