/*
 * vim: ts=4:sw=4:expandtab
 */

'use strict';

describe("AxolotlStore", function() {
    before(function(done) {
        storage.put('registrationId', 1337);
        storage.put('identityKey', identityKey);
        storage.fetch().then(done, done);
    });
    var store = textsecure.storage.axolotl;
    var identifier = '+5558675309';
    var identityKey = {
        pubKey: textsecure.crypto.getRandomBytes(33),
        privKey: textsecure.crypto.getRandomBytes(32),
    };
    var testKey = {
        pubKey: textsecure.crypto.getRandomBytes(33),
        privKey: textsecure.crypto.getRandomBytes(32),
    };
    it('retrieves my registration id', function(done) {
        store.getMyRegistrationId().then(function(reg) {
            assert.strictEqual(reg, 1337);
        }).then(done, done);
    });
    it('retrieves my identity key', function(done) {
        store.getMyIdentityKey().then(function(key) {
            assertEqualArrayBuffers(key.pubKey, identityKey.pubKey);
            assertEqualArrayBuffers(key.privKey, identityKey.privKey);
        }).then(done,done);
    });
    it('stores identity keys', function(done) {
        store.putIdentityKey(identifier, testKey.pubKey).then(function() {
            return store.getIdentityKey(identifier).then(function(key) {
                assertEqualArrayBuffers(key, testKey.pubKey);
            });
        }).then(done,done);
    });
    it('rejects on key change', function(done) {
        var newIdentity = textsecure.crypto.getRandomBytes(33);
        store.putIdentityKey(identifier, testKey.pubKey).then(function() {
            store.putIdentityKey(identifier, newIdentity).then(function() {
                done(new Error('Allowed to overwrite identity key'));
            }).catch(function(e) {
                assert(e instanceof Error);
                done();
            });
        });
    });
    it('stores prekeys', function(done) {
        store.putPreKey(1, testKey).then(function() {
            return store.getPreKey(1).then(function(key) {
                assertEqualArrayBuffers(key.pubKey, testKey.pubKey);
                assertEqualArrayBuffers(key.privKey, testKey.privKey);
            });
        }).then(done,done);
    });
    it('deletes prekeys', function(done) {
        before(function(done) {
            store.putPreKey(2, testKey).then(done);
        });
        store.removePreKey(2, testKey).then(function() {
            return store.getPreKey(2).then(function(key) {
                assert.isUndefined(key);
            });
        }).then(done,done);
    });
    it('stores signed prekeys', function(done) {
        store.putSignedPreKey(3, testKey).then(function() {
            return store.getSignedPreKey(3).then(function(key) {
                assertEqualArrayBuffers(key.pubKey, testKey.pubKey);
                assertEqualArrayBuffers(key.privKey, testKey.privKey);
            });
        }).then(done,done);
    });
    it('deletes signed prekeys', function(done) {
        before(function(done) {
            store.putSignedPreKey(4, testKey).then(done);
        });
        store.removeSignedPreKey(4, testKey).then(function() {
            return store.getSignedPreKey(4).then(function(key) {
                assert.isUndefined(key);
            });
        }).then(done,done);
    });
    it('stores sessions', function(done) {
        var testRecord = "an opaque string";
        store.putSession(identifier + '.1', testRecord).then(function() {
            return store.getSession(identifier + '.1').then(function(record) {
                assert.deepEqual(record, testRecord);
            });
        }).then(done,done);
    });
    it('removes all sessions for a number', function(done) {
        var testRecord = "an opaque string";
        var devices = [1, 2, 3].map(function(deviceId) {
            return [identifier, deviceId].join('.');
        });
        var promise = Promise.resolve();
        devices.forEach(function(encodedNumber) {
            promise = promise.then(function() {
                return store.putSession(encodedNumber, testRecord + encodedNumber)
            });
        });
        promise.then(function() {
            return store.removeAllSessions(identifier).then(function(record) {
                return Promise.all(devices.map(store.getSession.bind(store))).then(function(records) {
                    for (var i in records) {
                        assert.isUndefined(records[i]);
                    };
                });
            });
        }).then(done,done);
    });
    it ('clears the session store', function(done) {
        var testRecord = "an opaque string";
        store.putSession(identifier + '.1', testRecord).then(function() {
            return store.clearSessionStore().then(function() {
                return store.getSession(identifier + '.1').then(function(record) {
                    assert.isUndefined(record);
                });
            });
        }).then(done,done);

    });
    it('returns deviceIds for a number', function(done) {
        var testRecord = "an opaque string";
        var devices = [1, 2, 3].map(function(deviceId) {
            return [identifier, deviceId].join('.');
        });
        var promise = Promise.resolve();
        devices.forEach(function(encodedNumber) {
            promise = promise.then(function() {
                return store.putSession(encodedNumber, testRecord + encodedNumber)
            });
        });
        promise.then(function() {
            return store.getDeviceIds(identifier).then(function(deviceIds) {
                assert.sameMembers(deviceIds, [1, 2, 3]);
            });
        }).then(done,done);
    });
    it('returns empty array for a number with no device ids', function(done) {
        return store.getDeviceIds('foo').then(function(deviceIds) {
            assert.sameMembers(deviceIds,[]);
        }).then(done,done);
    });
});
