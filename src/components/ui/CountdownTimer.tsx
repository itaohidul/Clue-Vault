import { useState, useEffect } from "react";

interface CountdownTimerProps {
  hours: number;
  minutes?: number;
  seconds?: number;
  onFinish?: () => void;
  className?: string;
  showSeconds?: boolean;
}

export default function CountdownTimer({ 
  hours, 
  minutes = 0, 
  seconds = 0, 
  onFinish,
  className = "",
  showSeconds = true
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(hours * 3600 + minutes * 60 + seconds);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (onFinish) onFinish();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onFinish]);

  const h = Math.floor(timeLeft / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);
  const s = timeLeft % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <span className={className}>
      {pad(h)}:{pad(m)}{showSeconds ? `:${pad(s)}` : ""}
    </span>
  );
}
