import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {XhmrmsbjSbjbComponent} from "./xhmrmsbj-sbjb.component";

describe("XhmrmsbjSbjbComponent", () => {
  let component: XhmrmsbjSbjbComponent;
  let fixture: ComponentFixture<XhmrmsbjSbjbComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [XhmrmsbjSbjbComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(XhmrmsbjSbjbComponent);
    component = fixture.componentInstance;
    const ref = fixture.componentRef;
    ref.setInput("xinghaoName", "test");
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
