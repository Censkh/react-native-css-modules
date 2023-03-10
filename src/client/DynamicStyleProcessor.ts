import type {StyleProp}                                          from "react-native";
import {isDynamicStyle, isNamedStyle, PossiblyCompiledStyleProp} from "../common/Styles";

export type DynamicStyleProcessor<T> = ((style: PossiblyCompiledStyleProp<T>) => StyleProp<T>);

interface ProcessDynamicStylesOutput<T> {
  classes: string[],
  requiresPostProcessing?: number[],
  result: T[],
}

export type Vars = Record<string, any>;

export interface DynamicStyleOptions {
  vars: Vars,
  optimise?: boolean,
  debug?: boolean,
}

const processDynamicStyleProp = <T>(style: PossiblyCompiledStyleProp<T>, options: DynamicStyleOptions, output?: ProcessDynamicStylesOutput<T>): ProcessDynamicStylesOutput<T> => {
  const resolvedOutput = output || {
    classes               : [],
    result                : [],
    requiresPostProcessing: undefined,
  };

  if (!style) {
    return resolvedOutput;
  }

  if (typeof style === "string") {
    resolvedOutput.classes.push(style);
    resolvedOutput.result.push(style);
    return resolvedOutput;
  }

  if (Array.isArray(style)) {
    style.map((subStyle) => processDynamicStyleProp(subStyle as any, options, resolvedOutput));
    return resolvedOutput;
  }

  if (isDynamicStyle(style)) {
    resolvedOutput.classes.push(style.__name);
    resolvedOutput.result.push(style);

    if (style.__dynamic.mediaQueries) {
      //console.log(style.__mediaQueries);
    }

    if (style.__dynamic.when) {
      if (!resolvedOutput.requiresPostProcessing) {
        resolvedOutput.requiresPostProcessing = [];
      }
      resolvedOutput.requiresPostProcessing.push(resolvedOutput.result.length - 1);
    }

    if (style.__dynamic.vars) {
      resolvedOutput.result.push(Object.keys(style.__dynamic.vars).reduce((dynamic, key) => {
        const varKey = style.__dynamic.vars[key];
        dynamic[key] = options.vars[varKey];
        return dynamic;
      }, {} as any));
    }
  } else {
    if (isNamedStyle(style)) {
      resolvedOutput.classes.push(style.__name);
    }

    resolvedOutput.result.push(style as any);
  }

  return resolvedOutput;
};

const postProcessDynamicStyles = <T>(output: ProcessDynamicStylesOutput<T>, options: DynamicStyleOptions) => {
  if (!output.requiresPostProcessing || output.requiresPostProcessing.length === 0) {
    return;
  }

  const dynamicStylesBySource: Record<number, Array<T[]>> = {};

  for (const index of output.requiresPostProcessing) {
    const style = output.result[index];

    if (isDynamicStyle(style)) {
      if (style.__dynamic.when) {
        for (const whenCondition of style.__dynamic.when) {
          let completedIndex   = -1;
          const meetsCondition = whenCondition.classes.every((className, index) => {
            completedIndex = index;
            return output.classes.includes(className);
          });

          if (meetsCondition) {
            const dynamicStyles = dynamicStylesBySource[style.__source] || (dynamicStylesBySource[style.__source] = []);
            (dynamicStyles[whenCondition.style.__precedence - 1] || (dynamicStyles[whenCondition.style.__precedence - 1] = [])).push(whenCondition.style as any);
          }
        }
      }
    }
  }

  // we want to insert all the nested styles after all the styles from the source file they were from
  // this means that .btn.sm.primary is insert after all .btn.sm styles, and all .btn styles
  // but importantly less nested styles from other source files are not superseded
  for (const source in dynamicStylesBySource) {
    const dynamicStyles = dynamicStylesBySource[source];
    let lastOfSource        = -1;
    for (let i = output.result.length; i >=0; i--) {
      const style = output.result[i];
      if (isNamedStyle(style) && style.__source === Number(source)) {
        lastOfSource = i;
        break;
      }
    }

    output.result.splice(lastOfSource + 1, 0, ...dynamicStyles.flat(1));
    if (options.debug) {
      console.log(output.result, lastOfSource, dynamicStyles);
    }
  }
};

export const processDynamicStyles = <T>(style: PossiblyCompiledStyleProp<T>, options: DynamicStyleOptions): ProcessDynamicStylesOutput<T> => {
  const processingOutput = processDynamicStyleProp(style, options);

  postProcessDynamicStyles(processingOutput, options);

  return processingOutput;
};

