import type {StyleProp}                                                                  from "react-native";
import {DynamicStyleProperties, isDynamicStyle, isNamedStyle, PossiblyCompiledStyleProp} from "../common/Styles";
import {matchQuery}                                                                      from "./MediaQueryMatch";

export interface DynamicStyleProcessorOptions {
  state?: string[];
}

export type DynamicStyleProcessor<T> = ((style: PossiblyCompiledStyleProp<T>, options?: DynamicStyleProcessorOptions) => StyleProp<T>);

export interface StyleDimensions {
  listen: (callback: () => void) => () => void,
  getWidth: () => number,
  getHeight: () => number
}

interface ProcessDynamicStylesOutput<T> {
  classes: string[],
  requiresPostProcessing?: number[],
  respondsToDimensionsChange?: boolean,
  result: T[],
}

export type Vars = Record<string, any>;

export interface DynamicStyleOptions {
  vars?: Vars,
  dimensions?: StyleDimensions,
  baseFontSize?: number,
  optimise?: boolean,
  debug?: boolean,
}

const generateDynamicStyleForStyle = <T>(dynamicProperties: DynamicStyleProperties, style: PossiblyCompiledStyleProp<T>, options: DynamicStyleOptions, output?: ProcessDynamicStylesOutput<T>): any => {
  let dynamicStyle: any = undefined;
  if (dynamicProperties.specialUnits) {
    for (const dynamicProperty of dynamicProperties.specialUnits) {
      const dynamicValue                                     = (style as any)[dynamicProperty];
      (dynamicStyle || (dynamicStyle = {__source: (style as any).__source}))[dynamicProperty] = processDynamicProperty(dynamicValue, options, output);
    }
  }

  if (dynamicProperties.vars) {
    Object.keys(dynamicProperties.vars).reduce((dynamic, key) => {
      const varKey = dynamicProperties.vars[key];
      dynamic[key] = options.vars?.[varKey];
      return dynamic;
    }, (dynamicStyle || (dynamicStyle =  {__source: (style as any).__source})));
  }

  return dynamicStyle;
};

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


    if (style.__dynamic.when) {
      if (!resolvedOutput.requiresPostProcessing) {
        resolvedOutput.requiresPostProcessing = [];
      }
      resolvedOutput.requiresPostProcessing.push(resolvedOutput.result.length - 1);
    }

    if (style.__dynamic.vars || style.__dynamic.specialUnits) {
      const dynamicStyle = generateDynamicStyleForStyle(style.__dynamic, style, options, resolvedOutput);
      if (dynamicStyle) {
        resolvedOutput.result.push(dynamicStyle);
      }
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
          if (whenCondition.mediaQueries?.length) {
            output.respondsToDimensionsChange = true;
          }

          let completedIndex = -1;
          let meetsCondition = whenCondition.classes.every((className, index) => {
            completedIndex = index;
            return output.classes.includes(className);
          });

          if (meetsCondition && whenCondition.mediaQueries?.length) {
            meetsCondition = matchQuery(whenCondition.mediaQueries, {
              width : options.dimensions?.getWidth(),
              height: options.dimensions?.getHeight(),
            });
          }

          if (meetsCondition) {
            const dynamicStyles = dynamicStylesBySource[style.__source] || (dynamicStylesBySource[style.__source] = []);

            const resultList = (dynamicStyles[whenCondition.style.__precedence - 1] || (dynamicStyles[whenCondition.style.__precedence - 1] = []));
            resultList.push(whenCondition.style as any);

            const dynamicStyle = generateDynamicStyleForStyle(whenCondition, whenCondition.style, options);
            if (dynamicStyle) {
              resultList.push(dynamicStyle);
            }
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
    const sourceValue = Number(source);
    let lastOfSource    = -1;
    for (let i = output.result.length; i >= 0; i--) {
      const style = output.result[i];
      if (style && (style as any).__source === sourceValue) {
        lastOfSource = i;
        break;
      }
    }


    if (options.debug) {
      console.log(output.result, lastOfSource, dynamicStyles.flat(1));
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

const processDynamicProperty = (value: string | number, options: DynamicStyleOptions, output?: ProcessDynamicStylesOutput<any>): any => {
  if (typeof value === "string") {
    if (value.endsWith("rem")) {
      const remValue = parseFloat(value);
      return remValue * (options.baseFontSize || 16);
    } else if (value.endsWith("vw") || value.endsWith("vh")) {
      // listen to dimensions change
      if (output) {
        output.respondsToDimensionsChange = true;
      }
      const parsedValue                 = parseFloat(value) / 100;
      return parsedValue * (value.endsWith("vw") ? (options.dimensions?.getWidth() || 0) : (options.dimensions?.getHeight() || 0));
    }
  }
  return value;
};
