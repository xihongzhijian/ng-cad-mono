import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {BomGongyiluxianComponent} from "./bom-gongyiluxian.component";

describe("BomGongyiluxianComponent", () => {
  let component: BomGongyiluxianComponent;
  let fixture: ComponentFixture<BomGongyiluxianComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BomGongyiluxianComponent],
      providers: [provideAnimations(), provideRouter([])]
    });
    fixture = TestBed.createComponent(BomGongyiluxianComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
