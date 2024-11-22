import {ChangeDetectionStrategy, Component, computed, input, signal} from "@angular/core";
import {ListRandom} from "@lucilor/utils";
import {ProgressBar} from "./progress-bar.utils";

@Component({
  selector: "app-progress-bar",
  templateUrl: "./progress-bar.component.html",
  styleUrls: ["./progress-bar.component.scss"],
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressBarComponent {
  progressBar = input.required<ProgressBar>();

  progress = computed(() => this.progressBar().progress());
  status = computed(() => this.progressBar().status());
  msg = computed(() => this.progressBar().msg());

  clickTextsRandom = new ListRandom([
    "(〃'▽'〃)",
    "(*^▽^*)",
    "(｡･ω･｡)",
    "✿(。◕ᴗ◕。)✿",
    "(^_−)☆",
    " (｡♥ᴗ♥｡) ",
    "๑乛◡乛๑",
    "ヽ(･ω･´ﾒ)",
    "(｡•ˇ‸ˇ•｡)",
    "o(ﾟДﾟ)っ！",
    "(❁´ω`❁)",
    "｡◕ᴗ◕｡",
    "(•ᴗ•)",
    "(づ●─●)づ",
    "ლ(❛◡❛✿)ლ",
    "ヽ(^ω^)ﾉ ",
    "(*❦ω❦)",
    "(๑•ω•๑)",
    "(o°ω°o)",
    "❥(ゝω・✿ฺ)",
    "✧(＾＿－✿ ",
    "★(－ｏ⌒) ",
    "(・ω<)",
    "๑Ő௰Ő๑)",
    "Σσ(・Д・；)",
    "o((⊙﹏⊙))o",
    "(￣ェ￣;)"
  ]);
  clickText = signal<string>("");
  onPointerDown() {
    this.clickText.set(this.clickTextsRandom.next());
  }
  onPointerUp() {
    this.clickText.set("");
  }
}
