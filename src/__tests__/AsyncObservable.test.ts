import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import {AsyncObservable} from '../AsyncObservable';

chai.use(chaiAsPromised);

let expect = chai.expect;

describe("AsyncObservable", function () {

    it("should allow adding new tasks", function (done) {
        let obs = new AsyncObservable<number>(async function (subscriber: any) {
            await subscriber.next(1);
            await subscriber.next(2);
            await subscriber.next(3);
            subscriber.complete();
        });

        obs.subscribe(
            function (x) { console.log(x); return new Promise<void>((resolve, reject) => setTimeout(resolve, 100)); },
            undefined,
            done
        );
    });

});
