import {PageComponentTypeAny} from "./page-component-infos";
import {PageComponentGroup} from "./page-components/page-component-group";

export const flatPageComponents = function* (components: PageComponentTypeAny[], expand: boolean): Generator<PageComponentTypeAny> {
  for (const component of components) {
    yield component;
    if (component instanceof PageComponentGroup && (expand || component.expanded)) {
      yield* flatPageComponents(component.children, expand);
    }
  }
};
export const getPageComponentNames = (components: PageComponentTypeAny[]) => {
  const names: string[] = [];
  for (const component of flatPageComponents(components, true)) {
    names.push(component.name);
  }
  return names;
};

export const getPageComponentGroup = (components: PageComponentTypeAny[], component: PageComponentTypeAny): PageComponentGroup | null => {
  for (const parent of components) {
    if (parent.id === component.id) {
      return null;
    }
    if (parent instanceof PageComponentGroup) {
      if (parent.children.find((v) => v === component)) {
        return parent;
      }
      const result = getPageComponentGroup(parent.children, component);
      if (result) {
        return result;
      }
    }
  }
  return null;
};
export const removePageComponent = (components: PageComponentTypeAny[], component: PageComponentTypeAny) => {
  const arr = getPageComponentGroup(components, component)?.children || components;
  const index = arr.findIndex((v) => v.id === component.id);
  return arr.splice(index, 1);
};
export const isPageComponentGroupEmpty = (component: PageComponentGroup): boolean => {
  return (
    component.children.filter((child) => {
      if (child instanceof PageComponentGroup) {
        return !isPageComponentGroupEmpty(child);
      } else {
        return true;
      }
    }).length === 0
  );
};
