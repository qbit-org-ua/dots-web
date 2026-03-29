'use client';

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface FormFieldProps extends React.ComponentProps<"input"> {
  label?: string;
}

export function FormInput({ label, id, ...props }: FormFieldProps) {
  const fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="space-y-1.5">
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <Input id={fieldId} {...props} />
    </div>
  );
}

interface FormTextareaProps extends React.ComponentProps<"textarea"> {
  label?: string;
}

export function FormTextarea({ label, id, ...props }: FormTextareaProps) {
  const fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="space-y-1.5">
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <Textarea id={fieldId} {...props} />
    </div>
  );
}

interface FormSelectProps extends React.ComponentProps<"select"> {
  label?: string;
  options: { value: string | number; label: string }[];
}

export function FormSelect({ label, id, options, ...props }: FormSelectProps) {
  const fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="space-y-1.5">
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <select
        id={fieldId}
        className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
        {...props}
      >
        <option value="">-- Select --</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
