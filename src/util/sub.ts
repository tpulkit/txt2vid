export class Subscribable<T = void> {
  private subs = new Set<(evt: T) => unknown>();
  listen(sub: (evt: T) => unknown) {
    this.subs.add(sub);
    return sub;
  }
  unlisten(sub: (evt: T) => unknown) {
    this.subs['delete'](sub);
  }
  emit(evt: T) {
    for (const sub of this.subs) {
      sub(evt);
    }
  }
}

export abstract class EventEmitter<T> {
  private eeSubs: {
    [K in keyof T]?: Subscribable<T[K]>;
  } = {};
  on = this.listen;
  off = this.unlisten;
  listen<K extends keyof T>(evtName: K, sub: (evt: T[K]) => unknown) {
    return (this.eeSubs[evtName] ||= new Subscribable())!.listen(sub);
  }
  unlisten<K extends keyof T>(evtName: K, sub: (evt: T[K]) => unknown) {
    this.eeSubs[evtName]?.unlisten(sub);
  }
  protected emit<K extends keyof T>(evtName: K, evt: T[K]) {
    this.eeSubs[evtName]?.emit(evt);
  }
}
