export interface AsyncNextObserver<T> {
  closed?: boolean;
  next: (value: T) => Promise<void> | void;
  error?: (err: any) => void;
  complete?: () => void;
}

export interface AsyncErrorObserver<T> {
  closed?: boolean;
  next?: (value: T) => Promise<void> | void;
  error: (err: any) => void;
  complete?: () => void;
}

export interface AsyncCompletionObserver<T> {
  closed?: boolean;
  next?: (value: T) => Promise<void> | void;
  error?: (err: any) => void;
  complete: () => void;
}

export type AsyncPartialObserver<T> = AsyncNextObserver<T> | AsyncErrorObserver<T> | AsyncCompletionObserver<T>;

export interface AsyncObserver<T> {
  closed?: boolean;
  next: (value: T) => Promise<void> | void;
  error: (err: any) => void;
  complete: () => void;
}

export const empty: AsyncObserver<any> = {
  closed: true,
  next(value: any): void { /* noop */},
  error(err: any): void { throw err; },
  complete(): void { /*noop*/ }
};
