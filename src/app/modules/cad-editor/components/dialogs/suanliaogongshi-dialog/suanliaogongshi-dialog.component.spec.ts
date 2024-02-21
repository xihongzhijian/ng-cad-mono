import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuanliaogongshiDialogComponent } from './suanliaogongshi-dialog.component';

describe('SuanliaogongshiDialogComponent', () => {
  let component: SuanliaogongshiDialogComponent;
  let fixture: ComponentFixture<SuanliaogongshiDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuanliaogongshiDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SuanliaogongshiDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
