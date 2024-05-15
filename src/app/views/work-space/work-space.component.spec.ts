import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {WorkSpaceComponent} from "./work-space.component";

describe("WorkSpaceComponent", () => {
  let component: WorkSpaceComponent;
  let fixture: ComponentFixture<WorkSpaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkSpaceComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkSpaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
