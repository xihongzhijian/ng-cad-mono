import {SecurityContext} from "@angular/core";
import {ValidationErrors} from "@angular/forms";
import {DomSanitizer} from "@angular/platform-browser";
import {ObjectOf, timeout} from "@lucilor/utils";
import {InputComponent} from "@modules/input/components/input.component";

export const getListEl = (domSanitizer: DomSanitizer, content: string[], title = "") => {
  const ulEl = document.createElement("ul");
  content.forEach((v) => {
    const liEl = document.createElement("li");
    liEl.innerHTML = domSanitizer.sanitize(SecurityContext.HTML, v) || "";
    ulEl.appendChild(liEl);
  });
  const titleEl = document.createElement("div");
  titleEl.classList.add("title");
  titleEl.innerHTML = domSanitizer.sanitize(SecurityContext.HTML, title) || "";
  const divEl = document.createElement("div");
  divEl.classList.add("message-list");
  divEl.appendChild(titleEl);
  divEl.appendChild(ulEl);
  return divEl;
};

export const getListStr = (domSanitizer: DomSanitizer, content: string[], title = "") => {
  const el = getListEl(domSanitizer, content, title);
  return el.outerHTML;
};

export const validateForm = async (inputs: InputComponent[]) => {
  let errors: ValidationErrors | null = null;
  const values: ObjectOf<string> = {};
  for (const input of inputs) {
    if (input.onChangeDelay) {
      await timeout(input.onChangeDelayTime);
    }
    const errors2 = input.validateValue();
    if (errors2) {
      if (!errors) {
        errors = {};
      }
      Object.assign(errors, errors2);
    }
    const key = input.info.name || input.info.label;
    values[key] = input.value;
  }
  return {errors, values};
};
