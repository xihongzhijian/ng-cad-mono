import {ComponentFixture, TestBed} from "@angular/core/testing";
import {HttpModule} from "@modules/http/http.module";
import {SuanliaoTablesComponent} from "./suanliao-tables.component";

describe("SuanliaoTablesComponent", () => {
  let component: SuanliaoTablesComponent;
  let fixture: ComponentFixture<SuanliaoTablesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpModule, SuanliaoTablesComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SuanliaoTablesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
