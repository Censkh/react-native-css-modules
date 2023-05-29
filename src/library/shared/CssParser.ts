import css                                 from "css";
import sass, {LegacyOptions}               from "sass";
import path                                from "path";
import fs                                  from "fs";
import {ReactNativeStylesGeneratorOptions} from "./ReactNativeStylesGenerator";

// Iterate through the include paths and extensions to find the file variant
const findVariant = (name: string, extensions: string[], includePaths: string[]) => {
  for (let i = 0; i < includePaths.length; i++) {
    const includePath = includePaths[i];

    // try to find the file iterating through the extensions, in order.
    const foundExtention = extensions.find((extension) => {
      const fname        = includePath + "/" + name + extension;
      const partialfname = includePath + "/_" + name + extension;
      return fs.existsSync(fname) || fs.existsSync(partialfname);
    });

    if (foundExtention) {
      return includePath + "/" + name + foundExtention;
    }
  }

  return false;
};

const INCLUDE_PATHS = [process.cwd(), path.resolve(process.cwd(), "node_modules")];

const resolveSassOptions = (options: ReactNativeStylesGeneratorOptions): LegacyOptions<any> => {
  const {filename, src, platform} = options;

  const exts = ["sass", "scss"].flatMap(ext => [
    // add the platform specific extension, first in the array to take precedence
    platform === "android" ? ".android" + ext : ".ios" + ext,
    ".native" + ext,
  ]);

  const data = filename ? fs.readFileSync(filename).toString() : src;

  return {
    includePaths  : filename ? [path.dirname(filename), ...INCLUDE_PATHS] : INCLUDE_PATHS,
    indentedSyntax: filename?.endsWith(".sass"),
    importer      : function(this: any, url: string /*, prev, done */) {
      // url is the path in import as is, which LibSass encountered.
      // prev is the previously resolved path.
      // done is an optional callback, either consume it or return value synchronously.
      // this.options contains this options hash, this.callback contains the node-style callback

      const urlPath         = path.parse(url);
      const importerOptions = this.options;
      const incPaths        = importerOptions.includePaths.slice(0).split(":");

      if (urlPath.dir.length > 0) {
        incPaths.unshift(path.resolve(filename ? path.dirname(filename) : process.cwd(), urlPath.dir)); // add the file's dir to the search array
      }
      const f = findVariant(urlPath.name, exts, incPaths);

      if (f) {
        return {file: f};
      }
    },
    file          : filename,
    data          : data,

  };
};

export interface ParseCssResult {
  css: string,
  stylesheet: css.StyleRules
}

export const parseCss = (options: ReactNativeStylesGeneratorOptions): ParseCssResult => {
  const string     = sass.renderSync(resolveSassOptions(options)).css.toString();
  const stylesheet = css.parse(string).stylesheet;
  if (!stylesheet) {
    throw new Error("[react-native-css-modules] Couldn't parse CSS");
  }
  return {css: string, stylesheet};
};
