import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { SynthesisComponent } from './synthesis.component';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('SynthesisComponent', () => {
  let component: SynthesisComponent;
  let fixture: ComponentFixture<SynthesisComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [ SynthesisComponent, SafeHtmlPipe ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SynthesisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
