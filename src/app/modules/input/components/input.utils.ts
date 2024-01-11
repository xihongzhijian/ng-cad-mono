import {MessageService} from "@modules/message/services/message.service";
import {Value} from "./input.types";

export const getValue = <T>(fromValue: Value<T>, message: MessageService) => {
  let result = fromValue;
  if (typeof fromValue === "function") {
    try {
      result = (fromValue as () => T)();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
      return null;
    }
  }
  return result as T;
};
