import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils"; // shadcn util; ensure this exists (created by init)
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatHHmm, parseHHmm, HOURS_24, minutesByStep, pad } from "./time-picker-utils";

export type TimePickerInputProps = {
  /** value in "HH:mm" 24h format, e.g. "06:00" */
  value?: string;
  onChange?: (value: string) => void;
  /** minute step granularity, e.g. 1 | 5 | 10 | 15 | 30 */
  step?: number;
  /** if true, renders 12h UI with AM/PM, still outputs "HH:mm" */
  use12Hour?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  popoverClassName?: string;
};

export function TimePickerInput({
  value,
  onChange,
  step = 5,
  use12Hour = false,
  placeholder = "Select time",
  disabled,
  className,
  popoverClassName,
}: TimePickerInputProps) {
  const parsed = parseHHmm(value) ?? { hour: 0, minute: 0 };
  const [open, setOpen] = React.useState(false);
  const [hour, setHour] = React.useState(parsed.hour);
  const [minute, setMinute] = React.useState(parsed.minute);
  const [meridiem, setMeridiem] = React.useState<"AM" | "PM">(parsed.hour >= 12 ? "PM" : "AM");

  // keep internal state in sync when parent value changes
  React.useEffect(() => {
    const p = parseHHmm(value);
    if (p) {
      setHour(p.hour);
      setMinute(p.minute);
      setMeridiem(p.hour >= 12 ? "PM" : "AM");
    }
  }, [value]);

  const minuteOptions = minutesByStep(step);

  const hourOptions12 = Array.from({ length: 12 }, (_, i) => {
    const h = (i + 1); // 1..12
    return pad(h);
  });

  function as24h(h12: number, md: "AM" | "PM") {
    if (md === "AM") return h12 === 12 ? 0 : h12;
    // PM
    return h12 === 12 ? 12 : h12 + 12;
  }

  function commit(h: number, m: number, md?: "AM" | "PM") {
    let H = h;
    if (use12Hour && md) {
      // convert to 24h before emitting
      const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
      H = as24h(h12, md);
    }
    const v = formatHHmm(H, m);
    onChange?.(v);
  }

  const display = value ? value : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Input
            readOnly
            disabled={disabled}
            value={display}
            placeholder={placeholder}
            className={cn("pr-10 cursor-pointer", className)}
          />
          <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60 pointer-events-none" />
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className={cn("w-[260px] p-3", popoverClassName)}
      >
        <div className={cn("grid gap-3", use12Hour ? "grid-cols-[1fr_1fr_auto]" : "grid-cols-2")}>
          {/* Hour */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Hour</div>
            <Select
              value={
                use12Hour
                  ? pad(hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour))
                  : pad(hour)
              }
              onValueChange={(val) => {
                const hNum = Number(val);
                if (use12Hour) {
                  const H = as24h(hNum, meridiem);
                  setHour(H);
                  commit(H, minute, meridiem);
                } else {
                  setHour(hNum);
                  commit(hNum, minute);
                }
              }}
            >
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="hh" />
              </SelectTrigger>
              <SelectContent className="max-h-60 w-fit min-w-0">
                {(use12Hour ? hourOptions12 : HOURS_24).map((h) => (
                  <SelectItem className='cursor-pointer !justify-center' key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Minute */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Minute</div>
            <Select
              value={pad(minute)}
              onValueChange={(val) => {
                const mNum = Number(val);
                setMinute(mNum);
                commit(hour, mNum, use12Hour ? meridiem : undefined);
              }}
            >
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="mm" />
              </SelectTrigger>
              <SelectContent className="max-h-60 w-fit min-w-0">
                {minuteOptions.map((m) => (
                  <SelectItem className='cursor-pointer !justify-center' key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* AM/PM (optional) */}
          {use12Hour && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">AM/PM</div>
              <Select
                value={meridiem}
                onValueChange={(val: "AM" | "PM") => {
                  setMeridiem(val);
                  commit(hour, minute, val);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="AM/PM" />
                </SelectTrigger>
                <SelectContent className="w-fit min-w-0">
                  <SelectItem value="AM">AM</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <Button
            type="button"
            className="cursor-pointer"
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            onClick={() => setOpen(false)}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default TimePickerInput;
