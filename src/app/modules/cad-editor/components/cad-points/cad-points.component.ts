import {Component, computed, inject} from "@angular/core";
import {AppConfigService, defaultConfig} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import {Properties} from "csstype";

@Component({
  selector: "app-cad-points",
  templateUrl: "./cad-points.component.html",
  styleUrls: ["./cad-points.component.scss"],
  imports: []
})
export class CadPointsComponent {
  private config = inject(AppConfigService);
  private status = inject(AppStatusService);

  pointInfos = computed(() => {
    const points = this.status.cadPoints();
    let size = this.config.getConfig("pointSize");
    if (!(size > 0)) {
      size = defaultConfig.pointSize;
    }
    return points.map((point) => {
      const classList: string[] = [];
      if (point.active) {
        classList.push("active");
      }
      const style: Properties = {
        width: `${size}px`,
        height: `${size}px`,
        left: `${point.x}px`,
        top: `${point.y}px`
      };
      return {classList, style};
    });
  });

  onPointClick(index: number) {
    const point = this.status.cadPoints()[index];
    this.status.setCadPoint(index, {active: !point.active});
  }
}
