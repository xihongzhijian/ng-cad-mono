import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {HttpModule} from "@modules/http/http.module";
import {SuanliaoDataDialogComponent} from "./suanliao-data-dialog.component";
import {SuanliaoDataInput} from "./suanliao-data-dialog.type";

const data: SuanliaoDataInput = {data: {算料公式: [], 测试用例: [], 算料CAD: []}, varNames: {names: ["1"], width: 0}};

describe("SuanliaoDataDialogComponent", () => {
  let component: SuanliaoDataDialogComponent;
  let fixture: ComponentFixture<SuanliaoDataDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpModule, SuanliaoDataDialogComponent],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SuanliaoDataDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
