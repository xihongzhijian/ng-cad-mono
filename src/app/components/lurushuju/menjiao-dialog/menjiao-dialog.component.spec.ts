import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {HttpModule} from "@modules/http/http.module";
import {MenjiaoDialogComponent} from "./menjiao-dialog.component";
import {MenjiaoInput} from "./menjiao-dialog.types";

const data: MenjiaoInput = {};

describe("MenjiaoDialogComponent", () => {
  let component: MenjiaoDialogComponent;
  let fixture: ComponentFixture<MenjiaoDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpModule, MenjiaoDialogComponent],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MenjiaoDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
