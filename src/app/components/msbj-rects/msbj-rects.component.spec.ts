import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MsbjRectsComponent} from "./msbj-rects.component";

describe("MsbjRectsComponent", () => {
  let component: MsbjRectsComponent;
  let fixture: ComponentFixture<MsbjRectsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MsbjRectsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MsbjRectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
