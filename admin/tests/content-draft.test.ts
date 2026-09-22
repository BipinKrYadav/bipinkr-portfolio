import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { loadSnapshot } from '../../lib/snapshot/load';

import { validateDocumentDraft } from '../lib/content/draft';

const snapshot = loadSnapshot();
const homepage = snapshot.documents.homepage.content;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function replaceFirstMetricToken(value: unknown): boolean {
  if (typeof value === 'string') return value.includes('{{metric:');
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (typeof value[index] === 'string' && value[index].includes('{{metric:')) {
        value[index] = value[index].replace(/\{\{metric:[^|}]+/, '{{metric:site.accounts');
        return true;
      }
      if (replaceFirstMetricToken(value[index])) return true;
    }
    return false;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (typeof item === 'string' && item.includes('{{metric:')) {
        (value as Record<string, unknown>)[key] = item.replace(/\{\{metric:[^|}]+/, '{{metric:site.accounts');
        return true;
      }
      if (replaceFirstMetricToken(item)) return true;
    }
  }
  return false;
}

describe('document draft validation', () => {
  test('accepts the published baseline content for every document', () => {
    const documents = [
      ['proof_strip', snapshot.documents.proofStrip],
      ['homepage', snapshot.documents.homepage],
      ['about', snapshot.documents.about],
      ['services', snapshot.documents.services],
      ['contact', snapshot.documents.contact],
      ['case_study_index', snapshot.documents.caseStudyIndex],
      ...Object.values(snapshot.documents.caseStudies).map((document) => ['case_study', document] as const),
    ] as const;

    for (const [type, document] of documents) {
      const result = validateDocumentDraft(type, document.slug, document.content, document.content);
      assert.equal(result.ok, true, type + '/' + document.slug);
    }
  });

  test('rejects a schema-breaking draft', () => {
    const draft = clone(homepage) as Record<string, unknown>;
    delete (draft.hero as Record<string, unknown>).h1;
    const result = validateDocumentDraft('homepage', 'home', draft, homepage);
    assert.equal(result.ok, false);
    assert.match(result.ok ? '' : result.message, /published document schema/i);
  });

  test('rejects a metric-token change even when the resulting token is valid', () => {
    const draft = clone(homepage);
    assert.equal(replaceFirstMetricToken(draft), true);
    const result = validateDocumentDraft('homepage', 'home', draft, homepage);
    assert.equal(result.ok, false);
    assert.match(result.ok ? '' : result.message, /references cannot be changed/i);
  });

  test('rejects a client-label token change', () => {
    const draft = clone(homepage);
    let changed = false;
    const walk = (value: unknown) => {
      if (typeof value === 'string' && value.includes('{{label:')) return value.replace(/\{\{label:[^|]+\|/, '{{label:Changed|');
      if (Array.isArray(value)) return value.map((item) => walk(item));
      if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, walk(item)]));
      }
      return value;
    };
    const replace = (value: unknown): unknown => {
      if (typeof value === 'string') {
        if (!changed && value.includes('{{label:')) {
          changed = true;
          return value.replace(/\{\{label:[^|]+\|/, '{{label:Changed|');
        }
        return value;
      }
      if (Array.isArray(value)) return value.map(replace);
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, replace(item)]));
      return value;
    };
    void walk;
    const changedDraft = replace(draft);
    assert.equal(changed, true);
    const result = validateDocumentDraft('homepage', 'home', changedDraft, homepage);
    assert.equal(result.ok, false);
  });
});
