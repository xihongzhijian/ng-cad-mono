import axios from "axios";
import {deleteAsync} from "del";
import FormData from "form-data";
import fs from "fs";
import gulp from "gulp";
import zip from "gulp-zip";
import path from "path";

const postFormData = (url, data, file) => {
  const formData = new FormData();
  formData.append("data", JSON.stringify(data));
  if (file) {
    formData.append("file", file);
  }
  return axios.post(url, formData, {headers: formData.getHeaders(), maxBodyLength: Infinity});
};

const token = process.env.SERVER_TOKEN;
const host = "https://www.let888.cn";
const targetDir = "./dist/ng-cad2/browser";

const tmpDir = "./.tmp";
const zipName = "upload.zip";
const project = "ng-cad2";

gulp.task("zipBefore", () => {
  return gulp.src("./**/*", {dot: true, cwd: targetDir}).pipe(gulp.dest(path.join(tmpDir, project)));
});

gulp.task("zipAfter", () => {
  return deleteAsync(path.join(tmpDir, project));
});

gulp.task("zipFiles", () => {
  return gulp.src(`${project}/**/*`, {dot: true, cwd: tmpDir, cwdbase: true}).pipe(zip(zipName)).pipe(gulp.dest(tmpDir));
});

gulp.task("zip", gulp.series("zipBefore", "zipFiles", "zipAfter"));

gulp.task("upload", async () => {
  const url = host + "/n/kgs/index/login/upload";
  const data = {dest: "static", token, toDelete: [project], backup: project};
  const response = await postFormData(url, data, fs.createReadStream(path.join(tmpDir, zipName)));
  console.log(response.data);
  if (response.data.code !== 0) {
    throw new Error(response.data.msg);
  }
});

gulp.task("restore", async () => {
  const response = await postFormData(host + "/n/kgs/index/login/restore", {name: project});
  console.log(response.data);
});

gulp.task("default", gulp.series("zip", "upload"));
