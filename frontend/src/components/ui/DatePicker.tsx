import React, { useState } from "react";
import { cn } from "../../lib/utils";

export interface DatePickerProps {
  onChange?: (range: { start: string | null; end: string | null }) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ onChange, placeholder, className }: DatePickerProps) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value || null;
    setStart(e.target.value);
    onChange?.({ start: val, end: end || null });
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value || null;
    setEnd(e.target.value);
    onChange?.({ start: start || null, end: val });
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        type="date"
        value={start}
        onChange={handleStartChange}
        className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
        placeholder={placeholder}
      />
      <span className="text-zinc-500 text-xs">to</span>
      <input
        type="date"
        value={end}
        onChange={handleEndChange}
        className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
        placeholder={placeholder}
      />
    </div>
  );
}
