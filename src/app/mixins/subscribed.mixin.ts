import {OnDestroy} from "@angular/core";
import {Constructor} from "@lucilor/utils";
import {Observable, Observer, Subject, Subscription} from "rxjs";
import {takeUntil} from "rxjs/operators";

export const Subscribed = <T extends Constructor>(base = class {} as T) =>
  class extends base implements OnDestroy {
    destroyed$ = new Subject<void>();

    ngOnDestroy() {
      this.destroyed$.next();
    }

    subscribe<K>(target: Observable<K>, observer: Partial<Observer<K>>): Subscription;
    subscribe<K>(target: Observable<K>, next: (value: K) => void): Subscription;
    subscribe<K>(target: Observable<K>, observer: Partial<Observer<K>> | ((value: K) => void)) {
      return target.pipe(takeUntil(this.destroyed$)).subscribe(observer);
    }
  };
