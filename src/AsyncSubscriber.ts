import { Subscriber } from 'rxjs/Subscriber';
import { isFunction } from 'rxjs/util/isFunction';
import { Subscription } from 'rxjs/Subscription';
import { empty as emptyObserver } from 'rxjs/Observer';
import { $$rxSubscriber } from 'rxjs/symbol/rxSubscriber';

import { AsyncObserver, AsyncPartialObserver } from './AsyncObserver';

/**
 * Implements the {@link Observer} interface and extends the
 * {@link Subscription} class. While the {@link Observer} is the public API for
 * consuming the values of an {@link Observable}, all Observers get converted to
 * a Subscriber, in order to provide Subscription-like capabilities such as
 * `unsubscribe`. Subscriber is a common type in RxJS, and crucial for
 * implementing operators, but it is rarely used as a public API.
 *
 * @class Subscriber<T>
 */
export class AsyncSubscriber<T> extends Subscriber<T> implements AsyncObserver<T> {

  /**
   * A static factory for a Subscriber, given a (potentially partial) definition
   * of an Observer.
   * @param {function(x: ?T): void} [next] The `next` callback of an Observer.
   * @param {function(e: ?any): void} [error] The `error` callback of an
   * Observer.
   * @param {function(): void} [complete] The `complete` callback of an
   * Observer.
   * @return {Subscriber<T>} A Subscriber wrapping the (partially defined)
   * Observer represented by the given arguments.
   */
  static create<T>(next?: (x?: T) => Promise<void>,
                   error?: (e?: any) => void,
                   complete?: () => void): AsyncSubscriber<T> {
    const subscriber = new AsyncSubscriber(next, error, complete);
    subscriber.syncErrorThrowable = false;
    return subscriber;
  }

  protected destination: AsyncPartialObserver<any>; // this `any` is the escape hatch to erase extra type param (e.g. R)

  /**
   * @param {Observer|function(value: T): void} [destinationOrNext] A partially
   * defined Observer or a `next` callback function.
   * @param {function(e: ?any): void} [error] The `error` callback of an
   * Observer.
   * @param {function(): void} [complete] The `complete` callback of an
   * Observer.
   */
  constructor(destinationOrNext?: AsyncPartialObserver<any> | ((value: T) => Promise<void> | void),
              error?: (e?: any) => void,
              complete?: () => void) {
    super();

    switch (arguments.length) {
      case 0:
        this.destination = emptyObserver;
        break;
      case 1:
        if (!destinationOrNext) {
          this.destination = emptyObserver;
          break;
        }
        if (typeof destinationOrNext === 'object') {
          if (destinationOrNext instanceof AsyncSubscriber) {
            this.destination = (<AsyncSubscriber<any>> destinationOrNext);
            (<any> this.destination).add(this);
          } else {
            this.syncErrorThrowable = true;
            this.destination = new AsyncSafeSubscriber<T>(this, <AsyncPartialObserver<any>> destinationOrNext);
          }
          break;
        }
      default:
        this.syncErrorThrowable = true;
        this.destination = new AsyncSafeSubscriber<T>(this, <((value: T) => Promise<void> | void)> destinationOrNext, error, complete);
        break;
    }
  }

  /**
   * The {@link Observer} callback to receive notifications of type `next` from
   * the Observable, with a value. The Observable may call this method 0 or more
   * times.
   * @param {T} [value] The `next` value.
   * @return {void}
   */
  next(value?: T): Promise<void> | void {
    if (!this.isStopped) {
      return this._next(value);
    }
  }

  protected _next(value: T): Promise<void> | void {
    return this.destination.next(value);
  }
}

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
class AsyncSafeSubscriber<T> extends AsyncSubscriber<T> {

  private _context: any;

  constructor(private _parent: AsyncSubscriber<T>,
              observerOrNext?: AsyncPartialObserver<T> | ((value: T) => Promise<void> | void),
              error?: (e?: any) => void,
              complete?: () => void) {
    super();

    let next: ((value: T) => Promise<void> | void);
    let context: any = this;

    if (isFunction(observerOrNext)) {
      next = (<((value: T) => Promise<void> | void)> observerOrNext);
    } else if (observerOrNext) {
      context = observerOrNext;
      next = (<AsyncPartialObserver<T>> observerOrNext).next;
      error = (<AsyncPartialObserver<T>> observerOrNext).error;
      complete = (<AsyncPartialObserver<T>> observerOrNext).complete;
      if (isFunction(context.unsubscribe)) {
        this.add(<() => void> context.unsubscribe.bind(context));
      }
      context.unsubscribe = this.unsubscribe.bind(this);
    }

    this._context = context;
    this._next = next;
    this._error = error;
    this._complete = complete;
  }

  next(value?: T): Promise<void> | void {
    if (!this.isStopped && this._next) {
      const { _parent } = this;
      if (!_parent.syncErrorThrowable) {
        return this.__tryOrUnsub(this._next, value);
      } else {
        let result = this.__tryOrSetError(_parent, this._next, value)
        if (result.syncError) {
          this.unsubscribe();
        } else {
          return result.callResult;
        }
      }
    }
  }

  private __tryOrUnsub(fn: Function, value?: any): Promise<void> {
    try {
      return fn.call(this._context, value);
    } catch (err) {
      this.unsubscribe();
      throw err;
    }
  }

  private __tryOrSetError(parent: AsyncSubscriber<T>, fn: Function, value?: any): { syncError: boolean, callResult?: Promise<void> } {
    try {
      return {
        syncError: false,
        callResult: Promise.resolve(fn.call(this._context, value))
      };
    } catch (err) {
      parent.syncErrorValue = err;
      parent.syncErrorThrown = true;
      return {
        syncError: true
      };
    }
  }
}
