import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {SuanliaoTablesComponent} from "./suanliao-tables.component";

describe("SuanliaoTablesComponent", () => {
  let component: SuanliaoTablesComponent;
  let fixture: ComponentFixture<SuanliaoTablesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuanliaoTablesComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(SuanliaoTablesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
