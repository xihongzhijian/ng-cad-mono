import {ChangeDetectionStrategy, Component, inject, OnInit, signal} from "@angular/core";
import {Subscribed} from "@mixins/subscribed.mixin";
import {AppConfigService} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import {CadPoints} from "@services/app-status.types";
import {Properties} from "csstype";

@Component({
  selector: "app-cad-points",
  templateUrl: "./cad-points.component.html",
  styleUrls: ["./cad-points.component.scss"],
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CadPointsComponent extends Subscribed() implements OnInit {
  private config = inject(AppConfigService);
  private status = inject(AppStatusService);

  points = signal<CadPoints>([]);

  constructor() {
    super();
  }

  ngOnInit() {
    this.subscribe(this.status.cadPoints$, (points) => {
      this.points.set(points);
    });
  }

  onPointClick(index: number) {
    const points = this.points();
    points[index].active = !points[index].active;
    this.status.cadPoints$.next(points);
  }

  getStyle(p: CadPoints[0]) {
    const size = this.config.getConfig("pointSize");
    return {
      width: `${size}px`,
      height: `${size}px`,
      left: `${p.x}px`,
      top: `${p.y}px`
    } as Properties;
  }
}
