import {createWriteStream} from "fs";
import {globSync} from "glob";
import minimist from "minimist";
import {basename} from "path";

const args = minimist(process.argv.slice(2));
let prefix = "";
if (typeof args.prefix === "string") {
  prefix = args.prefix;
} else if (typeof args.p === "string") {
  prefix = args.p;
}
const stream = createWriteStream("../.tmp/components.txt", {flags: "w"});
for (const file of globSync("../src/**/*.component.ts")) {
  stream.write(`${prefix}${basename(file, ".component.ts")}\n`);
}
stream.end();
stream.on("finish", () => {
  console.log("done");
});
