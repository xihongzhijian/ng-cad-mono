import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {MokuaiCadsComponent} from "./mokuai-cads.component";

describe("MokuaiCadsComponent", () => {
  let component: MokuaiCadsComponent;
  let fixture: ComponentFixture<MokuaiCadsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MokuaiCadsComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MokuaiCadsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
