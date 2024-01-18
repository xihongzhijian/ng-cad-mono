import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {HttpModule} from "@modules/http/http.module";
import {SelectGongyiDialogComponent} from "./select-gongyi-dialog.component";
import {SelectGongyiInput} from "./select-gongyi-dialog.types";

const data: SelectGongyiInput = {xinghaos: [{vid: 1, mingzi: "test"}], xinghaoOptions: {}};

describe("SelectGongyiDialogComponent", () => {
  let component: SelectGongyiDialogComponent;
  let fixture: ComponentFixture<SelectGongyiDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpModule, SelectGongyiDialogComponent],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SelectGongyiDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
