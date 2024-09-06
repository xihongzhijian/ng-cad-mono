import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VarNamesComponent } from './var-names.component';

describe('VarNamesComponent', () => {
  let component: VarNamesComponent;
  let fixture: ComponentFixture<VarNamesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VarNamesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VarNamesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
