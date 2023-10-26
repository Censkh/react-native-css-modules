import { generateReactNativeStyles } from "../shared/ReactNativeStylesGenerator";

import * as babel from "@babel/core";
import * as p     from "path";
import fs         from "fs";

const EXTENTIONS = [ ".module.css", ".module.scss" ];

function isCssModule(fileName: string) {
  return EXTENTIONS.some(ext => fileName.endsWith(ext));
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


function requireCssFile(from: string, cssFile: string): [ fileContents: () => string, filePath: string ] {
  let filePathOrModuleName = cssFile;

  // only resolve path to file when we have a file path
  if (!/^\w/i.test(filePathOrModuleName)) {
    filePathOrModuleName = p.resolve(from, filePathOrModuleName);
  }

  const resolvedPath = require.resolve(filePathOrModuleName);
  return [ () => fs.readFileSync(resolvedPath).toString("utf-8"), resolvedPath ];
}

const COMPILED_CACHE: Record<string, true> = {};

const tryTransformImportNode = (valueNode: babel.Node & { value: string }, state: babel.PluginPass, path: babel.NodePath) => {
  const { value } = valueNode;
  if (isCssModule(value)) {
    const from = resolveFromDir(state.file.opts.filename! ? p.dirname(state.file.opts.filename!) : state.cwd);

    const [ fileContents, filePath ] = requireCssFile(from, value);
    const componentName              = p.basename(value).split(".")[0];

    if (!COMPILED_CACHE[filePath]) {
      // move all nested rules to the top level
      const { css, styles } = generateReactNativeStyles({ filename: filePath, src: fileContents() });

      const { distDir, rootDir } = state.opts as any;
      if (!distDir) {
        throw new Error("[react-native-css-modules] 'distDir' is required in babel plugin options, it will be a relative path to where your files are compiled, eg. 'dist'");
      }

      if (!rootDir) {
        throw new Error("[react-native-css-modules] 'rootDir' is required in babel plugin options, it will be a relative path to where your source file root is, eg. 'src' or '.'");
      }

      const outDir = p.resolve(p.resolve(state.cwd, distDir), p.relative(p.resolve(state.cwd, rootDir || "."), p.dirname(filePath)));

      // actually write the files
      if (process.env.NODE_ENV !== "test") {
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }

        fs.writeFileSync(p.resolve(outDir, `${componentName}.module.css`), css);
        // metro web handles CSS modules for us
        fs.writeFileSync(p.resolve(outDir, `${componentName}.generated-styles.js`), `module.exports=require('./${componentName}.module.css');`);
        fs.writeFileSync(p.resolve(outDir, `${componentName}.generated-styles.native.js`), `module.exports=${JSON.stringify(styles)}`);
      } else {
        path.addComment("leading", ` generated file location: ${p.relative(process.cwd(), outDir)} `);
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
        tryTransformImportNode(path.node.source, state, path);
      },

      CallExpression(path, state) {
        if (path.node.callee?.type === "Identifier") {
          if (path.node.callee.name === "require") {
            if (path.node.arguments[0]?.type === "StringLiteral") {
              tryTransformImportNode(path.node.arguments[0], state, path);

            }
          }
        }
      },

    },
  };
};
