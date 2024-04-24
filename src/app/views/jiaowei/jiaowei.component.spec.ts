import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {JiaoweiComponent} from "./jiaowei.component";

describe("JiaoweiComponent", () => {
  let component: JiaoweiComponent;
  let fixture: ComponentFixture<JiaoweiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JiaoweiComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(JiaoweiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
