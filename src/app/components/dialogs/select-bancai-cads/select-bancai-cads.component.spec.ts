import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {SelectBancaiCadsComponent, SelectBancaiCadsInput} from "./select-bancai-cads.component";

const data: SelectBancaiCadsInput = {
  orders: [
    {
      code: "testCode",
      cads: [
        [
          {
            id: "cad1",
            name: "cad1",
            width: 1000,
            height: 1000,
            num: 1,
            bancai: {mingzi: "baicai1", cailiao: "cailiao1", houdu: "1.2", guige: [2000, 2000]},
            checked: false,
            oversized: false,
            disabled: false
          },
          {
            id: "cad2",
            name: "cad2",
            width: 10000,
            height: 10000,
            num: 2,
            bancai: {mingzi: "baicai2", cailiao: "cailiao2", houdu: "0.8", guige: [2000, 2000]},
            checked: true,
            oversized: true,
            disabled: true
          }
        ]
      ]
    }
  ]
};
describe("SelectBancaiCadsComponent", () => {
  let component: SelectBancaiCadsComponent;
  let fixture: ComponentFixture<SelectBancaiCadsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectBancaiCadsComponent],
      providers: [
        {provide: MAT_DIALOG_DATA, useValue: data},
        {provide: MatDialogRef, useValue: {}}
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectBancaiCadsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
