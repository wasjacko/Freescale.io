"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  length?: number;
};

export function OtpInput({ value, onChange, onComplete, length = 6 }: Props) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const setDigit = (idx: number, char: string) => {
    const digit = char.replace(/\D/g, "").slice(0, 1);
    const next = value.split("");
    next[idx] = digit;
    const joined = next.join("").padEnd(length, "").slice(0, length).replace(/\s+$/, "");
    onChange(joined);
    if (digit && idx < length - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
    if (digit && joined.length === length && !joined.includes("") && joined.replace(/\s/g, "").length === length) {
      onComplete?.(joined);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    const lastIdx = Math.min(pasted.length, length - 1);
    inputsRef.current[lastIdx]?.focus();
    if (pasted.length === length) onComplete?.(pasted);
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!value[idx] && idx > 0) {
        inputsRef.current[idx - 1]?.focus();
        const next = value.split("");
        next[idx - 1] = "";
        onChange(next.join(""));
        e.preventDefault();
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowRight" && idx < length - 1) {
      inputsRef.current[idx + 1]?.focus();
      e.preventDefault();
    }
  };

  return (
    <div className="onb-otp" role="group" aria-label="Code à 6 chiffres">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          aria-label={`Chiffre ${i + 1}`}
          value={value[i] ?? ""}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="onb-otp-cell"
        />
      ))}
    </div>
  );
}
