import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { RecordingComponent } from './recording.component';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('RecordingComponent', () => {
  let component: RecordingComponent;
  let fixture: ComponentFixture<RecordingComponent>;

  beforeEach(async(() => {
    const imports = [
      MatDialogModule,
      RouterTestingModule,
      HttpClientTestingModule,
    ];
    const declarations = [
      RecordingComponent,
      SafeHtmlPipe,
    ];
    TestBed
      .configureTestingModule({imports,declarations})
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RecordingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
