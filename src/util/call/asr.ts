import { EventEmitter } from '../sub';

const ASR = window.SpeechRecognition || window.webkitSpeechRecognition;

interface STTEngineEvents {
  speech: string;
  correction: string;
}

const CHAR_FILL_TARGET = 100;
const CHAR_SEND = 50;

export class STTEngine extends EventEmitter<STTEngineEvents> {
  private sr: SpeechRecognition;
  private started: boolean;
  constructor() {
    super();
    if (!ASR) throw new TypeError('speech recognition not supported');
    this.sr = new ASR();
    this.sr.interimResults = true;
    this.sr.continuous = true;
    this.started = false;
    let stripFront = '';
    this.sr.addEventListener('result', evt => {
      let readyMsg = '';
      let finalizedUpTo = 0;
      for (let i = 0; i < evt.results.length; ++i) {
        const result = evt.results.item(i);
        const alt = result.item(0);
        if (alt.confidence < 0.7 && !result.isFinal) break;
        readyMsg += alt.transcript + ' ';
        if (result.isFinal) {
          finalizedUpTo = readyMsg.length - stripFront.length;
        }
      }
      if (!readyMsg.startsWith(stripFront)) {
        for (let i = stripFront.length; i > 0; --i) {
          if (readyMsg[i] == ' ') {
            stripFront = readyMsg.slice(0, i);
            break;
          }
          this.emit('correction', readyMsg.slice(stripFront.length));
        }
      } else {
        readyMsg = readyMsg.slice(stripFront.length);
        let send = '';
        if (finalizedUpTo) {
          send = readyMsg.slice(0, finalizedUpTo);
          stripFront += send;
        } else if (readyMsg.length > CHAR_FILL_TARGET) {
          for (let i = CHAR_SEND; i > 0; --i) {
            if (readyMsg[i] == ' ') {
              send = readyMsg.slice(0, i);
              stripFront += send;
              break;
            }
          }
        }
        if (send) this.emit('speech', send);
      }
    });
    this.sr.addEventListener('end', () => {
      if (this.started) this.start();
    });
  }
  start() {
    if (!this.started) {
      this.started = true;
      this.sr.start();
    }
  }
  stop() {
    if (this.started) {
      this.started = false;
      this.sr.stop();
    }
  }
}