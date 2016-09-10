import { $$rxSubscriber } from 'rxjs/symbol/rxSubscriber';

import { AsyncPartialObserver } from '../AsyncObserver';
import { AsyncSubscriber } from '../AsyncSubscriber';

export function toAsyncSubscriber<T>(
  nextOrObserver?: AsyncPartialObserver<T> | ((value: T) => void),
  error?: (error: any) => void,
  complete?: () => void): AsyncSubscriber<T> {

  if (nextOrObserver) {
    if (nextOrObserver instanceof AsyncSubscriber) {
      return (<AsyncSubscriber<T>> nextOrObserver);
    }

    if (nextOrObserver[$$rxSubscriber]) {
      return nextOrObserver[$$rxSubscriber]();
    }
  }

  if (!nextOrObserver && !error && !complete) {
    return new AsyncSubscriber();
  }

  return new AsyncSubscriber(nextOrObserver, error, complete);
}