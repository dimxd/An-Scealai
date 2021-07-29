import { Component, OnInit, Input } from '@angular/core';
import { TextProcessingService } from 'src/app/services/text-processing.service';
import { Dialect, SynthesisService } from 'src/app/services/synthesis.service';
import { SynthesisBankService } from 'src/app/student-components/synthesis-bank.service';

type SentenceAndAudioUrl = {
  sentence: string;
  waiting: boolean;
  audioUrl: string;
};

@Component({
  selector: 'app-synthesis-player',
  template:
    `
    <div *ngFor="let s of sentencesAndAudioUrls; let i = index;">
      <p class="text-start">
        {{s.sentence}}

      <ng-container
        *ngIf="s.waiting; then waiting; else ready">
      </ng-container>

      <ng-template #waiting>
        <div class="d-flex justify-content-center">
          <div class="spinner-border" role="status">
            <span class="sr-only">Loading...</span>
          </div>
        </div>
      </ng-template>

      <ng-template #ready>
        <br>
        <audio controls>
          <source src="{{s.audioUrl}}">
        </audio>
      </ng-template>
    </div>
    `,
  // templateUrl: './synthesis-player.component.html',
  styleUrls: ['./synthesis-player.component.css']
})
export class SynthesisPlayerComponent implements OnInit {
  creationDate: Date;

  sentencesAndAudioUrls: SentenceAndAudioUrl[] = [];

  @Input() sentences: string[];
  @Input() dialect: Dialect;

  constructor(
    private synth: SynthesisService,
    private synthBank: SynthesisBankService,
    ) { }

  ngOnInit(): void {
    this.synthBank.getAudioUrlOfSentence('hello');
    for (const sentence of this.sentences) {
      const newAudio = {
        sentence,
        waiting: true,
        audioUrl: null,
      };
      this.sentencesAndAudioUrls.push(newAudio);
      this.synth.synthesiseText(sentence, this.dialect as Dialect).then(
        (url) => {
          newAudio.audioUrl = url;
          newAudio.waiting = false;
        });
    }
  }

}
