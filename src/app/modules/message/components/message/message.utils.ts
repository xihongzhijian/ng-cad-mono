import {SecurityContext} from "@angular/core";
import {DomSanitizer} from "@angular/platform-browser";

export const getListEl = (domSanitizer: DomSanitizer, content: string[], title = "") => {
  const ulEl = document.createElement("ul");
  content.forEach((v) => {
    const liEl = document.createElement("li");
    liEl.innerHTML = domSanitizer.sanitize(SecurityContext.HTML, v) || "";
    ulEl.appendChild(liEl);
  });
  const titleEl = document.createElement("div");
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
