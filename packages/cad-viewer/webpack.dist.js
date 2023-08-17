const path = require("path");
const {merge} = require("webpack-merge");
const common = require("./webpack.common.js");
const {CleanWebpackPlugin} = require("clean-webpack-plugin");

module.exports = merge(common, {
  entry: {
    "cad-viewer": "./src/index.ts"
  },
  devtool: "source-map",
  externals: {
    "@lucilor/utils": ["lucilor", "utils"]
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    globalObject: "this",
    library: {
      name: ["lucilor", "cadViewer"],
      type: "window"
    }
  },
  plugins: [new CleanWebpackPlugin()]
});
