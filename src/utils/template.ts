export function interpolateString(
  template: string,
  context: Record<string, any>
): string {
  try {
    // Match {{variable}} pattern
    return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      // Split path by dots and traverse the context object
      return (
        path
          .trim()
          .split(".")
          .reduce((obj: any, key: string) => {
            return obj?.[key];
          }, context) ?? ""
      );
    });
  } catch (error) {
    console.error("Template interpolation error:", error);
    return template;
  }
}

export function interpolateObject(
  template: any,
  context: Record<string, any>
): any {
  if (typeof template === "string") {
    return interpolateString(template, context);
  }

  if (Array.isArray(template)) {
    return template.map((item) => interpolateObject(item, context));
  }

  if (typeof template === "object" && template !== null) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(template)) {
    //   console.log("key", key);
    //   console.log("value", value);
      result[key] = interpolateObject(value, context);
    }
    console.log("ayayaya")
    return result;
  }

  return template;
}
