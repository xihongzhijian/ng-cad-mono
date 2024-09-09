import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {VarNamesComponent} from "./var-names.component";
import {VarNames} from "./var-names.types";

describe("VarNamesComponent", () => {
  let component: VarNamesComponent;
  let fixture: ComponentFixture<VarNamesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VarNamesComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(VarNamesComponent);
    component = fixture.componentInstance;
    const ref = fixture.componentRef;
    const varNames: VarNames = [{nameGroups: [{groupName: "test", varNames: ["a"]}], width: 100}];
    ref.setInput("varNames", varNames);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
