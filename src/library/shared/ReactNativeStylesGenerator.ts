import css, {Declaration}                      from "css";
import {parseCss, ParseCssResult}              from "./CssParser";
import * as CssWhat                            from "css-what";
import {getPropertyName, getStylesForProperty} from "../../vendored/css-to-react-native/src/index";
import {MediaQuery, PossiblyCompiledStyleProp} from "../../common/Styles";
// @ts-ignore
import camelize                                from "camelize";
import {parseQuery}                            from "./MediaQueryParse";

export interface ReactNativeStylesGeneratorOptions {
  src: string,
  filename?: string,
  platform?: string,
}

export interface GenerateReactNativeStylesResult extends ParseCssResult {
  styles: ReactNativeStyles,
}

export type ReactNativeStyles = Record<string, PossiblyCompiledStyleProp<any>>;

const SHORTHAND_BORDER_PROPS = [
  "borderRadius",
  "borderWidth",
  "borderColor",
  "borderStyle",
];

const DYNAMIC_UNITS = [
  "rem",
  "vw",
  "vh",
]

let sourceCounter = 0;

const processRule = (rule: css.Rule, styles: ReactNativeStyles, sourceId: number, allClasses: Set<string>, mediaQuery?: MediaQuery) => {
  const {selectors, declarations} = (rule as css.Rule);
  if (selectors && declarations) {

    const styleObject: any = {};

    // 1. turn all "background: red" into {backgroundColor: "red"}

    for (const decl of declarations as Declaration[]) {
      if (decl.type === "declaration" && decl.property && decl.value) {
        const property       = getPropertyName(decl.property);
        const processedStyle = getStylesForProperty(property, decl.value);

        // transform "border-width" back into only "borderWidth" if only one value present
        if (SHORTHAND_BORDER_PROPS.includes(property)) {
          const values = Object.values(processedStyle);
          if (values.every(v => values[0] === v)) {
            styleObject[getPropertyName(property)] = values[0];
          }
        } else {
          Object.assign(styleObject, processedStyle);
        }
      }
    }


    // 2. grab any vars

    const specialUnits            = new Set<string>();
    const vars: Record<string, string> = {};
    for (const key of Object.keys(styleObject)) {
      const value = styleObject[key];
      if (value) {
        if (typeof value === "object" && value.var) {
          vars[key] = value.var;
          delete styleObject[key];
        } else if (typeof value === "string" && DYNAMIC_UNITS.some(unit => value.endsWith(unit))) {
          specialUnits.add(key);
        }
      }
    }

    // 3. parse selectors for this rule, could be more than one: ".sm, .small"

    for (const selector of selectors) {
      const classes: string[] = [];
      let selectorSupported   = true;

      const [parsedSelector] = CssWhat.parse(selector);

      for (const selectorElement of parsedSelector) {
        if (selectorElement.type === "attribute") {
          if (selectorElement.name === "class") {
            classes.push(selectorElement.value);
            allClasses.add(selectorElement.value);
          } else {
            selectorSupported = false;
          }
        } else {
          selectorSupported = false;
        }
      }

      // at least one class present in selector
      if (classes.length > 0 && selectorSupported) {
        const name = classes.pop()!;

        const selectorStyleObject: any = styles[name] || (styles[name] = {
          __name  : name,
          __source: sourceId,
        } as any);

        // complex selector with multiple classes
        if (classes.length > 0 || mediaQuery) {
          const dynamic = selectorStyleObject.__dynamic || (selectorStyleObject.__dynamic = {});
          const when    = dynamic.when || (dynamic.when = []);

          const whenCondition: any = {
            classes: classes,
            style  : styleObject,
          };

          if (specialUnits.size > 0) {
            whenCondition.specialUnits = Array.from(specialUnits);
          }

          if (Object.keys(vars).length > 0) {
            whenCondition.vars  = vars;
          }

          if (mediaQuery) {
            whenCondition.mediaQueries = mediaQuery;
          }

          styleObject.__precedence = classes.length + 1;

          when.push(whenCondition);
        } else {
          Object.assign(selectorStyleObject, styleObject);
          if (specialUnits.size > 0) {
            const dynamic             = selectorStyleObject.__dynamic || (selectorStyleObject.__dynamic = {});
            dynamic.specialUnits = Array.from(specialUnits);
          }

          if (Object.keys(vars).length > 0) {
            const dynamic = selectorStyleObject.__dynamic || (selectorStyleObject.__dynamic = {});
            dynamic.vars  = vars;
          }
        }
      }
    }


  }
};

export const generateReactNativeStyles = (options: ReactNativeStylesGeneratorOptions): GenerateReactNativeStylesResult => {
  const {stylesheet, css}         = parseCss(options);
  const styles: ReactNativeStyles = {};

  const sourceId = sourceCounter++;

  const allClasses = new Set<string>();

  for (const rule of stylesheet.rules) {
    if (rule.type === "rule") {
      processRule(rule, styles, sourceId, allClasses);
    } else if (rule.type === "media") {
      const mediaQuery = parseQuery((rule as any).media);
      for (const subRule of (rule as any).rules) {
        if (subRule.type === "rule") {
          processRule(subRule, styles, sourceId, allClasses, mediaQuery);
        }
      }
    }
  }

  // find any classes that are mentioned in selectors but were removed during SASS compile due to having no rules of their own
  Object.keys(styles).forEach(className => allClasses.delete(className));
  for (const missingClass of allClasses) {
    styles[missingClass] = {__name: missingClass};
  }

  return {styles, css, stylesheet};
};
