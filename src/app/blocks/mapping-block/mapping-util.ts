import { search } from './jmespath';
import uuid from 'uuid';
import {find, get, omit, pick, pickBy, zip} from 'lodash-es';
import {DateTime} from 'luxon';
import {parse as parseQueryString, stringify as asQueryString} from 'qs';
import stringify from 'json-stringify-safe';
import * as showdown from 'showdown';

// Type constants used to define functions.
const TYPE_NUMBER = 0;
const TYPE_ANY = 1;
const TYPE_STRING = 2;
const TYPE_ARRAY = 3;
const TYPE_OBJECT = 4;
const TYPE_BOOLEAN = 5;
const TYPE_EXPREF = 6;
const TYPE_NULL = 7;
const TYPE_ARRAY_NUMBER = 8;
const TYPE_ARRAY_STRING = 9;

export function mappingUtility(value, expr) {
  return search(value, expr, {
    functionTable: {
      uuid: {
        _func: uuid.v4,
        _signature: []
      },
      toLower: {
        _func: ([s]) => s.toLowerCase(),
        _signature: [{types: [TYPE_STRING]}]
      },
      replaceMe: { // TODO: its a bit restictive at the mo! 
        _func: ([s]) => s.replace('/videos/', ''),
        _signature: [{types: [TYPE_STRING]}]
      },
      trim: {
        _func: ([s]) => s.trim(),
        _signature: [{types: [TYPE_STRING]}]
      },
      formatDate: {
        _func: ([dateString, formatString]) => DateTime.fromISO(dateString).toFormat(formatString),
        _signature: [{types: [TYPE_STRING]}, {types: [TYPE_STRING]}]
      },
      omit: {
        _func: ([o, a]) => omit(o, ...a),
        _signature: [{types: [TYPE_OBJECT]}, {types: [TYPE_ARRAY_STRING]}]
      },
      pick: {
        _func: ([o, a]) => pick(o, ...a),
        _signature: [{types: [TYPE_OBJECT]}, {types: [TYPE_ARRAY_STRING]}]
      },
      split: {
        _func: ([o, s]) => o.split(s),
        _signature: [{types: [TYPE_STRING]}, {types: [TYPE_STRING]}]
      },
      find: {
        _func: ([o, k, v]) => find(o, o2 => o2[k] === v),
        _signature: [{types: [TYPE_ARRAY]}, {types: [TYPE_STRING]}, {types: [TYPE_ANY]}]
      },
      compact: {
        _func: ([o]) => pickBy(o),
        _signature: [{types: [TYPE_OBJECT]}]
      },
      qs: {
        _func: ([o]) => asQueryString(o),
        _signature: [{types: [TYPE_OBJECT]}]
      },
      parseQs: {
        _func: ([s]) => parseQueryString(s),
        _signature: [{types: [TYPE_STRING]}]
      },
      zip: {
        _func: ([a1, a2]) => zip(a1, a2),
        _signature: [{types: [TYPE_ARRAY]}, {types: [TYPE_ARRAY]}]
      },
      debug: {
        _func: ([v]) => {
          console.log('debug value in mapping', v);
          return v;
        },
        _signature: [{types: [TYPE_ANY]}]
      },
      json: {
        _func: ([v]) => stringify(v),
        _signature: [{types: [TYPE_ANY]}]
      },
      markdown: {
        _func: ([s]) => {
          showdown.setFlavor('github');
          const converter = new showdown.Converter();
          return converter.makeHtml(s);
        },
        _signature: [{types: [TYPE_STRING]}]
      },
      btoa: {
        _func: ([s]) => btoa(s),
        _signature: [{types: [TYPE_STRING]}]
      }
    }
  });
}