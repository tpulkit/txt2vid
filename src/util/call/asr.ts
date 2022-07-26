import { EventEmitter } from '../sub';

const ASR = window.SpeechRecognition || window.webkitSpeechRecognition;

interface STTEngineEvents {
  speech: string;
  correction: string;
}

const CHAR_FILL_TARGET = 100;
const CHAR_SEND = 50;

export class STTEngine extends EventEmitter<STTEngineEvents> {
  private sr?: SpeechRecognition;
  get supported() {
    return !!this.sr;
  }
  private started: boolean;
  private preResults: SpeechRecognitionResult[];
  private latestResults: SpeechRecognitionResult[];
  constructor() {
    super();
    this.started = false;
    this.preResults = [];
    this.latestResults = [];
    if (!ASR) return;
    this.sr = new ASR();
    this.sr.interimResults = true;
    this.sr.continuous = true;
    let stripFront = '';
    this.sr.addEventListener('result', evt => {
      let readyMsg = '';
      let finalizedUpTo = 0;
      const results = this.latestResults = [...this.preResults, ...evt.results];
      for (const result of results) {
        const alt = result.item(0);
        if (alt.confidence < 0.7 && !result.isFinal) break;
        readyMsg += alt.transcript + ' ';
        if (result.isFinal) {
          finalizedUpTo = readyMsg.length - stripFront.length;
        }
      }
      if (!readyMsg.startsWith(stripFront)) {
        let simInd = 0;
        for (; simInd < Math.min(stripFront.length, readyMsg.length); ++simInd) {
          if (stripFront[simInd] !== readyMsg[simInd]) break;
        }
        stripFront = '';
        for (let i = simInd; i > 0; --i) {
          if (readyMsg[i] == ' ') {
            stripFront = readyMsg.slice(0, i);
            break;
          }
        }
        const final = readyMsg.slice(stripFront.length).trim();
        if (final) this.emit('correction', final);
      } else {
        readyMsg = readyMsg.slice(stripFront.length);
        let send = '';
        if (finalizedUpTo) {
          send = readyMsg.slice(0, finalizedUpTo);
        } else if (readyMsg.length > CHAR_FILL_TARGET) {
          for (let i = CHAR_SEND; i > 0; --i) {
            if (readyMsg[i] == ' ') {
              send = readyMsg.slice(0, i);
              break;
            }
          }
        }
        stripFront += send;
        const final = send.trim();
        if (final) this.emit('speech', final);
      }
    });
    this.sr.addEventListener('end', () => {
      this.preResults = this.latestResults.slice();
      if (this.started) this.sr!.start();
    });
  }
  start() {
    if (!this.started) {
      this.started = true;
      if (!this.sr) throw new TypeError('Speech recognition not supported');
      this.sr.start();
    }
  }
  stop() {
    if (this.started) {
      this.started = false;
      this.sr?.stop();
    }
  }
}