import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {MsbjRectsComponent} from "./msbj-rects.component";

describe("MsbjRectsComponent", () => {
  let component: MsbjRectsComponent;
  let fixture: ComponentFixture<MsbjRectsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MsbjRectsComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MsbjRectsComponent);
    component = fixture.componentInstance;
    const ref = fixture.componentRef;
    ref.setInput("rectInfos", []);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
