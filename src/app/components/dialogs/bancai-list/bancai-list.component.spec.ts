import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {BancaiList} from "@modules/http/services/cad-data.service.types";
import {BancaiListComponent, BancaiListInput} from "./bancai-list.component";

const bancais: BancaiList[] = [
  {mingzi: "test", cailiaoList: ["1"], houduList: ["2"], guigeList: [[100, 100]]},
  {mingzi: "test2", cailiaoList: ["1"], houduList: ["2"], guigeList: [[100, 100]]}
];
const data: BancaiListInput = {
  list: bancais,
  listRefresh: () => bancais,
  checkedItems: bancais
};

describe("BancaiListComponent", () => {
  let component: BancaiListComponent;
  let fixture: ComponentFixture<BancaiListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BancaiListComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(BancaiListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
