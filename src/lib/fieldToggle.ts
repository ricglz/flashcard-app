export type FieldAssignments = {
  frontFields: string[];
  backFields: string[];
  ttsOnlyFields: string[];
};

export function cycleFieldAssignment(
  fieldName: string,
  assignments: FieldAssignments,
  hasTts: boolean
): FieldAssignments {
  const { frontFields, backFields, ttsOnlyFields } = assignments;

  if (frontFields.includes(fieldName)) {
    if (frontFields.length <= 1) return assignments;
    return {
      frontFields: frontFields.filter((f) => f !== fieldName),
      backFields: [...backFields, fieldName],
      ttsOnlyFields,
    };
  }

  if (backFields.includes(fieldName)) {
    if (hasTts) {
      if (backFields.length <= 1) return assignments;
      return {
        frontFields,
        backFields: backFields.filter((f) => f !== fieldName),
        ttsOnlyFields: [...ttsOnlyFields, fieldName],
      };
    }
    if (backFields.length <= 1) return assignments;
    return {
      frontFields: [...frontFields, fieldName],
      backFields: backFields.filter((f) => f !== fieldName),
      ttsOnlyFields,
    };
  }

  if (ttsOnlyFields.includes(fieldName)) {
    return {
      frontFields: [...frontFields, fieldName],
      backFields,
      ttsOnlyFields: ttsOnlyFields.filter((f) => f !== fieldName),
    };
  }

  return assignments;
}
