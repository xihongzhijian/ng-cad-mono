import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {SuanliaoComponent} from "./suanliao.component";

describe("SuanliaoComponent", () => {
  let component: SuanliaoComponent;
  let fixture: ComponentFixture<SuanliaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuanliaoComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(SuanliaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
