import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {MokuaikuComponent} from "./mokuaiku.component";

describe("MokuaikuComponent", () => {
  let component: MokuaikuComponent;
  let fixture: ComponentFixture<MokuaikuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MokuaikuComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MokuaikuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
