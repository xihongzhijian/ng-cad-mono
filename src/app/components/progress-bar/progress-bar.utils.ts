import {computed, signal} from "@angular/core";

export type ProgressBarStatus = "hidden" | "progress" | "success" | "error" | "warning";
export class ProgressBar {
  constructor(totalSteps: number) {
    this.totalSteps.set(totalSteps);
  }

  currentSteps = signal(0);
  totalSteps = signal(0);
  status = signal<ProgressBarStatus>("hidden");
  msg = signal("");
  progress = computed(() => {
    const totalSteps = this.totalSteps();
    if (!(totalSteps > 0)) {
      return 0;
    }
    const currentSteps = this.currentSteps();
    return (currentSteps / totalSteps) * 100;
  });

  forward(step = 1) {
    this.currentSteps.update((v) => v + step);
  }

  backward(step = 1) {
    this.currentSteps.update((v) => v - step);
  }

  start(totalSteps?: number, msg = "") {
    this.currentSteps.set(0);
    this.status.set("progress");
    this.msg.set(msg);
    if (typeof totalSteps === "number") {
      this.totalSteps.set(totalSteps);
    }
  }

  end(status: ProgressBarStatus = "success", msg = "") {
    this.status.set(status);
    this.msg.set(msg);
    this.currentSteps.set(this.totalSteps());
  }
}
