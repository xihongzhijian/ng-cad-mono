import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {SubCadsComponent} from "./sub-cads.component";

describe("SubCadsComponent", () => {
  let component: SubCadsComponent;
  let fixture: ComponentFixture<SubCadsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubCadsComponent],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SubCadsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should show menu", () => {
    component.contextMenu().openMenu();
    expect(component.contextMenu().menuOpened).toBeTruthy();
  });
});
