import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {NavsDialogComponent} from "./navs-dialog.component";
import {NavsDialogInput} from "./navs-dialog.types";

const data: NavsDialogInput = {
  navs: [{vid: 1, mingzi: "test", dadaohang: [{vid: 2, mingzi: "test2", xiaodaohang: [{vid: 3, mingzi: "test3", table: "1", url: "2"}]}]}]
};

describe("NavsDialogComponent", () => {
  let component: NavsDialogComponent;
  let fixture: ComponentFixture<NavsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavsDialogComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(NavsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
