import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadFentiConfigComponent } from './cad-fenti-config.component';

describe('CadFentiConfigComponent', () => {
  let component: CadFentiConfigComponent;
  let fixture: ComponentFixture<CadFentiConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadFentiConfigComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CadFentiConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
