import {createWriteStream, readFileSync} from "fs";
import {globSync} from "glob";
import minimist from "minimist";
import {basename} from "path";

const args = minimist(process.argv.slice(2));
const prefix = args.prefix || args.p || "";
const search = args.search || args.s || "";
const stream = createWriteStream("../.tmp/components.txt", {flags: "w"});
let countAll = 0;
let countSuccess = 0;
let countFail = 0;
stream.write("<details>\n");
stream.write("<summary>Components</summary>\n\n");
for (const file of globSync("../src/**/*.component.ts")) {
  let prefixCurr = prefix;
  countAll++;
  if (search) {
    const fileStr = readFileSync(file, "utf8");
    if (fileStr.includes(search)) {
      prefixCurr = "- [x] ";
      countSuccess++;
    } else {
      prefixCurr = "- [ ] ";
      countFail++;
    }
  }
  stream.write(`${prefixCurr}${basename(file, ".component.ts")}\n`);
}
stream.write("</details>\n");
let str = `${countAll} components.`;
if (search) {
  str += ` ${countSuccess} done, ${countFail} to go.`;
}
stream.write(str + "\n");
stream.end();
stream.on("finish", () => {
  console.log("done");
});
