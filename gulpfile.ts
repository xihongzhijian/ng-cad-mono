import {ObjectOf} from "@lucilor/utils";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import gulp from "gulp";
import zip from "gulp-zip";
import path from "path";

const postFormData = (url: string, data: ObjectOf<any>, file?: fs.ReadStream) => {
  const formData = new FormData();
  formData.append("data", JSON.stringify(data));
  if (file) {
    formData.append("file", file);
  }
  return axios.post(url, formData, {headers: formData.getHeaders(), maxBodyLength: Infinity});
};

const token = process.env.SERVER_TOKEN;
const host = "https://www.let888.cn";
const targetDir = "./dist";

const tmpDir = "./.tmp";
const zipName = "upload.zip";
const backupName = "ng_cad2";

gulp.task("zip", () => {
  const globs = ["ng-cad2/**/*"];
  return gulp.src(globs, {dot: true, cwd: targetDir, base: targetDir}).pipe(zip(zipName)).pipe(gulp.dest(tmpDir));
});

gulp.task("upload", async () => {
  const url = host + "/n/kgs/index/login/upload";
  const data = {dest: "static", token, toDelete: ["ng-cad2"], backup: backupName};
  const response = await postFormData(url, data, fs.createReadStream(path.join(tmpDir, zipName)));
  console.log(response.data);
  if (response.data.code !== 0) {
    throw new Error(response.data.msg);
  }
});

gulp.task("restore", async () => {
  const response = await postFormData(host + "/n/kgs/index/login/restore", {name: backupName});
  console.log(response.data);
});

gulp.task("default", gulp.series("zip", "upload"));
