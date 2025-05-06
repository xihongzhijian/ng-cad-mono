import {ComponentFixture, TestBed} from "@angular/core/testing";
import {PageComponentsSelectComponent} from "./page-components-select.component";

describe("PageComponentsMenuComponent", () => {
  let component: PageComponentsSelectComponent;
  let fixture: ComponentFixture<PageComponentsSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageComponentsSelectComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PageComponentsSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
