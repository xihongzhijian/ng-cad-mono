import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {MokuaiItemComponent} from "./mokuai-item.component";

describe("MokuaiItemComponent", () => {
  let component: MokuaiItemComponent;
  let fixture: ComponentFixture<MokuaiItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MokuaiItemComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MokuaiItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
