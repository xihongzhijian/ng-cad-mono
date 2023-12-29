import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LurushujuIndexComponent } from './lurushuju-index.component';

describe('LurushujuIndexComponent', () => {
  let component: LurushujuIndexComponent;
  let fixture: ComponentFixture<LurushujuIndexComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LurushujuIndexComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LurushujuIndexComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
