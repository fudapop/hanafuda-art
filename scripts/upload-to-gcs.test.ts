import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { contentTypeFor, isImage, multipartUploadBody, objectKey } from './upload-to-gcs-lib.ts'

describe('contentTypeFor', () => {
  it('maps jpeg extensions to image/jpeg', () => {
    assert.equal(contentTypeFor('card.jpg'), 'image/jpeg')
    assert.equal(contentTypeFor('card.JPEG'), 'image/jpeg')
  })

  it('maps the other supported image types', () => {
    assert.equal(contentTypeFor('a.png'), 'image/png')
    assert.equal(contentTypeFor('a.gif'), 'image/gif')
    assert.equal(contentTypeFor('a.webp'), 'image/webp')
    assert.equal(contentTypeFor('a.avif'), 'image/avif')
  })

  it('rejects audio and unknown extensions', () => {
    assert.equal(contentTypeFor('theme.ogg'), null)
    assert.equal(contentTypeFor('notes.txt'), null)
    assert.equal(isImage('theme.mp3'), false)
    assert.equal(isImage('Card.WEBP'), true)
  })
})

describe('objectKey', () => {
  it('joins a prefix and a file name without a leading slash', () => {
    assert.equal(objectKey('cards/cherry-version', 'matsu-1.webp'), 'cards/cherry-version/matsu-1.webp')
    assert.equal(objectKey('/avatars/', 'flat-crane.webp'), 'avatars/flat-crane.webp')
    assert.equal(objectKey('', 'logo.webp'), 'logo.webp')
  })

  it('rejects a path instead of a file name', () => {
    assert.throws(() => objectKey('cards', 'nested/matsu-1.webp'), /file name/)
  })
})

describe('multipartUploadBody', () => {
  it('wraps the bytes with the object metadata', () => {
    const bytes = new TextEncoder().encode('image-bytes')
    const body = new TextDecoder().decode(
      multipartUploadBody(
        bytes,
        {
          name: 'cards/cherry-version/matsu-1.webp',
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000',
        },
        'boundary',
      ),
    )
    assert.match(body, /"name":"cards\/cherry-version\/matsu-1.webp"/)
    assert.match(body, /"cacheControl":"public, max-age=31536000"/)
    assert.match(body, /image-bytes/)
    assert.ok(body.endsWith('--boundary--\r\n'))
  })
})
