import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimationsAsync} from "@angular/platform-browser/animations/async";
import {provideRouter} from "@angular/router";
import {SelectCadsComponent} from "./select-cads.component";

describe("SelectCadsComponent", () => {
  let component: SelectCadsComponent;
  let fixture: ComponentFixture<SelectCadsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectCadsComponent],
      providers: [provideAnimationsAsync(), provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectCadsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
