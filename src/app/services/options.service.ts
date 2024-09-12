import {inject, Injectable} from "@angular/core";
import {ObjectOf} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {GetOptionsParams, OptionsData} from "@modules/http/services/cad-data.service.types";
import {HttpOptions} from "@modules/http/services/http.service.types";
import {convertOptions} from "@modules/input/components/input.utils";

@Injectable({
  providedIn: "root"
})
export class OptionsService {
  private http = inject(CadDataService);

  private _optionsCache: ObjectOf<OptionsData> = {};
  async fetchOptions(params: GetOptionsParams, noCache = false, httpOptions?: HttpOptions) {
    const key = JSON.stringify(params);
    if (!noCache && this._optionsCache[key]) {
      return this._optionsCache[key];
    }
    const result = await this.http.getOptions(params, httpOptions);
    if (result) {
      this._optionsCache[key] = result;
    }
    return result;
  }

  async fetchInputInfoOptions(params: GetOptionsParams, noCache = false, httpOptions?: HttpOptions) {
    const options = await this.fetchOptions(params, noCache, httpOptions);
    return convertOptions(options?.data || []);
  }
}
