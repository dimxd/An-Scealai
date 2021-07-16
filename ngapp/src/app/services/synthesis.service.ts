import { Injectable } from '@angular/core';
import { Story } from '../story';
import { HttpClient } from '@angular/common/http';
import { EngagementService } from '../engagement.service';
import { EventType } from '../event';
import { Observable } from 'rxjs';
import config from '../../abairconfig.json';

interface APIv2Response {
  audioContent: string;
}

const abairAPIv2Voices = [
  'ga_UL_anb_nnmnkwii',
  'ga_UL',
  'ga_UL_anb_exthts',
  'ga_CO',
  'ga_CO_hts',
  'ga_CO_pmg_nnmnkwii',
  'ga_MU_nnc_exthts',
  'ga_MU_nnc_nnmnkwii',
  'ga_MU_cmg_nnmnkwii'
];

export type AbairAPIv2Voice =
  'ga_UL_anb_nnmnkwii' |
  'ga_UL' |
  'ga_UL_anb_exthts' |
  'ga_CO' |
  'ga_CO_hts' |
  'ga_CO_pmg_nnmnkwii' |
  'ga_MU_nnc_exthts' |
  'ga_MU_nnc_nnmnkwii' |
  'ga_MU_cmg_nnmnkwii';

export type AbairAPIv2AudioEncoding =
  'LINEAR16' |
  'MP3' |
  // TODO, get the proper name for the OGG type
  'OGG';

export interface SynthRequestObject {
  input: string;
  voice: AbairAPIv2Voice;
  speed: number;
  audioEncoding: AbairAPIv2AudioEncoding;
}

@Injectable({
  providedIn: 'root'
})
export class SynthesisService {

  constructor(
    private http: HttpClient,
    private engagement: EngagementService) { }

  baseUrl = config.baseurl;

  voice(dialect: 'connemara' | 'kerry' | 'donegal') {
    switch (dialect) {
      case 'connemara':
        return 'ga_CO_pmg_nnmnkwii' as AbairAPIv2Voice;
      case 'kerry':
        return 'ga_MU_nnc_nnmnkwii' as AbairAPIv2Voice;
      default: // donegal
        return 'ga_UL_anb_nnmnkwii' as AbairAPIv2Voice;
    }
  }

  // TODO this is troublesome
  convertToPlain(html: string){
    // Create a new div element
    const tempDivElement = document.createElement('div');

    // Set the HTML content with the given value
    tempDivElement.innerHTML = html;

    // Retrieve the text property of the element
    return tempDivElement.textContent || tempDivElement.innerText || '';
  }

  synthesiseHtml(requestObject: SynthRequestObject): Promise<any> {
    requestObject.input = this.convertToPlain(requestObject.input);
    return this.synthesiseText(requestObject);
  }

  synthesiseText(requestObject: SynthRequestObject): Promise<any> {

    return new Promise(async (resolve, reject) => {
      let url = 'https://www.abair.tcd.ie/api2/synthesise?input=';

      if ( requestObject.input) {
        url = url + encodeURIComponent(requestObject.input);
      } else {
        reject('input required');
      }

      if ( requestObject.voice && abairAPIv2Voices.includes(requestObject.voice.toString()) ) {
        url = url + '&voice=' + encodeURIComponent(requestObject.voice);
      }

      if (requestObject.speed) {
        url = url + '&speed=' + encodeURIComponent(requestObject.speed);
      }
      if (requestObject.audioEncoding) {
        url = url + '&audioEncoding=' + encodeURIComponent(requestObject.audioEncoding);
      }

      this.http.get(url, {
        observe: 'body'
      }).subscribe(
      (obj: { audioContent: string }) => {
        const type = 'audio/' + requestObject.audioEncoding.toString().toLowerCase();
        const audioURI = 'data:' + type + ';base64,' + obj.audioContent;
        return resolve(audioURI);
      },
      (err) => {
        reject(err);
      });
    });
  }

