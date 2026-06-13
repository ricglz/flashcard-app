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

function getObjectPatternPropertyNames(pattern, ignoredProps) {
  if (pattern?.type !== "ObjectPattern") {
    return undefined;
  }

  const names = [];

  for (const property of pattern.properties) {
    if (property.type === "RestElement") {
      return undefined;
    }

    const name = getNodeName(property.key);
    if (name && !ignoredProps.has(name)) {
      names.push(name);
    }
  }

  return names;
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

function getReturnedExpression(node) {
  if (node.type === "ArrowFunctionExpression" && node.body.type !== "BlockStatement") {
    return node.body;
  }

  if (node.body?.type !== "BlockStatement" || node.body.body.length !== 1) {
    return undefined;
  }

  const statement = node.body.body[0];
  if (statement.type !== "ReturnStatement") {
    return undefined;
  }

  return statement.argument;
}

function isEmptyJsxText(node) {
  return node.type === "JSXText" && node.value.trim() === "";
}

function isSingleCustomElement(expression) {
  if (expression?.type !== "JSXElement") {
    return false;
  }

  const name = expression.openingElement.name;
  if (name.type !== "JSXIdentifier" || !isPascalCase(name.name)) {
    return false;
  }

  return expression.children.every(isEmptyJsxText);
}

function getJsxElementName(expression) {
  const name = expression?.openingElement?.name;
  if (name?.type === "JSXIdentifier") {
    return name.name;
  }

  return undefined;
}

function getForwardedPropName(attribute) {
  if (attribute.type !== "JSXAttribute") {
    return undefined;
  }

  if (attribute.value?.type !== "JSXExpressionContainer") {
    return undefined;
  }

  const expression = attribute.value.expression;
  if (expression.type !== "Identifier") {
    return undefined;
  }

  return expression.name;
}

function getForwardedPropNames(attributes) {
  const names = [];

  for (const attribute of attributes) {
    const name = getForwardedPropName(attribute);
    if (!name) {
      return undefined;
    }
    names.push(name);
  }

  return names;
}

function getCalleeNames(callee) {
  if (callee?.type === "ChainExpression") {
    return getCalleeNames(callee.expression);
  }

  if (callee?.type === "Identifier") {
    return [callee.name];
  }

  if (callee?.type !== "MemberExpression") {
    return [];
  }

  const objectNames = getCalleeNames(callee.object);
  const propertyName = getNodeName(callee.property);
  if (!propertyName) {
    return [];
  }

  const names = [propertyName];
  for (const objectName of objectNames) {
    names.push(`${objectName}.${propertyName}`);
  }

  return names;
}

function getIgnoredCallExpression(expression) {
  if (expression?.type === "ChainExpression") {
    return getIgnoredCallExpression(expression.expression);
  }

  if (expression?.type === "AwaitExpression") {
    return getIgnoredCallExpression(expression.argument);
  }

  if (expression?.type === "UnaryExpression" && expression.operator === "void") {
    return getIgnoredCallExpression(expression.argument);
  }

  return expression?.type === "CallExpression" ? expression : undefined;
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

const noIgnoredReturnValues = {
  meta: {
    type: "problem",
    docs: {
      description: "Require selected function return values to be used.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          functions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name"],
              properties: {
                name: { type: "string", minLength: 1 },
                message: { type: "string", minLength: 1 },
              },
            },
            uniqueItems: true,
          },
        },
      },
    ],
    messages: {
      ignoredReturn: "{{name}} returns a value that must be used. {{message}}",
    },
  },

  create(context) {
    const checks = context.options[0]?.functions ?? [];
    const checkByName = new Map(checks.map((check) => [check.name, check]));

    function checkExpressionStatement(node) {
      const callExpression = getIgnoredCallExpression(node.expression);
      if (!callExpression) {
        return;
      }

      const names = getCalleeNames(callExpression.callee);
      const check = names.map((name) => checkByName.get(name)).find(Boolean);
      if (!check) {
        return;
      }

      context.report({
        node: callExpression,
        messageId: "ignoredReturn",
        data: {
          name: check.name,
          message: check.message ?? "Assign, return, or otherwise consume the result.",
        },
      });
    }

    return {
      ExpressionStatement: checkExpressionStatement,
    };
  },
};

const noPassthroughComponentWrapper = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Avoid React components that only forward props to another component.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          minProps: {
            type: "integer",
            minimum: 1,
          },
          forwardRatio: {
            type: "number",
            minimum: 0,
            maximum: 1,
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
      passthroughWrapper: "{{name}} only forwards props to {{target}}. Use {{target}} directly or add component-owned behavior before extracting a wrapper.",
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const minProps = options.minProps ?? 3;
    const forwardRatio = options.forwardRatio ?? 0.75;
    const ignoredProps = new Set([...DEFAULT_IGNORED_PROPS, ...(options.ignoreProps ?? [])]);

    function checkFunction(node) {
      if (!isLikelyComponent(node)) {
        return;
      }

      const propNames = getObjectPatternPropertyNames(node.params[0], ignoredProps);
      if (!propNames || propNames.length < minProps) {
        return;
      }

      const returnedExpression = getReturnedExpression(node);
      if (!isSingleCustomElement(returnedExpression)) {
        return;
      }

      const attributes = returnedExpression.openingElement.attributes;
      const forwardedPropNames = getForwardedPropNames(attributes);
      if (!forwardedPropNames) {
        return;
      }

      const propNameSet = new Set(propNames);
      if (forwardedPropNames.some((name) => !propNameSet.has(name))) {
        return;
      }

      const forwardedOwnProps = new Set(forwardedPropNames);
      if (forwardedOwnProps.size / propNames.length < forwardRatio) {
        return;
      }

      const target = getJsxElementName(returnedExpression) ?? "the child component";
      context.report({
        node,
        messageId: "passthroughWrapper",
        data: {
          name: getComponentName(node) ?? "Component",
          target,
        },
      });
    }

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
    };
  },
};

const localRules = {
  rules: {
    "no-large-component-props": noLargeComponentProps,
    "no-ignored-return-values": noIgnoredReturnValues,
    "no-passthrough-component-wrapper": noPassthroughComponentWrapper,
  },
};

export default localRules;
