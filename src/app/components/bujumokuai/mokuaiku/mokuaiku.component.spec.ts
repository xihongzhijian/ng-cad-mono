import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimationsAsync} from "@angular/platform-browser/animations/async";
import {provideRouter} from "@angular/router";
import {MokuaikuComponent} from "./mokuaiku.component";

describe("MokuaikuComponent", () => {
  let component: MokuaikuComponent;
  let fixture: ComponentFixture<MokuaikuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MokuaikuComponent],
      providers: [provideAnimationsAsync(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MokuaikuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