  /**
   * Gets synthesis data for storyObject from
   * the backend, which comes in the form of HTML data.
   * Then parses that HTML data to populate Paragraph
   * and Sentence objects.
   *
   * @param storyObject - Story to be synthesised
   * @returns - Paragraph and Sentence objects containing data for
   * synthesis of input story.
   */
  async synthesiseStory(storyObject: Story): Promise<[Paragraph[], Sentence[]]> {
    const synthesisResponse =
      await this.http.post(
        this.baseUrl + 'story/synthesiseObject/',
        {story: storyObject},
      ).toPromise() as SynthesisResponse;

    console.dir(synthesisResponse);

    const sentences: Sentence[] = [];
    const paragraphs: Paragraph[] = [];
    synthesisResponse.html.forEach((sentenceHtmlArray, i) => {
      const paragraphSentences: Sentence[] = [];
      for (const sentenceHtml of sentenceHtmlArray) {
        // sentenceSpan contains a span child for each word in the sentence
        const sentenceSpan = this.textToElem(sentenceHtml) as HTMLSpanElement;
        const startTime = +sentenceSpan.children[0].getAttribute('data-begin');
        const lastSentenceChild =
          sentenceSpan.children[sentenceSpan.childElementCount - 1]
        const duration = (+lastSentenceChild.getAttribute('data-begin') + +lastSentenceChild.getAttribute('data-dur')) - startTime;
        const audio = new Audio(synthesisResponse.audio[i]);

        let spans = Array.from(sentenceSpan.children) as HTMLSpanElement[];
        spans.forEach(span => span.classList.add('highlightable'));

        const sentence = new Sentence(audio, spans, startTime, duration);
        sentences.push(sentence);
        paragraphSentences.push(sentence);
      }
      const audio = new Audio(synthesisResponse.audio[i]);
      const spans = paragraphSentences.reduce((acc, sentence) => acc.concat(sentence.spans), []);
      const lastParagraphSentence = paragraphSentences[paragraphSentences.length - 1];
      const duration = lastParagraphSentence.startTime + lastParagraphSentence.duration;
      const paragraph = new Paragraph(audio, spans, duration);
      paragraphs.push(paragraph);
    });
    this.engagement.addEventForLoggedInUser(EventType['SYNTHESISE-STORY'], storyObject);
    return [paragraphs, sentences];
  }

  /**
   * Converts a string of HTML code into a DOM Node object.
   * 
   * @param htmlString - String representation of a HTML object
   * @returns - A DOM Node representing htmlString
   */
  textToElem(htmlString: string): Node {
    var div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstChild; 
  } 
}

/**
 * Data structure to package / interact with synthesis data.
 * Contains synthesis audio, and synthesised words in
 * <span>s containing meta-data relevant to the synthesis
 * of that word, such as start time and duration.
 * 
 * Also provides functions to play, pause, and highlight
 * text in time with synthesis playback.
 */
export abstract class Section {

  audio: HTMLAudioElement;
  highlightTimeouts: NodeJS.Timer[] = [];
  pauseTimeout: NodeJS.Timer;
  spans: HTMLSpanElement[];
  startTime: number;
  duration: number;

  constructor(audio: HTMLAudioElement,  spans: HTMLSpanElement[], startTime: number, duration: number) {
    this.audio = audio;
    this.spans = spans;
    this.startTime = startTime;
    this.duration = duration;
  }

  /**
   * Play the synthesis audio for this section
   */
  play() {
    this.audio.currentTime = this.startTime;
    this.audio.play();
    this.pauseTimeout = setTimeout(() => {
      this.stop();
    }, this.duration * 1000);
  }

  /**
   * Stop any synthesis audio that is playing for this section
   */
  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    clearTimeout(this.pauseTimeout);
  }

  /**
   * Highlight each word in this section in time with
   * its synthesis audio.
   */
  highlight() {
    let previousSpan: HTMLSpanElement;
    for (const s of this.spans) {
      // Each span will be highlighted halfway through its playback.
      // Each span is un-highlighted when the next span in the sequence
      //  is highlighted.
      this.highlightTimeouts.push(setTimeout(() => {
        if (previousSpan) previousSpan.classList.add("noHighlight");
        s.classList.add("highlight");
        previousSpan = s;
      }, ((+s.getAttribute("data-begin") * 1000)) + ((+s.getAttribute("data-dur") / 2) * 1000) - (this.startTime * 1000)));
    }
    this.highlightTimeouts.push(setTimeout(() => {
      this.removeHighlight();
    }, this.duration * 1000));
  }

  /**
   * Stop highlighting this section
   */
  removeHighlight() {
    for (const s of this.spans) {
      s.classList.remove("highlight");
      s.classList.remove("noHighlight");
    }
    this.highlightTimeouts.forEach(t => clearTimeout(t));
  }
}

export class Paragraph extends Section {
  constructor(audio: HTMLAudioElement,  spans: HTMLSpanElement[], duration: number) {
    super(audio, spans, 0, duration);
  }
}

export class Sentence extends Section { }

interface SynthesisResponse {
  audio: string[];
  html: Array<string[]>
}
