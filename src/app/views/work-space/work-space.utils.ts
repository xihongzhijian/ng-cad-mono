import {InputInfo} from "@modules/input/components/input.types";
import {cloneDeep} from "lodash";
import {WorkSpaceData, WorkSpaceFavoriteItem, WorkSpaceFavoriteType} from "./work-space.types";

export class WorkSpaceManager {
  user = -1;
  types: WorkSpaceFavoriteType[] = [];
  typesSortedIndexs: number[] = [];
  favorites: WorkSpaceFavoriteItem[] = [];
  favoritesSortedIndexs: number[] = [];
  favoriteInputInfos: InputInfo[][] = [];

  constructor(data?: WorkSpaceData) {
    this.import(data);
  }

  import(data?: WorkSpaceData | null) {
    if (!data) {
      data = {};
    }
    this.user = data?.user ?? -1;
    this.favorites = Array.isArray(data.favorites) ? data.favorites : [];
    this.types = Array.isArray(data.types) ? data.types : [];
    this.update();
  }

  export() {
    const data: WorkSpaceData = cloneDeep({
      user: this.user,
      favorites: this.favorites,
      types: this.types
    });
    return data;
  }

  clear() {
    this.import({user: this.user});
  }

  update() {
    for (const item of this.favorites) {
      if (!item.type) {
        item.type = "未分类";
      }
      if (!this.types.some((v) => v.name === item.type)) {
        this.types.push({name: item.type});
      }
    }
    this.types = this.types.filter((v) => this.favorites.some((item) => item.type === v.name));
    this.sort();

    const typeOptions = this.types.map((v) => v.name);
    this.favoriteInputInfos = this.favorites.map((favorite) => {
      const infos: InputInfo[] = [
        {
          type: "string",
          label: "分类",
          options: typeOptions,
          fixedOptions: typeOptions,
          value: favorite.type,
          onChange: (val) => {
            favorite.type = val;
            this.update();
          }
        }
      ];
      return infos;
    });
  }

  sortTypes() {
    const getOrder = (type: WorkSpaceFavoriteType) => {
      if (type.name === "未分类") {
        return -Infinity;
      } else {
        return type.order || 0;
      }
    };
    const info = this.types.map((value, index) => ({value, index}));
    info.sort((a, b) => getOrder(a.value) - getOrder(b.value));
    this.typesSortedIndexs = info.map((v) => v.index);
  }

  sortFavorites() {
    const getOrder = (item: WorkSpaceFavoriteItem) => {
      return item.order || 0;
    };
    const info = this.favorites.map((value, index) => ({value, index}));
    info.sort((a, b) => getOrder(a.value) - getOrder(b.value));
    this.favoritesSortedIndexs = info.map((v) => v.index);
  }

  sort() {
    this.sortTypes();
    this.sortFavorites();
  }
}
