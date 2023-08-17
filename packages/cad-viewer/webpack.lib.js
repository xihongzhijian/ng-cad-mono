const path = require("path");
const {merge} = require("webpack-merge");
const common = require("./webpack.common.js");
const nodeExternals = require("webpack-node-externals");
const {CleanWebpackPlugin} = require("clean-webpack-plugin");

module.exports = merge(common, {
  entry: {
    index: "./src/index.ts"
  },
  externals: [
    nodeExternals({
      modulesDir: path.resolve(__dirname, "../../node_modules")
    })
  ],
  output: {
    path: path.resolve(__dirname, "lib"),
    globalObject: "this",
    library: {
      type: "umd"
    }
  },
  plugins: [new CleanWebpackPlugin()]
});
