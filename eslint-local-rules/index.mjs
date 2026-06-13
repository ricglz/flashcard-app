const DEFAULT_MAX_PROPS = 8;
const DEFAULT_IGNORED_PROPS = new Set(["children"]);

function getNodeName(node) {
  if (!node) {
    return undefined;
  }

  if (node.type === "Identifier") {
    return node.name;
  }

  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }

  return undefined;
}

function isPascalCase(name) {
  return /^[A-Z][A-Za-z0-9]*$/.test(name ?? "");
}

function hasExportModifier(node) {
  return Boolean(node.parent?.type === "ExportNamedDeclaration" || node.parent?.type === "ExportDefaultDeclaration");
}

function getTypeReferenceName(typeNode) {
  if (!typeNode) {
    return undefined;
  }

  if (typeNode.type === "TSTypeAnnotation") {
    return getTypeReferenceName(typeNode.typeAnnotation);
  }

  if (typeNode.type === "TSTypeReference") {
    return getNodeName(typeNode.typeName);
  }

  if (typeNode.type === "TSIntersectionType") {
    for (const childType of typeNode.types) {
      const name = getTypeReferenceName(childType);
      if (name) {
        return name;
      }
    }
  }

  return undefined;
}

function countTypeMembers(typeNode, typeDeclarationCounts, ignoredProps) {
  if (!typeNode) {
    return undefined;
  }

  if (typeNode.type === "TSTypeAnnotation") {
    return countTypeMembers(typeNode.typeAnnotation, typeDeclarationCounts, ignoredProps);
  }

  if (typeNode.type === "TSTypeLiteral") {
    return typeNode.members.filter((member) => {
      const name = getNodeName(member.key);
      return name && !ignoredProps.has(name);
    }).length;
  }

  if (typeNode.type === "TSInterfaceBody") {
    return typeNode.body.filter((member) => {
      const name = getNodeName(member.key);
      return name && !ignoredProps.has(name);
    }).length;
  }

  if (typeNode.type === "TSParenthesizedType") {
    return countTypeMembers(typeNode.typeAnnotation, typeDeclarationCounts, ignoredProps);
  }

  if (typeNode.type === "TSIntersectionType") {
    let count = 0;
    let sawCountableType = false;

    for (const childType of typeNode.types) {
      const childCount = countTypeMembers(childType, typeDeclarationCounts, ignoredProps);
      if (childCount !== undefined) {
        count += childCount;
        sawCountableType = true;
      }
    }

    return sawCountableType ? count : undefined;
  }

  const typeReferenceName = getTypeReferenceName(typeNode);
  if (typeReferenceName) {
    return typeDeclarationCounts.get(typeReferenceName);
  }

  return undefined;
}

function countObjectPatternProperties(pattern, ignoredProps) {
  if (pattern?.type !== "ObjectPattern") {
    return undefined;
  }

  return pattern.properties.filter((property) => {
    if (property.type === "RestElement") {
      return false;
    }

    const name = getNodeName(property.key);
    return name && !ignoredProps.has(name);
  }).length;
}

function getFunctionPropCount(node, typeDeclarationCounts, ignoredProps) {
  const propParam = node.params[0];
  if (!propParam) {
    return 0;
  }

  const typeCount = countTypeMembers(propParam.typeAnnotation, typeDeclarationCounts, ignoredProps);
  if (typeCount !== undefined) {
    return typeCount;
  }

  return countObjectPatternProperties(propParam, ignoredProps);
}

function getComponentName(node) {
  if (node.type === "FunctionDeclaration") {
    return getNodeName(node.id);
  }

  if (
    (node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") &&
    node.parent?.type === "VariableDeclarator"
  ) {
    return getNodeName(node.parent.id);
  }

  if (
    (node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") &&
    node.parent?.type === "CallExpression" &&
    node.parent.parent?.type === "VariableDeclarator"
  ) {
    return getNodeName(node.parent.parent.id);
  }

  return undefined;
}

function isLikelyComponent(node) {
  const name = getComponentName(node);
  if (isPascalCase(name)) {
    return true;
  }

  return node.type === "FunctionDeclaration" && hasExportModifier(node) && node.parent.type === "ExportDefaultDeclaration";
}

function getTypeDeclarationCount(node, typeDeclarationCounts, ignoredProps) {
  if (node.type === "TSTypeAliasDeclaration") {
    return countTypeMembers(node.typeAnnotation, typeDeclarationCounts, ignoredProps);
  }

  if (node.type === "TSInterfaceDeclaration") {
    return countTypeMembers(node.body, typeDeclarationCounts, ignoredProps);
  }

  return undefined;
}

const noLargeComponentProps = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Limit React component definition APIs to keep components focused.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          max: {
            type: "integer",
            minimum: 1,
          },
          ignoreProps: {
            type: "array",
            items: { type: "string" },
            uniqueItems: true,
          },
        },
      },
    ],
    messages: {
      tooManyProps: "{{name}} declares {{count}} props, above the limit of {{max}}. Reduce the component API by splitting focused subcomponents, using wrapper or children composition, or moving derivable data, hooks, and handlers into the component that owns the concern.",
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const max = options.max ?? DEFAULT_MAX_PROPS;
    const ignoredProps = new Set([...DEFAULT_IGNORED_PROPS, ...(options.ignoreProps ?? [])]);
    const typeDeclarationCounts = new Map();

    function checkFunction(node) {
      if (!isLikelyComponent(node)) {
        return;
      }

      const count = getFunctionPropCount(node, typeDeclarationCounts, ignoredProps);
      if (count === undefined || count <= max) {
        return;
      }

      context.report({
        node,
        messageId: "tooManyProps",
        data: {
          name: getComponentName(node) ?? "Component",
          count,
          max,
        },
      });
    }

    return {
      Program(program) {
        for (const node of program.body) {
          const count = getTypeDeclarationCount(node, typeDeclarationCounts, ignoredProps);
          if (count !== undefined) {
            typeDeclarationCounts.set(node.id.name, count);
          }
        }
      },
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
    };
  },
};

const localRules = {
  rules: {
    "no-large-component-props": noLargeComponentProps,
  },
};

export default localRules;
