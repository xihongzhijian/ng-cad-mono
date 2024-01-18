import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectGongyiDialogComponent } from './select-gongyi-dialog.component';

describe('SelectGongyiDialogComponent', () => {
  let component: SelectGongyiDialogComponent;
  let fixture: ComponentFixture<SelectGongyiDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectGongyiDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SelectGongyiDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
