import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { TextProcessingService } from 'app/services/text-processing.service';
import { SynthesisService, Dialect } from 'app/services/synthesis.service';
import { SynthItem } from 'app/synth-item';
import { TranslationService } from "app/translation.service";

@Component({
  selector: 'app-synthesis-player',
  templateUrl: './synthesis-player.component.html',
  styleUrls: [
    './synthesis-player.component.scss',
    '../../app.component.scss',
   ]
})
export class SynthesisPlayerComponent implements OnInit {
  hideEntireSynthesisPlayer = true;
  synthItems: SynthItem[] = [];
  
  @Input() storyId: string;
  @Input() text: string;
  @Input() dialect: Dialect;

  toggleHidden() {
    this.hideEntireSynthesisPlayer = !this.hideEntireSynthesisPlayer;
    this.refresh();
  }

  constructor(
    private router: Router,
    private textProcessor: TextProcessingService,
    private cdref: ChangeDetectorRef,
    private synth: SynthesisService,
    public ts: TranslationService
    ) { }

  ngOnInit(): void {
    this.refresh();
  }

  getSynthItem(line: string) {
    return new SynthItem(line,this.dialect,this.synth);
  }

  refresh() {
    this.synthItems.map(s=>{
      s.audioUrl = undefined;
      s.dispose();
    })
    // just for juice (Neimhin Fri 28 Jan 2022 23:19:46)
    if(!this.text) return;
    setTimeout(()=>{
      this.synthItems =
        this.textProcessor
            .sentences(this.text)
        .map(l=>new SynthItem(l, this.dialect, this.synth));
      this.cdref.detectChanges();
    },50);
  }

  goToFastSynthesiser() {
    this.router.navigateByUrl('/synthesis/' + this.storyId);
  }
}
