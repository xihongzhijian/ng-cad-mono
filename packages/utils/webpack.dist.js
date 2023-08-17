const path = require("path");
const {merge} = require("webpack-merge");
const common = require("./webpack.common.js");
const {CleanWebpackPlugin} = require("clean-webpack-plugin");

module.exports = merge(common, {
  entry: {
    utils: "./src/index.ts"
  },
  devtool: "source-map",
  output: {
    path: path.resolve(__dirname, "dist"),
    globalObject: "this",
    library: {
      name: ["lucilor", "utils"],
      type: "window"
    }
  },
  plugins: [new CleanWebpackPlugin()]
});
