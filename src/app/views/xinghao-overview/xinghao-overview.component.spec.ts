import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {XinghaoOverviewComponent} from "./xinghao-overview.component";

describe("XinghaoOverviewComponent", () => {
  let component: XinghaoOverviewComponent;
  let fixture: ComponentFixture<XinghaoOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [XinghaoOverviewComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(XinghaoOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
