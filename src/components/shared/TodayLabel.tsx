"use client";

import { useState, useEffect } from "react";

export default function TodayLabel() {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
    setLabel(`${dateStr} (${weekday})`);
  }, []);

  return <>{label}</>;
}
