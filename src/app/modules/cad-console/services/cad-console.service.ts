import {Injectable} from "@angular/core";
import {ObjectOf} from "@lucilor/utils";
import {Subject} from "rxjs";
import {ValuedCommand} from "../cad-command-types";

@Injectable({
  providedIn: "root"
})
export class CadConsoleService {
  command$ = new Subject<ValuedCommand>();

  execute(name: string, argsObj: ObjectOf<string> = {}) {
    const args: ValuedCommand["args"] = [];
    for (const key in argsObj) {
      args.push({name: key, value: argsObj[key]});
    }
    this.command$.next({name, args});
  }
}
