import {ComponentFixture, TestBed} from "@angular/core/testing";
import {CadQiegemubanGroupComponent} from "./cad-qiegemuban-group.component";

describe("CadQiegemubanGroupComponent", () => {
  let component: CadQiegemubanGroupComponent;
  let fixture: ComponentFixture<CadQiegemubanGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadQiegemubanGroupComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CadQiegemubanGroupComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
