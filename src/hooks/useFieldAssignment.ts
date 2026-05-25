"use client";

import { useCallback, useState } from "react";
import type { FieldDefinition } from "@/lib/types";
import { getTtsConfig } from "@/lib/types";
import { cycleFieldAssignment } from "@/lib/fieldToggle";

export type FieldAssignment = {
  frontFields: string[];
  backFields: string[];
  ttsOnlyFields: string[];
};

type UseFieldAssignmentOptions = {
  initial: FieldAssignment;
  fieldDefinitions: readonly FieldDefinition[];
};

type UseFieldAssignmentResult = {
  assignment: FieldAssignment;
  setAssignment: (assignment: FieldAssignment) => void;
  toggleField: (fieldName: string) => void;
};

function cloneAssignment(assignment: FieldAssignment): FieldAssignment {
  return {
    frontFields: [...assignment.frontFields],
    backFields: [...assignment.backFields],
    ttsOnlyFields: [...assignment.ttsOnlyFields],
  };
}

export function useFieldAssignment({
  initial,
  fieldDefinitions,
}: UseFieldAssignmentOptions): UseFieldAssignmentResult {
  const [assignment, setAssignmentState] = useState<FieldAssignment>(() =>
    cloneAssignment(initial),
  );

  const setAssignment = useCallback((nextAssignment: FieldAssignment) => {
    setAssignmentState(cloneAssignment(nextAssignment));
  }, []);

  const toggleField = useCallback(
    (fieldName: string) => {
      setAssignmentState((current) => {
        const fieldDefinition = fieldDefinitions.find(
          (field) => field.name === fieldName,
        );
        const hasTts = fieldDefinition
          ? getTtsConfig(fieldDefinition) !== null
          : false;
        return cycleFieldAssignment(fieldName, current, hasTts);
      });
    },
    [fieldDefinitions],
  );

  return { assignment, setAssignment, toggleField };
}
