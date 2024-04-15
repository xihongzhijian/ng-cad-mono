import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {HttpModule} from "@modules/http/http.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {DakongSummaryComponent} from "./dakong-summary.component";
import {DakongSummaryInput} from "./dakong-summary.types";

const data: DakongSummaryInput = {
  data: {
    aaa: [
      {
        cadId: "123",
        cadName: "abc",
        peizhiName: "def",
        summary: [
          {peizhiId: "1", kongId: "2", kongName: "edf1", face: "zzz1", count: 0, error: "123"},
          {peizhiId: "3", kongId: "4", kongName: "edf2", face: "zzz2", count: 2, error: ""}
        ]
      }
    ]
  }
};

describe("DakongSummaryComponent", () => {
  let component: DakongSummaryComponent;
  let fixture: ComponentFixture<DakongSummaryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, HttpModule, MatButtonModule, MatSlideToggleModule, NgScrollbarModule, DakongSummaryComponent],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    });
    fixture = TestBed.createComponent(DakongSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
