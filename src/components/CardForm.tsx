"use client";

import { useState } from "react";
import type { FieldDefinition, TokenAnnotations } from "@/lib/types";
import { getDisplayableFields } from "@/lib/types";
import { normalizeTokenAnnotations } from "@/lib/tokenAnnotations";
import TokenAnnotationEditor from "./TokenAnnotationEditor";
import { Button } from "./ui/Button";
import { TextInput } from "./ui/TextInput";

type Props = {
  fieldDefinitions: FieldDefinition[];
  initialFields?: Record<string, string>;
  initialTokenAnnotations?: TokenAnnotations;
  onSubmit: (fields: Record<string, string>, tokenAnnotations: TokenAnnotations) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export default function CardForm({
  fieldDefinitions,
  initialFields,
  initialTokenAnnotations,
  onSubmit,
  onCancel,
  submitLabel = "Add Card",
}: Props) {
  const [fields, setFields] = useState<Record<string, string>>(
    initialFields ??
      Object.fromEntries(fieldDefinitions.map((f) => [f.name, ""]))
  );
  const [tokenAnnotations, setTokenAnnotations] = useState<TokenAnnotations>(
    initialTokenAnnotations ?? {},
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(fields, normalizeTokenAnnotations(tokenAnnotations) ?? {});
    if (!initialFields) {
      setFields(
        Object.fromEntries(fieldDefinitions.map((f) => [f.name, ""]))
      );
      setTokenAnnotations({});
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {getDisplayableFields(fieldDefinitions)
        .map((fd) => (
          <div key={fd.name}>
            <label className="block text-sm font-medium mb-1">
              {fd.name}
            </label>
            <TextInput
              type="text"
              value={fields[fd.name] ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setFields((prev) => ({
                  ...prev,
                  [fd.name]: value,
                }));
                setTokenAnnotations((prev) => {
                  if (prev[fd.name] === undefined) return prev;
                  const next = { ...prev };
                  delete next[fd.name];
                  return next;
                });
              }}
              placeholder={`Enter ${fd.name.toLowerCase()}...`}
            />
            <TokenAnnotationEditor
              field={fd}
              text={fields[fd.name] ?? ""}
              annotations={tokenAnnotations[fd.name] ?? []}
              onChange={(annotations) =>
                setTokenAnnotations((prev) => {
                  const next = { ...prev };
                  if (annotations.length > 0) {
                    next[fd.name] = annotations;
                  } else {
                    delete next[fd.name];
                  }
                  return next;
                })
              }
            />
          </div>
        ))}
      <div className="flex gap-2">
        <Button
          type="submit"
        >
          {submitLabel}
        </Button>
        {onCancel && (
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
