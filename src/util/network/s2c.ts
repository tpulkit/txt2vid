import Sendable from './sendable';

export default class WSConnection<E, M = E> extends Sendable<E, M> {
  constructor(path: string) {
    super(
      new WebSocket(
        `ws${location.protocol == 'https:' ? 's' : ''}://${location.host}${
          path[0] == '/'
            ? path
            : (location.pathname[location.pathname.length - 1] == '/'
                ? location.pathname
                : location.pathname.slice(
                    0,
                    location.pathname.lastIndexOf('/') + 1
                  )) + path
        }`
      )
    );
  }
}
