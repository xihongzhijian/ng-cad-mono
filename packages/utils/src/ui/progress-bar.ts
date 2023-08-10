export class ProgressBar {
  public currentSteps = 0;
  get progress() {
    if (!(this.totalSteps > 0)) {
      return 0;
    }
    return (this.currentSteps / this.totalSteps) * 100;
  }

  constructor(public totalSteps: number) {}

  forward(step = 1) {
    this.currentSteps += step;
  }

  backward(step = 1) {
    this.currentSteps -= step;
  }

  start(totalSteps?: number) {
    this.currentSteps = 0;
    if (typeof totalSteps === "number") {
      this.totalSteps = totalSteps;
    }
  }

  end() {
    this.currentSteps = this.totalSteps;
  }
}
