import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MAT_TOOLTIP_DEFAULT_OPTIONS} from "@angular/material/tooltip";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {CadListComponent, customTooltipOptions} from "./cad-list.component";
import {CadListInput} from "./cad-list.types";

const data: CadListInput = {selectMode: "multiple", collection: "cad"};
describe("CadListComponent", () => {
  let component: CadListComponent;
  let fixture: ComponentFixture<CadListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadListComponent],
      providers: [
        {provide: MAT_DIALOG_DATA, useValue: data},
        {provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: customTooltipOptions},
        {provide: MatDialogRef, useValue: {}},
        provideAnimations(),
        provideRouter([])
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
