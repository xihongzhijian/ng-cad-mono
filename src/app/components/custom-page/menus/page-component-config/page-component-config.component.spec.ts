import {ComponentFixture, TestBed} from "@angular/core/testing";
import {PageComponentText} from "../../models/page-components/page-component-text";
import {PageComponentConfigComponent} from "./page-component-config.component";

describe("PageComponentConfigComponent", () => {
  let component: PageComponentConfigComponent;
  let fixture: ComponentFixture<PageComponentConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageComponentConfigComponent],
      providers: []
    }).compileComponents();

    fixture = TestBed.createComponent(PageComponentConfigComponent);
    component = fixture.componentInstance;
    const ref = fixture.componentRef;
    const components = [new PageComponentText("1"), new PageComponentText("2")];
    ref.setInput("components", components);
    ref.setInput("activeComponent", components[0]);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
