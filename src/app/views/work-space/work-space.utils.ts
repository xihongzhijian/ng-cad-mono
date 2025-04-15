import {computed, signal} from "@angular/core";
import {getSortedItems} from "@app/utils/sort-items";
import {InputInfo} from "@modules/input/components/input.types";
import {cloneDeep} from "lodash";
import {WorkSpaceData, WorkSpaceFavoriteItem, WorkSpaceFavoriteType} from "./work-space.types";

export class WorkSpaceManager {
  constructor(data?: WorkSpaceData) {
    this.import(data);
  }

  user = signal(-1);

  favorites = signal<WorkSpaceFavoriteItem[]>([]);
  favoritesSorted = computed(() => getSortedItems(this.favorites(), (v) => v.order ?? 0));

  typesRaw = signal<WorkSpaceFavoriteType[]>([]);
  types = computed(() => {
    const types = this.typesRaw().slice();
    const favorites = this.favorites();
    for (const favorite of favorites) {
      if (!types.some((v) => v.name === favorite.type)) {
        types.push({name: favorite.type});
      }
    }
    return types;
  });
  typesSorted = computed(() => getSortedItems(this.types(), (v) => v.order ?? 0));

  favoriteInputInfos = computed(() => {
    const favorites = this.favoritesSorted();
    const typeOptions = this.types().map((v) => v.name);
    const infos = favorites.map((favorite) => {
      const group: InputInfo[] = [
        {
          type: "string",
          label: "分类",
          options: typeOptions,
          fixedOptions: typeOptions,
          value: favorite.type,
          onChange: (val) => {
            favorite.type = val;
            this.favorites.update((v) => [...v]);
          }
        }
      ];
      return group;
    });
    return infos;
  });

  import(data?: WorkSpaceData | null) {
    if (!data) {
      data = {};
    }
    this.user.set(data.user ?? -1);
    const favorites = Array.isArray(data.favorites) ? data.favorites : [];
    for (const favorite of favorites) {
      if (!favorite.type) {
        favorite.type = "未分类";
      }
    }
    this.favorites.set(favorites);
  }

  export() {
    const data: WorkSpaceData = cloneDeep({
      user: this.user(),
      favorites: this.favorites(),
      types: this.types()
    });
    return data;
  }

  clear() {
    this.import({user: this.user()});
  }
}
