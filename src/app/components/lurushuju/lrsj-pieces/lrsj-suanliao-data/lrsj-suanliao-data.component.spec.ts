import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LrsjSuanliaoDataComponent } from './lrsj-suanliao-data.component';

describe('LrsjSuanliaoDataComponent', () => {
  let component: LrsjSuanliaoDataComponent;
  let fixture: ComponentFixture<LrsjSuanliaoDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LrsjSuanliaoDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LrsjSuanliaoDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
