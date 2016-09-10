import { AsyncSubscriber } from './AsyncSubscriber';
import { TeardownLogic } from 'rxjs/Subscription';

export interface AsyncOperator<T, R> {
  call(subscriber: AsyncSubscriber<R>, source: any): TeardownLogic;
}
