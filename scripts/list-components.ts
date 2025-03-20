import {createWriteStream, readFileSync} from "fs";
import {globSync} from "glob";
import minimist from "minimist";
import {basename} from "path";

const args = minimist(process.argv.slice(2));
const prefix = args.prefix || args.p || "";
const search = args.search || args.s || "";
const stream = createWriteStream("../.tmp/components.txt", {flags: "w"});
for (const file of globSync("../src/**/*.component.ts")) {
  let prefixCurr = prefix;
  if (search) {
    const fileStr = readFileSync(file, "utf8");
    if (fileStr.includes(search)) {
      prefixCurr = "- [x] ";
    } else {
      prefixCurr = "- [ ] ";
    }
  }
  stream.write(`${prefixCurr}${basename(file, ".component.ts")}\n`);
}
stream.end();
stream.on("finish", () => {
  console.log("done");
});
