export function interpolateValue(value: any, context: Record<string, any>): any {
    if (typeof value === 'string') {
      // Match ${{variableName}} pattern
      return value.replace(/\${{(.*?)}}/g, (match, key) => {
        const path = key.trim().split('.');
        let result: any = context;
        
        // Traverse the path to get the value
        for (const segment of path) {
          result = result?.[segment];
          if (result === undefined) return match; // Keep original if not found
        }
  
        return typeof result === 'string' ? result : String(result); // Ensure return type is string
      });
    }
    
    if (Array.isArray(value)) {
      return value.map(item => interpolateValue(item, context));
    }
    
    if (typeof value === 'object' && value !== null) {
      const result: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = interpolateValue(val, context);
      }
      return result;
    }
    
    return value;
  }
  