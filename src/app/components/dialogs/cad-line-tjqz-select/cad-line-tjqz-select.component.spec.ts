import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {CadLineTjqzSelectComponent} from "./cad-line-tjqz-select.component";

describe("CadLineTjqzSelectComponent", () => {
  let component: CadLineTjqzSelectComponent;
  let fixture: ComponentFixture<CadLineTjqzSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadLineTjqzSelectComponent],
      providers: [
        {provide: MAT_DIALOG_DATA, useValue: {}},
        {provide: MatDialogRef, useValue: {}}
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadLineTjqzSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
