/**
 *  Copyright (c) 2014-2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

import { KeyedIterable } from './Iterable'
import { KeyedCollection } from './Collection'
//import { Map, MapPrototype, emptyMap } from './Map'
import { DELETE } from './TrieUtils'

import invariant from './utils/invariant'


export class Record extends KeyedCollection {

  constructor(defaultValues, name) {
    var RecordType = function Record(values) {
      if (!(this instanceof RecordType)) {
        return new RecordType(values);
      }
      //this._map = Map(values);
      // _keys are in prototype
      this._values = new Array(this._keys.length);
      for(var index=0; index<this._keys.length; ++index) {
         var k = this._keys[index];
         this._values[index] = values[k] || this._defaultValues[k];
      }
    };

    var keys = Object.keys(defaultValues);

    var RecordTypePrototype = RecordType.prototype = Object.create(RecordPrototype);
    RecordTypePrototype.constructor = RecordType;
    name && (RecordTypePrototype._name = name);
    RecordTypePrototype._defaultValues = defaultValues;
    RecordTypePrototype._keys = keys;
    RecordTypePrototype.size = keys.length;

    try {
      keys.forEach(key => {
        Object.defineProperty(RecordType.prototype, key, {
          get: function() {
            return this.get(key);
          },
          set: function(value) {
            invariant(this.__ownerID, 'Cannot set on an immutable record.');
            this.set(key, value);
          }
        });
      });
    } catch (error) {
      // Object.defineProperty failed. Probably IE8.
    }

    return RecordType;
  }

  toString() {
    return this.__toString(recordName(this) + ' {', '}');
  }

  // @pragma Access

  has(k) {
    return this._defaultValues.hasOwnProperty(k);
  }

  get(k, notSetValue) {
    if (!this.has(k)) {
      return notSetValue;
    }
    var defaultVal = this._defaultValues[k];
    var index = this._keys.indexOf(k);
    return this._values ? (this._values[index] || defaultVal) : defaultVal;
  }

  // @pragma Modification

  clear() {
    if (this.__ownerID) {
      this._values && (this._values = new Array(this._keys.length));
      return this;
    }
    var Constructor = Object.getPrototypeOf(this).constructor;
    return new Constructor({}, recordName(this));
  }

  set(k, v) {
    if (!this.has(k)) {
      throw new Error('Cannot set unknown key "' + k + '" on ' + recordName(this));
    }
    var index = this._keys.indexOf(k);
    var newValues = this._values && this._values.slice();
    newValues[index] = v;
    if (this.__ownerID) {
      this._values = newValues;
      return this;
    }
    return makeRecord(this, newValues);
  }

  remove(k) {
    if (!this.has(k)) {
      return this;
    }
    var index = this._keys.indexOf(k);
    var newValues = this._values && this._values.slice();
    delete newValues[index];
    if (this.__ownerID) {
      this._values = newValues;
      return this;
    }
    return makeRecord(this, newValues);
  }

  wasAltered() {
    return false;
  }

  __iterator(type, reverse) {
    return KeyedIterable(this._defaultValues).map((_, k) => this.get(k)).__iterator(type, reverse);
  }

  __iterate(fn, reverse) {
    return KeyedIterable(this._defaultValues).map((_, k) => this.get(k)).__iterate(fn, reverse);
  }

  __ensureOwner(ownerID) {
    if (ownerID === this.__ownerID) {
      return this;
    }
    var newValues = this._values && this._values.slice();
    if (!ownerID) {
      this.__ownerID = ownerID;
      this._values = newValues;
      return this;
    }
    return makeRecord(this, newValues, ownerID);
  }
}

var RecordPrototype = Record.prototype;
RecordPrototype[DELETE] = RecordPrototype.remove;
//RecordPrototype.deleteIn =
//RecordPrototype.removeIn = MapPrototype.removeIn;
//RecordPrototype.merge = MapPrototype.merge;
//RecordPrototype.mergeWith = MapPrototype.mergeWith;
//RecordPrototype.mergeIn = MapPrototype.mergeIn;
//RecordPrototype.mergeDeep = MapPrototype.mergeDeep;
//RecordPrototype.mergeDeepWith = MapPrototype.mergeDeepWith;
//RecordPrototype.mergeDeepIn = MapPrototype.mergeDeepIn;
//RecordPrototype.setIn = MapPrototype.setIn;
//RecordPrototype.update = MapPrototype.update;
//RecordPrototype.updateIn = MapPrototype.updateIn;
//RecordPrototype.withMutations = MapPrototype.withMutations;
//RecordPrototype.asMutable = MapPrototype.asMutable;
//RecordPrototype.asImmutable = MapPrototype.asImmutable;


function makeRecord(likeRecord, values, ownerID) {
  var record = Object.create(Object.getPrototypeOf(likeRecord));
  record._values = values;
  record.__ownerID = ownerID;
  return record;
}

function recordName(record) {
  return record._name || record.constructor.name;
}

