import { generateReactNativeStyles } from "../shared/ReactNativeStylesGenerator";

import type babel from "@babel/core";
import * as p     from "path";
import fs         from "fs";

const OUTPUT_DIR_NAME = "dist";

const matchExtensions = matcher([ ".scss", ".css" ]);

function matcher(extensions = [ ".css" ]) {
  const extensionsPattern = extensions.join("|").replace(/\./g, "\\.");
  return new RegExp(`(${extensionsPattern})$`, "i");
}

function resolveFromDir(dir: string) {
  if (p.isAbsolute(dir)) {
    return dir;
  }
  if (process.env.PWD) {
    return p.resolve(process.env.PWD, dir);
  }
  return p.resolve(dir);
}


function requireCssFile(from: string, cssFile: string): [fileContents: () => string, filePath: string] {
  let filePathOrModuleName = cssFile;

  // only resolve path to file when we have a file path
  if (!/^\w/i.test(filePathOrModuleName)) {
    filePathOrModuleName = p.resolve(from, filePathOrModuleName);
  }

  const resolvedPath = require.resolve(filePathOrModuleName);
  return [ () => fs.readFileSync(resolvedPath).toString("utf-8"), resolvedPath ];
}

const COMPILED_CACHE: Record<string, true> = {};

const tryTransformImportNode = (valueNode: { value: string }, state: babel.PluginPass) => {
  const { value } = valueNode;
  if (matchExtensions.test(value)) {
    const from = resolveFromDir(state.file.opts.filename! ? p.dirname(state.file.opts.filename!) : state.cwd);

    const [ fileContents, filePath ] = requireCssFile(from, value);
    const componentName   = p.basename(value).split(".")[0];

    if (!COMPILED_CACHE[filePath]) {
      // move all nested rules to the top level
      const { css, styles } = generateReactNativeStyles({ filename: filePath, src: fileContents() });

      const outDir = p.resolve(p.resolve(state.cwd, OUTPUT_DIR_NAME), p.relative(state.cwd, p.dirname(filePath)));
      if (process.env.NODE_ENV !== "test") {
        fs.writeFileSync(p.resolve(outDir, `${componentName}.module.css`), css);
        // metro web handles CSS modules for us
        fs.writeFileSync(p.resolve(outDir, `${componentName}.generated-styles.js`), `module.exports=require('./${componentName}.module.css');`);
        fs.writeFileSync(p.resolve(outDir, `${componentName}.generated-styles.native.js`), `module.exports=${JSON.stringify(styles)}`);
      }

    }
    COMPILED_CACHE[filePath] = true;


    valueNode.value = `./${p.relative(from, p.resolve(p.dirname(filePath), `${componentName}.generated-styles`))}`;
  }
};

export default function babelPluginReactNativeCssModules(): babel.PluginObj {
  return {
    visitor: {
      ImportDeclaration(path, state) {
        tryTransformImportNode(path.node.source, state);
      },

      CallExpression(path, state) {
        if (path.node.callee?.type === "Identifier") {
          if (path.node.callee.name === "require") {
            if (path.node.arguments[0]?.type === "StringLiteral") {
              tryTransformImportNode(path.node.arguments[0], state);

            }
          }
        }
      },

    },
  };
};
