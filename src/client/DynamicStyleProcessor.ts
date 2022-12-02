import type {StyleProp}                                          from "react-native";
import {isDynamicStyle, isNamedStyle, PossiblyCompiledStyleProp} from "../common/Styles";

export type DynamicStyleProcessor<T> = ((style: PossiblyCompiledStyleProp<T>) => StyleProp<T>);

interface ProcessDynamicStylesOutput<T> {
  classes: string[],
  requiresPostProcessing: number[],
  result: T[],
}

export type Vars = Record<string, any>;

export interface DynamicStyleContext {
  vars: Vars,
  optimise?: boolean,
}

const processDynamicStyleProp = <T>(style: PossiblyCompiledStyleProp<T>, context: DynamicStyleContext, output?: ProcessDynamicStylesOutput<T>): ProcessDynamicStylesOutput<T> => {
  const resolvedOutput = output || {
    classes               : [],
    result                : [],
    requiresPostProcessing: [],
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
    style.map((subStyle) => processDynamicStyleProp(subStyle as any, context, resolvedOutput));
    return resolvedOutput;
  }

  if (isDynamicStyle(style)) {
    resolvedOutput.classes.push(style.__name);
    resolvedOutput.result.push(style);

    if (style.__dynamic.mediaQueries) {
      //console.log(style.__mediaQueries);
    }

    if (style.__dynamic.when) {
      resolvedOutput.requiresPostProcessing.push(resolvedOutput.result.length - 1);
    }

    if (style.__dynamic.vars) {
      resolvedOutput.result.push(Object.keys(style.__dynamic.vars).reduce((dynamic, key) => {
        const varKey = style.__dynamic.vars[key];
        dynamic[key] = context.vars[varKey];
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

const postProcessDynamicStyles = <T>(output: ProcessDynamicStylesOutput<T>, context: DynamicStyleContext) => {
  if (output.requiresPostProcessing.length === 0) {
    return;
  }

  const dynamicStyles: Array<T[]> = [];

  for (const index of output.requiresPostProcessing) {
    const style = output.result[index];

    if (isDynamicStyle(style)) {
      if (style.__dynamic.when) {
        for (const whenCondition of style.__dynamic.when) {
          const meetsCondition = whenCondition.classes.every((className) => output.classes.includes(className));
          if (meetsCondition) {
            (dynamicStyles[whenCondition.style.__precedence - 1] || (dynamicStyles[whenCondition.style.__precedence - 1] = [])).push(whenCondition.style as any);
          }
        }
      }
    }
  }

  for (const style of dynamicStyles) {
    output.result.push(...style);
  }
};

export const processDynamicStyles = <T>(style: PossiblyCompiledStyleProp<T>, context: DynamicStyleContext): ProcessDynamicStylesOutput<T> => {
  const processingOutput = processDynamicStyleProp(style, context);

  postProcessDynamicStyles(processingOutput, context);

  return processingOutput;
};

